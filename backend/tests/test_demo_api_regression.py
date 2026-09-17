import concurrent.futures
import time

import pytest


def _post_with_busy_retry(api_client, url, payload=None, retries=3):
    last = None
    for _ in range(retries):
        res = api_client.post(url, json=payload) if payload is not None else api_client.post(url)
        last = res
        if not (res.status_code == 409 and 'busy' in str(res.text).lower()):
            return res
        time.sleep(0.1)
    return last


# Catalog contract: reward assets, odds, reward bounds, and pod cosmetics
def test_catalog_contract(api_client, base_url):
    response = api_client.get(f'{base_url}/api/catalog')
    assert response.status_code == 200
    data = response.json()

    assert len(data['assets']) == 5
    assert len(data['pods']) == 6
    assert sum(asset['odds'] for asset in data['assets']) == 100

    assets = {a['symbol']: a for a in data['assets']}
    assert assets['NVDA']['min_reward'] == 15 and assets['NVDA']['max_reward'] == 250 and assets['NVDA']['odds'] == 25
    assert assets['GME']['min_reward'] == 10 and assets['GME']['max_reward'] == 180 and assets['GME']['odds'] == 20
    assert assets['GLD']['min_reward'] == 20 and assets['GLD']['max_reward'] == 300 and assets['GLD']['odds'] == 20
    assert assets['TSLA']['min_reward'] == 10 and assets['TSLA']['max_reward'] == 200 and assets['TSLA']['odds'] == 20
    assert assets['AAPL']['min_reward'] == 5 and assets['AAPL']['max_reward'] == 120 and assets['AAPL']['odds'] == 15


# Session creation, persistence, malformed/not-found handling
def test_demo_session_create_and_persist(api_client, base_url, create_session):
    session = create_session
    session_id = session['id']
    assert session['balance'] == 10000

    get_state = api_client.get(f'{base_url}/api/demo/{session_id}')
    assert get_state.status_code == 200
    persisted = get_state.json()
    assert persisted['id'] == session_id
    assert persisted['balance'] == 10000


def test_demo_session_not_found_and_malformed(api_client, base_url):
    missing = api_client.get(f'{base_url}/api/demo/does-not-exist')
    assert missing.status_code == 404
    assert 'not found' in missing.json()['detail'].lower()

    malformed = api_client.get(f'{base_url}/api/demo/%20%20%20')
    assert malformed.status_code in [404, 422]


# Start incubation validations, timer, and duplicate prevention
def test_start_deducts_balance_and_sets_timer(api_client, base_url, create_session):
    session_id = create_session['id']
    before = api_client.get(f'{base_url}/api/demo/{session_id}').json()
    start = api_client.post(f'{base_url}/api/demo/{session_id}/start', json={'pod_id': 'core-01', 'amount': 100})
    assert start.status_code == 200
    data = start.json()

    assert data['balance'] == before['balance'] - 100
    run = data['runs'][0]
    assert run['pod_id'] == 'core-01'
    assert run['status'] == 'incubating'
    assert run['completes_at'] - run['started_at'] == pytest.approx(7200, abs=4)


@pytest.mark.parametrize('amount', [0, -1, 1.5, 100001])
def test_start_rejects_invalid_stakes(api_client, base_url, create_session, amount):
    session_id = create_session['id']
    response = api_client.post(f'{base_url}/api/demo/{session_id}/start', json={'pod_id': 'core-01', 'amount': amount})
    assert response.status_code in [400, 422]


def test_start_rejects_insufficient_balance(api_client, base_url, create_session):
    session_id = create_session['id']
    response = api_client.post(f'{base_url}/api/demo/{session_id}/start', json={'pod_id': 'core-01', 'amount': 10001})
    assert response.status_code == 400
    assert 'not enough inc' in response.json()['detail'].lower()


def test_duplicate_running_pod_rejected(api_client, base_url, create_session):
    session_id = create_session['id']
    first = api_client.post(f'{base_url}/api/demo/{session_id}/start', json={'pod_id': 'core-01', 'amount': 100})
    assert first.status_code == 200

    second = api_client.post(f'{base_url}/api/demo/{session_id}/start', json={'pod_id': 'core-01', 'amount': 100})
    assert second.status_code == 409


