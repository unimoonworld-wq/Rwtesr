"""Persistent, isolated demo workspaces. No wallet, identity, or real assets."""
import secrets
import time
import uuid
from fastapi import HTTPException
from models import DemoState
from catalog import ASSETS, TIERS

random = secrets.SystemRandom()


def event(state, kind, message, amount=None, symbol=None):
    state['events'].insert(0, {'id': str(uuid.uuid4()), 'kind': kind,
        'message': message, 'timestamp': time.time(), 'amount': amount, 'symbol': symbol})
    state['events'] = state['events'][:250]


def settle(state):
    for run in state['runs']:
        if run['status'] != 'incubating' or run['completes_at'] > time.time():
            continue
        asset = random.choices(ASSETS, weights=[a['odds'] for a in ASSETS], k=1)[0]
        tier = random.choices(TIERS, weights=[t['odds'] for t in TIERS], k=1)[0]
        amount = random.randint(tier['min_reward'] * 100, tier['max_reward'] * 100) / 100
        run.update(status='ready', returned=run['amount'] * .75, burned=run['amount'] * .25,
                   reward={'symbol': asset['symbol'], 'amount': amount,
                           'quantity': round(amount / asset['price'], 8), 'reference_price': asset['price'],
                           'tier': tier['id'], 'tier_odds': tier['odds'], 'tier_min': tier['min_reward'], 'tier_max': tier['max_reward']})
        state['balance'] += run['returned']
        state['total_returned'] += run['returned']
        state['total_burned'] += run['burned']
        event(state, 'ready', f"{run['pod_id'].upper()} incubation complete", amount, asset['symbol'])
        event(state, 'return', '75% INC returned to wallet balance', run['returned'], 'INC')
        event(state, 'burn', '25% INC permanently removed from supply', run['burned'], 'INC')


async def mutate(db, session_id, operation=None):
    # The whole sandbox is one document. Versioned replacements ensure that
    # concurrent starts, settlements, and claims cannot double-credit balances.
    for _ in range(20):
        state = await db.demo_workspaces.find_one({'id': session_id}, {'_id': 0})
        if state is None:
            raise HTTPException(404, 'Workspace not found')
        previous = state['version']
        settle(state)
        if operation:
            operation(state)
        state['version'] += 1
        validated = DemoState(**state)
        result = await db.demo_workspaces.replace_one(
            {'id': session_id, 'version': previous}, validated.model_dump())
        if result.modified_count:
            return validated
    raise HTTPException(409, 'Workspace is busy. Please try again.')