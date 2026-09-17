import asyncio
import logging
import time
import uuid
from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Response
from starlette.middleware.cors import CORSMiddleware
from database import client, db
from models import DemoState, StartRequest, SettingsRequest, Incubation
from catalog import ASSETS, PODS, TIERS
from engine import mutate, settle, event
from wallet_auth import router as auth_router, session_record, require_workspace, ORIGIN
from public_api import router as public_router, settle_due
from csrf import ProxyOriginAdapter


async def clock():
    while True:
        try:
            await settle_due()
        except Exception:
            logging.exception('Incubation settlement will retry')
        await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app):
    await db.demo_workspaces.create_index('id', unique=True)
    await db.demo_workspaces.create_index('wallet_address', unique=True, partialFilterExpression={'wallet_address': {'$type': 'string'}})
    await db.wallet_nonces.create_index('nonce', unique=True)
    await db.wallet_nonces.create_index('expires_at', expireAfterSeconds=0)
    await db.wallet_sessions.create_index('token_hash', unique=True)
    await db.wallet_sessions.create_index('expires_at', expireAfterSeconds=0)
    await db.shared_rewards.create_index('public_id', unique=True)
    await db.shared_rewards.create_index('run_id', unique=True)
    task = asyncio.create_task(clock())
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task
    client.close()


app = FastAPI(title='Inc.hood Protocol', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[ORIGIN], allow_credentials=True,
                   allow_methods=['GET', 'POST', 'PATCH', 'OPTIONS'], allow_headers=['Content-Type', 'X-Inc-CSRF'])
app.add_middleware(ProxyOriginAdapter)
api = APIRouter(prefix='/api')


@api.get('/')
async def health():
    return {'status': 'ok', 'name': 'Inc.hood', 'mode': 'demo', 'wallet_auth': 'siwe'}


@api.get('/catalog')
async def catalog():
    return {'assets': ASSETS, 'pods': PODS, 'tiers': TIERS, 'duration_seconds': 7200,
            'return_rate': .75, 'burn_rate': .25, 'mode': 'demo', 'network': 'Robinhood Chain'}


@api.post('/demo/sessions', response_model=DemoState)
async def create_demo(session=Depends(session_record)):
    # Legacy path now resolves the signed wallet; it cannot create anonymous funds.
    return await mutate(db, session['workspace_id'])


@api.get('/demo/{session_id}', response_model=DemoState)
async def get_demo(session_id: str, response: Response, session=Depends(require_workspace)):
    response.headers['Cache-Control'] = 'no-store'
    return await mutate(db, session_id)


@api.post('/demo/{session_id}/start', response_model=DemoState)
async def start(session_id: str, body: StartRequest, session=Depends(require_workspace)):
    if body.pod_id not in [p['id'] for p in PODS]:
        raise HTTPException(404, 'Pod not found')
    def operation(state):
        if any(r['pod_id'] == body.pod_id and r['status'] != 'claimed' for r in state['runs']):
            raise HTTPException(409, 'This pod has an active allocation. Claim the reward first.')
        if state['balance'] < body.amount:
            raise HTTPException(400, 'Not enough INC. Add INC from the balance panel.')
        if len(state['runs']) >= 200:
            raise HTTPException(400, 'Incubation history limit reached')
        state['balance'] -= body.amount
        run = Incubation(id=str(uuid.uuid4()), pod_id=body.pod_id, amount=body.amount,
                         started_at=time.time(), completes_at=time.time() + 7200)
        state['runs'].insert(0, run.model_dump())
        event(state, 'start', f'{body.pod_id.upper()} incubation started', body.amount, 'INC')
    return await mutate(db, session_id, operation)


@api.post('/demo/{session_id}/fast-forward', response_model=DemoState)
async def fast_forward(session_id: str, session=Depends(require_workspace)):
    def operation(state):
        for run in state['runs']:
            if run['status'] == 'incubating':
                run['completes_at'] = time.time() - 1
                run['fast_forwarded'] = True
        settle(state)
    return await mutate(db, session_id, operation)


@api.post('/demo/{session_id}/claim/{run_id}', response_model=DemoState)
async def claim(session_id: str, run_id: str, session=Depends(require_workspace)):
    def operation(state):
        run = next((r for r in state['runs'] if r['id'] == run_id), None)
        if not run:
            raise HTTPException(404, 'Incubation not found')
        if run['status'] != 'ready':
            raise HTTPException(409, 'Reward is not ready or has already been claimed')
        run.update(status='claimed', claimed_at=time.time())
        event(state, 'claim', f"{run['reward']['tier'].title()} {run['reward']['symbol']} reward claimed", run['reward']['amount'], run['reward']['symbol'])
    return await mutate(db, session_id, operation)


@api.patch('/demo/{session_id}/settings', response_model=DemoState)
async def settings(session_id: str, body: SettingsRequest, session=Depends(require_workspace)):
    return await mutate(db, session_id, lambda s: s.update(cost=body.cost))


@api.post('/demo/{session_id}/top-up', response_model=DemoState)
async def top_up(session_id: str, session=Depends(require_workspace)):
    def operation(state):
        if state['balance'] > 990000:
            raise HTTPException(400, 'Balance limit reached')
        state['balance'] += 10000
        event(state, 'deposit', 'INC added to wallet balance', 10000, 'INC')
    return await mutate(db, session_id, operation)


@api.post('/demo/{session_id}/reset')
async def reset(session_id: str, session=Depends(require_workspace)):
    raise HTTPException(403, 'Wallet allocations cannot be reset')


app.include_router(api)
app.include_router(auth_router)
app.include_router(public_router)