def test_claim_before_ready_rejected(api_client, base_url, create_session):
    session_id = create_session['id']
    started = api_client.post(f'{base_url}/api/demo/{session_id}/start', json={'pod_id': 'core-01', 'amount': 100}).json()
    run_id = started['runs'][0]['id']

    claim = api_client.post(f'{base_url}/api/demo/{session_id}/claim/{run_id}')
    assert claim.status_code == 409


# Fast-forward settlement and anti-duplication behavior
def test_fast_forward_settles_exactly_once_and_prevents_duplicate_credits(api_client, base_url, create_session):
    session_id = create_session['id']
    start = api_client.post(f'{base_url}/api/demo/{session_id}/start', json={'pod_id': 'core-01', 'amount': 100})
    assert start.status_code == 200

    ff1 = api_client.post(f'{base_url}/api/demo/{session_id}/fast-forward')
    assert ff1.status_code == 200
    settled = ff1.json()
    run = settled['runs'][0]

    assert run['status'] == 'ready'
    assert run['returned'] == pytest.approx(75)
    assert run['burned'] == pytest.approx(25)
    assets = api_client.get(f'{base_url}/api/catalog').json()['assets']
    asset = next(a for a in assets if a['symbol'] == run['reward']['symbol'])
    assert asset['min_reward'] <= run['reward']['amount'] <= asset['max_reward']
    assert run['reward']['quantity'] > 0

    balance_after_ff1 = settled['balance']
    returned_after_ff1 = settled['total_returned']
    burned_after_ff1 = settled['total_burned']

    ff2 = api_client.post(f'{base_url}/api/demo/{session_id}/fast-forward')
    assert ff2.status_code == 200
    settled_again = ff2.json()

    assert settled_again['balance'] == balance_after_ff1
    assert settled_again['total_returned'] == returned_after_ff1
    assert settled_again['total_burned'] == burned_after_ff1


def test_claim_once_only_and_no_duplicate_on_repeat(api_client, base_url, create_session):
    session_id = create_session['id']
    started = api_client.post(f'{base_url}/api/demo/{session_id}/start', json={'pod_id': 'core-01', 'amount': 100}).json()
    run_id = started['runs'][0]['id']

    api_client.post(f'{base_url}/api/demo/{session_id}/fast-forward')
    claim_1 = api_client.post(f'{base_url}/api/demo/{session_id}/claim/{run_id}')
    assert claim_1.status_code == 200
    claimed_state = claim_1.json()
    assert claimed_state['runs'][0]['status'] == 'claimed'

    claim_2 = api_client.post(f'{base_url}/api/demo/{session_id}/claim/{run_id}')
    assert claim_2.status_code == 409


# Concurrency safety: starts and claims should not double-spend/double-credit
def test_concurrent_same_pod_start_only_one_charge(api_client, base_url, create_session):
    session_id = create_session['id']
    url = f'{base_url}/api/demo/{session_id}/start'
    payload = {'pod_id': 'core-01', 'amount': 100}

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
        futures = [ex.submit(_post_with_busy_retry, api_client, url, payload) for _ in range(2)]
        responses = [f.result() for f in futures]

    statuses = sorted([r.status_code for r in responses])
    assert statuses[0] == 200
    assert statuses[1] in [409]

    state = api_client.get(f'{base_url}/api/demo/{session_id}').json()
    incubating_core = [r for r in state['runs'] if r['pod_id'] == 'core-01' and r['status'] == 'incubating']
    assert len(incubating_core) == 1
    assert state['balance'] == 9900


def test_concurrent_claims_no_duplicate_credit(api_client, base_url, create_session):
    session_id = create_session['id']
    started = api_client.post(f'{base_url}/api/demo/{session_id}/start', json={'pod_id': 'core-01', 'amount': 100}).json()
    run_id = started['runs'][0]['id']
    api_client.post(f'{base_url}/api/demo/{session_id}/fast-forward')

    url = f'{base_url}/api/demo/{session_id}/claim/{run_id}'
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
        futures = [ex.submit(_post_with_busy_retry, api_client, url, None) for _ in range(2)]
        responses = [f.result() for f in futures]

    statuses = sorted([r.status_code for r in responses])
    assert statuses[0] == 200
    assert statuses[1] in [409]

    state = api_client.get(f'{base_url}/api/demo/{session_id}').json()
    run = next(r for r in state['runs'] if r['id'] == run_id)
    assert run['status'] == 'claimed'


