import os
import time
import uuid
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from models import DemoState, StartRequest, SettingsRequest, Incubation
from catalog import ASSETS, PODS
from engine import mutate, settle, event

load_dotenv(Path(__file__).parent / '.env')
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]


@asynccontextmanager
async def lifespan(app):
    await db.demo_workspaces.create_index('id', unique=True)
    yield
    client.close()


app = FastAPI(title='Inc.hood Demo Protocol', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.environ['CORS_ORIGINS'].split(','),
                   allow_methods=['*'], allow_headers=['*'])
api = APIRouter(prefix='/api')


@api.get('/')
async def health():
    return {'status': 'ok', 'name': 'Inc.hood', 'mode': 'demo'}


@api.get('/catalog')
async def catalog():
    return {'assets': ASSETS, 'pods': PODS, 'duration_seconds': 7200,
            'return_rate': .75, 'burn_rate': .25, 'mode': 'demo', 'network': 'Robinhood Chain'}


@api.post('/demo/sessions', response_model=DemoState)
async def create_demo():
    state = DemoState(id=str(uuid.uuid4()))
    await db.demo_workspaces.insert_one(state.model_dump())
    return state


@api.get('/demo/{session_id}', response_model=DemoState)
async def get_demo(session_id: str):
    return await mutate(db, session_id)


@api.post('/demo/{session_id}/start', response_model=DemoState)
async def start(session_id: str, body: StartRequest):
    if body.pod_id not in [p['id'] for p in PODS]:
        raise HTTPException(404, 'Pod not found')
    def operation(state):
        if any(r['pod_id'] == body.pod_id and r['status'] != 'claimed' for r in state['runs']):
            raise HTTPException(409, 'This pod already has an incubation. Claim its reward first.')
        if state['balance'] < body.amount:
            raise HTTPException(400, 'Not enough INC. Add demo funds from your balance panel.')
        if len(state['runs']) >= 200:
            raise HTTPException(400, 'Demo history is full. Reset your sandbox to continue.')
        state['balance'] -= body.amount
        run = Incubation(id=str(uuid.uuid4()), pod_id=body.pod_id, amount=body.amount,
                         started_at=time.time(), completes_at=time.time() + 7200)
        state['runs'].insert(0, run.model_dump())
        event(state, 'start', f'{body.pod_id.upper()} incubation started', body.amount, 'INC')
    return await mutate(db, session_id, operation)


@api.post('/demo/{session_id}/fast-forward', response_model=DemoState)
async def fast_forward(session_id: str):
    def operation(state):
        for run in state['runs']:
            if run['status'] == 'incubating':
                run['completes_at'] = time.time() - 1
                run['fast_forwarded'] = True
        settle(state)
    return await mutate(db, session_id, operation)


@api.post('/demo/{session_id}/claim/{run_id}', response_model=DemoState)
async def claim(session_id: str, run_id: str):
    def operation(state):
        run = next((r for r in state['runs'] if r['id'] == run_id), None)
        if not run:
            raise HTTPException(404, 'Incubation not found')
        if run['status'] != 'ready':
            raise HTTPException(409, 'Reward is not ready or has already been claimed')
        run.update(status='claimed', claimed_at=time.time())
        event(state, 'claim', f"{run['reward']['symbol']} reward claimed", run['reward']['amount'], run['reward']['symbol'])
    return await mutate(db, session_id, operation)


@api.patch('/demo/{session_id}/settings', response_model=DemoState)
async def settings(session_id: str, body: SettingsRequest):
    return await mutate(db, session_id, lambda s: s.update(cost=body.cost))


@api.post('/demo/{session_id}/top-up', response_model=DemoState)
async def top_up(session_id: str):
    def operation(state):
        if state['balance'] > 990000:
            raise HTTPException(400, 'Demo balance limit reached')
        state['balance'] += 10000
        event(state, 'deposit', 'Demo INC added', 10000, 'INC')
    return await mutate(db, session_id, operation)


@api.post('/demo/{session_id}/reset', response_model=DemoState)
async def reset(session_id: str):
    def operation(state):
        fresh = DemoState(id=session_id, version=state['version']).model_dump()
        state.update(fresh)
    return await mutate(db, session_id, operation)


app.include_router(api)