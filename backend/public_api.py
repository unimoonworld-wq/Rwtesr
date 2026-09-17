import time
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument
from database import db
from models import PublicProtocol, ProtocolStats, SharedReward
from wallet_auth import require_workspace
from catalog import ASSETS
from engine import mutate

router = APIRouter(prefix='/api')
WALLETS = {'wallet_address': {'$type': 'string'}}


async def settle_due():
    cursor = db.demo_workspaces.find({**WALLETS, 'runs': {'$elemMatch': {'status': 'incubating', 'completes_at': {'$lte': time.time()}}}}, {'_id': 0, 'id': 1}).limit(500)
    async for entry in cursor:
        try:
            await mutate(db, entry['id'])
        except HTTPException as error:
            if error.status_code != 409:
                raise


@router.get('/public/protocol', response_model=PublicProtocol)
async def public_protocol():
    await settle_due()
    active_runs = {'$filter': {'input': '$runs', 'as': 'r', 'cond': {'$eq': ['$$r.status', 'incubating']}}}
    completed_runs = {'$filter': {'input': '$runs', 'as': 'r', 'cond': {'$ne': ['$$r.status', 'incubating']}}}
    rows = await db.demo_workspaces.aggregate([
        {'$match': WALLETS},
        {'$project': {'_id': 0, 'burned': '$total_burned', 'returned': '$total_returned',
            'cycles': {'$size': '$runs'}, 'active': {'$size': active_runs}, 'completed': {'$size': completed_runs},
            'locked': {'$sum': {'$map': {'input': active_runs, 'as': 'r', 'in': '$$r.amount'}}},
            'rewards': {'$sum': {'$map': {'input': '$runs', 'as': 'r', 'in': {'$ifNull': ['$$r.reward.amount', 0]}}}}}},
        {'$group': {'_id': None, 'wallets': {'$sum': 1}, **{key: {'$sum': f'${key}'} for key in ['burned', 'returned', 'cycles', 'active', 'completed', 'locked', 'rewards']}}},
        {'$project': {'_id': 0}}
    ]).to_list(1)
    events = await db.demo_workspaces.aggregate([
        {'$match': WALLETS}, {'$unwind': '$events'},
        {'$match': {'events.kind': {'$in': ['start', 'claim', 'burn', 'return']}}},
        {'$sort': {'events.timestamp': -1}}, {'$limit': 30},
        {'$replaceRoot': {'newRoot': '$events'}}, {'$project': {'_id': 0}}
    ]).to_list(30)
    return PublicProtocol(stats=ProtocolStats(**(rows[0] if rows else {})), events=events)


@router.post('/demo/{session_id}/share/{run_id}', response_model=SharedReward)
async def publish_reward(session_id: str, run_id: str, session=Depends(require_workspace)):
    state = await mutate(db, session_id)
    run = next((r for r in state.runs if r.id == run_id), None)
    if not run or run.status != 'claimed':
        raise HTTPException(409, 'Only claimed rewards can be shared')
    asset = next(a for a in ASSETS if a['symbol'] == run.reward.symbol)
    record = SharedReward(public_id=uuid.uuid4().hex, run_id=run.id, symbol=run.reward.symbol,
        asset_name=asset['name'], tier=run.reward.tier, tier_odds=run.reward.tier_odds,
        amount=run.reward.amount, quantity=run.reward.quantity, inc_committed=run.amount,
        inc_returned=run.returned, inc_burned=run.burned, claimed_at=run.claimed_at,
        wallet_label=f"{session['address'][:6]}…{session['address'][-4:]}")
    doc = await db.shared_rewards.find_one_and_update({'run_id': run_id}, {'$setOnInsert': record.model_dump()}, projection={'_id': 0}, upsert=True, return_document=ReturnDocument.AFTER)
    return SharedReward(**doc)


@router.get('/public/rewards/{public_id}', response_model=SharedReward)
async def shared_reward(public_id: str):
    doc = await db.shared_rewards.find_one({'public_id': public_id}, {'_id': 0})
    if not doc:
        raise HTTPException(404, 'Reward card not found')
    return SharedReward(**doc)