# Natural expiry behavior via direct DB time travel in workspace
def test_natural_expiry_settles_on_get_and_preserves_75_25(api_client, base_url, create_session, mongo_collection):
    session_id = create_session['id']
    api_client.post(f'{base_url}/api/demo/{session_id}/start', json={'pod_id': 'core-01', 'amount': 123})

    mongo_collection.update_one({'id': session_id}, {'$set': {'runs.0.completes_at': time.time() - 1}})
    settled = api_client.get(f'{base_url}/api/demo/{session_id}')
    assert settled.status_code == 200
    state = settled.json()
    run = state['runs'][0]

    assert run['status'] == 'ready'
    assert run['returned'] == pytest.approx(92.25)
    assert run['burned'] == pytest.approx(30.75)
    assert state['balance'] == pytest.approx(9969.25)

    reload_state = api_client.get(f'{base_url}/api/demo/{session_id}').json()
    reloaded_run = reload_state['runs'][0]
    assert reloaded_run['status'] == 'ready'
    assert reloaded_run['returned'] == pytest.approx(92.25)


# Settings, top-up, reset, and max integer stake handling
def test_settings_changes_default_only_for_future_runs(api_client, base_url, create_session):
    session_id = create_session['id']
    started = api_client.post(f'{base_url}/api/demo/{session_id}/start', json={'pod_id': 'core-01', 'amount': 100})
    assert started.status_code == 200

    settings = api_client.patch(f'{base_url}/api/demo/{session_id}/settings', json={'cost': 250})
    assert settings.status_code == 200
    data = settings.json()

    assert data['cost'] == 250
    running = next(r for r in data['runs'] if r['pod_id'] == 'core-01')
    assert running['amount'] == 100


def test_top_up_adds_10000(api_client, base_url, create_session):
    session_id = create_session['id']
    before = api_client.get(f'{base_url}/api/demo/{session_id}').json()['balance']
    topped = api_client.post(f'{base_url}/api/demo/{session_id}/top-up')
    assert topped.status_code == 200
    assert topped.json()['balance'] == before + 10000


def test_reset_clears_runs_events_and_restores_balance(api_client, base_url, create_session):
    session_id = create_session['id']
    api_client.post(f'{base_url}/api/demo/{session_id}/start', json={'pod_id': 'core-01', 'amount': 100})
    api_client.post(f'{base_url}/api/demo/{session_id}/fast-forward')
    run_id = api_client.get(f'{base_url}/api/demo/{session_id}').json()['runs'][0]['id']
    api_client.post(f'{base_url}/api/demo/{session_id}/claim/{run_id}')

    reset = api_client.post(f'{base_url}/api/demo/{session_id}/reset')
    assert reset.status_code == 200
    data = reset.json()

    assert data['balance'] == 10000
    assert data['runs'] == []
    assert data['events'] == []
    assert data['total_burned'] == 0
    assert data['total_returned'] == 0


def test_max_integer_stake_accepted_with_sufficient_balance(api_client, base_url, create_session):
    session_id = create_session['id']
    for _ in range(10):
        top_up = api_client.post(f'{base_url}/api/demo/{session_id}/top-up')
        assert top_up.status_code == 200

    started = api_client.post(f'{base_url}/api/demo/{session_id}/start', json={'pod_id': 'core-01', 'amount': 100000})
    assert started.status_code == 200
    data = started.json()
    assert data['runs'][0]['amount'] == 100000

    settled = api_client.post(f'{base_url}/api/demo/{session_id}/fast-forward')
    assert settled.status_code == 200
    run = settled.json()['runs'][0]
    assert run['returned'] == pytest.approx(75000)
    assert run['burned'] == pytest.approx(25000)