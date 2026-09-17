"""Wallet auth + CSRF + protocol/share regression tests against public deployment."""

import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from eth_account import Account
from eth_account.messages import encode_defunct
from pymongo import MongoClient


load_dotenv(Path('/app/frontend/.env'))
load_dotenv(Path('/app/backend/.env'))


@pytest.fixture(scope='session')
def base_url():
    url = os.environ.get('REACT_APP_BACKEND_URL')
    if not url:
        pytest.fail('Missing REACT_APP_BACKEND_URL environment variable')
    return url.rstrip('/')


@pytest.fixture(scope='session')
def app_origin():
    origin = os.environ.get('APP_ORIGIN')
    if not origin:
        pytest.fail('Missing APP_ORIGIN environment variable')
    return origin.rstrip('/')


@pytest.fixture(scope='session')
def proxy_origin():
    return os.environ.get('APP_PROXY_ORIGIN', '').rstrip('/')


@pytest.fixture(scope='session')
def mongo_client():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    if not mongo_url or not db_name:
        pytest.fail('Missing MONGO_URL or DB_NAME environment variable')
    client = MongoClient(mongo_url)
    yield client
    client.close()


def _client():
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    return session


def _csrf(session, base_url):
    response = session.get(f'{base_url}/api/auth/csrf')
    assert response.status_code == 200, response.text
    token = response.json().get('csrfToken')
    assert isinstance(token, str) and len(token) > 60
    return token, response


def _mut_headers(session, base_url, origin, csrf_override=None, fetch_site='none'):
    csrf_token = csrf_override
    if csrf_token is None:
        csrf_token, _ = _csrf(session, base_url)
    return {'Origin': origin, 'X-Inc-CSRF': csrf_token, 'Sec-Fetch-Site': fetch_site}


def _challenge(session, base_url, app_origin, address, chain_id=1, **kwargs):
    headers = _mut_headers(session, base_url, app_origin, **kwargs)
    response = session.post(
        f'{base_url}/api/auth/challenge',
        json={'address': address, 'chain_id': chain_id},
        headers=headers,
    )
    return response


def _verify(session, base_url, app_origin, message, signature, **kwargs):
    headers = _mut_headers(session, base_url, app_origin, **kwargs)
    return session.post(
        f'{base_url}/api/auth/verify',
        json={'message': message, 'signature': signature},
        headers=headers,
    )


def _logout(session, base_url, app_origin, **kwargs):
    headers = _mut_headers(session, base_url, app_origin, **kwargs)
    return session.post(f'{base_url}/api/auth/logout', headers=headers)


def _wallet_auth(base_url, app_origin, account=None, chain_id=1):
    account = account or Account.create()
    session = _client()
    challenge = _challenge(session, base_url, app_origin, account.address, chain_id=chain_id)
    assert challenge.status_code == 200, challenge.text
    message = challenge.json()['message']
    signature = Account.sign_message(encode_defunct(text=message), private_key=account.key).signature.hex()
    verify = _verify(session, base_url, app_origin, message, signature)
    assert verify.status_code == 200, verify.text
    return session, account, verify.json(), message


def _post_private(session, base_url, app_origin, path, payload=None, method='post', fetch_site='none', csrf_override=None):
    headers = _mut_headers(session, base_url, app_origin, csrf_override=csrf_override, fetch_site=fetch_site)
    return session.request(method=method, url=f'{base_url}{path}', json=payload, headers=headers)


# Auth + cookie + CSRF contract
def test_csrf_issue_and_cookie_contract(base_url):
    session = _client()
    token, response = _csrf(session, base_url)
    set_cookie = response.headers.get('set-cookie', '')
    cookies = session.cookies.get_dict()

    assert '__Host-inc_browser' in cookies
    assert '__Host-inc_csrf' in cookies
    assert token == cookies['__Host-inc_csrf']
    assert '__Host-inc_browser=' in set_cookie
    assert '__Host-inc_csrf=' in set_cookie
    assert 'Secure' in set_cookie
    assert 'HttpOnly' in set_cookie


def test_missing_csrf_is_403_and_valid_preauth_csrf_yields_401_on_private_mutation(base_url, app_origin):
    session = _client()
    no_csrf = session.post(
        f'{base_url}/api/auth/challenge',
        json={'address': Account.create().address, 'chain_id': 1},
        headers={'Origin': app_origin, 'Sec-Fetch-Site': 'none'},
    )
    assert no_csrf.status_code == 403

    # With valid preauth CSRF, auth should progress to wallet-session check and return 401.
    valid_headers = _mut_headers(session, base_url, app_origin)
    private_without_wallet = session.post(
        f'{base_url}/api/demo/not-owned/start',
        json={'pod_id': 'core-01', 'amount': 100},
        headers=valid_headers,
    )
    assert private_without_wallet.status_code == 401


def test_csrf_mismatch_and_cross_site_blocked(base_url, app_origin):
    session = _client()
    _csrf(session, base_url)
    mismatch = session.post(
        f'{base_url}/api/auth/challenge',
        json={'address': Account.create().address, 'chain_id': 1},
        headers={'Origin': app_origin, 'X-Inc-CSRF': 'bad-token', 'Sec-Fetch-Site': 'none'},
    )
    assert mismatch.status_code == 403

    same_site = session.post(
        f'{base_url}/api/auth/challenge',
        json={'address': Account.create().address, 'chain_id': 1},
        headers=_mut_headers(session, base_url, app_origin, fetch_site='same-site'),
    )
    assert same_site.status_code == 403
    assert 'cross-site' in same_site.json()['detail'].lower()


def test_wallet_auth_happy_path_message_cookie_restore_logout(base_url, app_origin, proxy_origin):
    session, account, verified, message = _wallet_auth(base_url, app_origin)
    assert verified['authenticated'] is True
    assert verified['address'].lower() == account.address.lower()
    assert verified['chain_id'] == 1
    assert 'id' in verified['state']
    assert f'URI: {app_origin}' in message
    if proxy_origin:
        assert f'URI: {proxy_origin}' not in message

    me = session.get(f'{base_url}/api/auth/me')
    assert me.status_code == 200
    assert me.json()['state']['id'] == verified['state']['id']

    verify_cookie = session.cookies.get_dict()
    assert 'inc_wallet_session' in verify_cookie

    logout = _logout(session, base_url, app_origin)
    assert logout.status_code == 200

    after_logout = session.get(f'{base_url}/api/auth/me')
    assert after_logout.status_code == 401


def test_verify_cookie_attributes_are_secure_http_only_and_api_scoped(base_url, app_origin):
    account = Account.create()
    session = _client()
    challenge = _challenge(session, base_url, app_origin, account.address)
    assert challenge.status_code == 200
    message = challenge.json()['message']
    signature = Account.sign_message(encode_defunct(text=message), private_key=account.key).signature.hex()
    verify = _verify(session, base_url, app_origin, message, signature)
    assert verify.status_code == 200
    set_cookie = verify.headers.get('set-cookie', '')

    assert 'inc_wallet_session=' in set_cookie
    assert 'HttpOnly' in set_cookie
    assert 'Secure' in set_cookie
    assert 'SameSite=' in set_cookie
    assert 'Path=/api' in set_cookie


def test_verify_rejects_malformed_signature_payload(base_url, app_origin):
    account = Account.create()
    session = _client()
    challenge = _challenge(session, base_url, app_origin, account.address)
    assert challenge.status_code == 200
    message = challenge.json()['message']
    bad = _verify(session, base_url, app_origin, message, '0x1234')
    assert bad.status_code == 422


def test_verify_rejects_wrong_signer(base_url, app_origin):
    owner = Account.create()
    attacker = Account.create()
    session = _client()
    challenge = _challenge(session, base_url, app_origin, owner.address)
    assert challenge.status_code == 200
    message = challenge.json()['message']
    wrong_signature = Account.sign_message(encode_defunct(text=message), private_key=attacker.key).signature.hex()
    verify = _verify(session, base_url, app_origin, message, wrong_signature)
    assert verify.status_code == 401
    assert 'does not match' in verify.json()['detail'].lower()


def test_verify_rejects_altered_message_and_replay(base_url, app_origin):
    account = Account.create()
    session = _client()
    challenge = _challenge(session, base_url, app_origin, account.address)
    assert challenge.status_code == 200
    original = challenge.json()['message']

    altered = original.replace('Version: 1', 'Version: 9')
    altered_sig = Account.sign_message(encode_defunct(text=altered), private_key=account.key).signature.hex()
    altered_verify = _verify(session, base_url, app_origin, altered, altered_sig)
    assert altered_verify.status_code == 401

    valid_sig = Account.sign_message(encode_defunct(text=original), private_key=account.key).signature.hex()
    first = _verify(session, base_url, app_origin, original, valid_sig)
    assert first.status_code == 200
    replay = _verify(session, base_url, app_origin, original, valid_sig)
    assert replay.status_code == 401


def test_verify_rejects_expired_nonce(base_url, app_origin, mongo_client):
    account = Account.create()
    session = _client()
    challenge = _challenge(session, base_url, app_origin, account.address)
    assert challenge.status_code == 200
    message = challenge.json()['message']

    db = mongo_client[os.environ['DB_NAME']]
    db.wallet_nonces.update_one(
        {'message': message},
        {'$set': {'expires_at': datetime.now(timezone.utc) - timedelta(minutes=1)}},
    )

    signature = Account.sign_message(encode_defunct(text=message), private_key=account.key).signature.hex()
    verify = _verify(session, base_url, app_origin, message, signature)
    assert verify.status_code == 401


# Workspace authorization boundaries
def test_private_endpoints_require_auth_and_workspace_ownership(base_url, app_origin):
    session_a, _, state_a, _ = _wallet_auth(base_url, app_origin)
    session_b, _, state_b, _ = _wallet_auth(base_url, app_origin)
    id_a = state_a['state']['id']
    id_b = state_b['state']['id']

    started = _post_private(
        session_a,
        base_url,
        app_origin,
        f'/api/demo/{id_a}/start',
        payload={'pod_id': 'core-01', 'amount': 100},
    )
    assert started.status_code == 200

    cross_read = session_b.get(f'{base_url}/api/demo/{id_a}')
    assert cross_read.status_code == 403

    cross_write = _post_private(session_b, base_url, app_origin, f'/api/demo/{id_a}/top-up')
    assert cross_write.status_code == 403

    own_read = session_b.get(f'{base_url}/api/demo/{id_b}')
    assert own_read.status_code == 200
    assert own_read.json()['id'] == id_b


def test_legacy_private_mutations_are_protected(base_url, app_origin):
    anon = _client()
    protected = [
        ('post', '/api/demo/sessions', None),
        ('post', '/api/demo/unknown/start', {'pod_id': 'core-01', 'amount': 100}),
        ('post', '/api/demo/unknown/top-up', None),
        ('patch', '/api/demo/unknown/settings', {'cost': 125}),
        ('post', '/api/demo/unknown/fast-forward', None),
        ('post', '/api/demo/unknown/reset', None),
        ('post', '/api/demo/unknown/share/unknown-run', None),
        ('post', '/api/demo/unknown/claim/unknown-run', None),
    ]
    for method, path, payload in protected:
        response = anon.request(method, f'{base_url}{path}', json=payload, headers=_mut_headers(anon, base_url, app_origin))
        assert response.status_code == 401


def test_private_mutations_reject_missing_or_bad_csrf_even_when_authenticated(base_url, app_origin):
    session, _, verified, _ = _wallet_auth(base_url, app_origin)
    workspace_id = verified['state']['id']

    missing = session.post(
        f'{base_url}/api/demo/{workspace_id}/top-up',
        headers={'Origin': app_origin, 'Sec-Fetch-Site': 'none'},
    )
    assert missing.status_code == 403

    bad = session.post(
        f'{base_url}/api/demo/{workspace_id}/top-up',
        headers={'Origin': app_origin, 'Sec-Fetch-Site': 'none', 'X-Inc-CSRF': 'wrong'},
    )
    assert bad.status_code == 403


# Public protocol and settlement behavior
def test_natural_expiry_settles_once_with_exact_75_25(base_url, app_origin, mongo_client):
    session, _, verified, _ = _wallet_auth(base_url, app_origin)
    workspace_id = verified['state']['id']

    start = _post_private(
        session,
        base_url,
        app_origin,
        f'/api/demo/{workspace_id}/start',
        payload={'pod_id': 'prism-02', 'amount': 100},
    )
    assert start.status_code == 200
    run_id = start.json()['runs'][0]['id']

    db = mongo_client[os.environ['DB_NAME']]
    db.demo_workspaces.update_one({'id': workspace_id, 'runs.id': run_id}, {'$set': {'runs.$.completes_at': time.time() - 1}})

    settle_trigger = requests.get(f'{base_url}/api/public/protocol')
    assert settle_trigger.status_code == 200

    state_1 = session.get(f'{base_url}/api/demo/{workspace_id}')
    assert state_1.status_code == 200
    payload_1 = state_1.json()
    run = next(r for r in payload_1['runs'] if r['id'] == run_id)
    assert run['status'] == 'ready'
    assert run['returned'] == pytest.approx(75.0)
    assert run['burned'] == pytest.approx(25.0)

    returned_once = payload_1['total_returned']
    burned_once = payload_1['total_burned']
    assert returned_once >= 75.0
    assert burned_once >= 25.0

    state_2 = session.get(f'{base_url}/api/demo/{workspace_id}')
    assert state_2.status_code == 200
    payload_2 = state_2.json()
    assert payload_2['total_returned'] == pytest.approx(returned_once)
    assert payload_2['total_burned'] == pytest.approx(burned_once)


def test_public_protocol_visibility_and_no_private_leaks(base_url, app_origin):
    before = requests.get(f'{base_url}/api/public/protocol')
    assert before.status_code == 200
    before_stats = before.json()['stats']

    wallet_a, _, a_verified, _ = _wallet_auth(base_url, app_origin)
    wallet_b, _, b_verified, _ = _wallet_auth(base_url, app_origin)
    a_id = a_verified['state']['id']
    b_id = b_verified['state']['id']

    a_start = _post_private(wallet_a, base_url, app_origin, f'/api/demo/{a_id}/start', payload={'pod_id': 'core-01', 'amount': 100})
    b_start = _post_private(wallet_b, base_url, app_origin, f'/api/demo/{b_id}/start', payload={'pod_id': 'onyx-03', 'amount': 200})
    assert a_start.status_code == 200
    assert b_start.status_code == 200

    anon_public = requests.get(f'{base_url}/api/public/protocol')
    assert anon_public.status_code == 200
    anon_data = anon_public.json()

    auth_public = wallet_a.get(f'{base_url}/api/public/protocol')
    assert auth_public.status_code == 200
    assert auth_public.json()['stats'] == anon_data['stats']

    after_stats = anon_data['stats']
    assert after_stats['wallets'] >= before_stats['wallets']
    assert after_stats['cycles'] >= before_stats['cycles'] + 2

    payload_text = json.dumps(anon_data).lower()
    assert 'wallet_address' not in payload_text
    assert 'workspace_id' not in payload_text
    assert a_verified['address'].lower() not in payload_text
    assert b_verified['address'].lower() not in payload_text


# Tier contract + sharing contract
def test_tier_ranges_asset_odds_and_generated_rewards_bounds(base_url, app_origin):
    catalog = requests.get(f'{base_url}/api/catalog')
    assert catalog.status_code == 200
    payload = catalog.json()
    tiers = {t['id']: t for t in payload['tiers']}

    assert tiers['common']['odds'] == 60 and tiers['common']['min_reward'] == 1 and tiers['common']['max_reward'] == 10
    assert tiers['rare']['odds'] == 25 and tiers['rare']['min_reward'] == 10 and tiers['rare']['max_reward'] == 30
    assert tiers['epic']['odds'] == 11 and tiers['epic']['min_reward'] == 30 and tiers['epic']['max_reward'] == 100
    assert tiers['legendary']['odds'] == 4 and tiers['legendary']['min_reward'] == 100 and tiers['legendary']['max_reward'] == 500
    assert sum(t['odds'] for t in payload['tiers']) == 100
    assert [a['odds'] for a in payload['assets']] == [25, 20, 20, 20, 15]

    # Generate bounded rewards and verify each landed reward remains inside its own tier range.
    session, _, verified, _ = _wallet_auth(base_url, app_origin)
    workspace_id = verified['state']['id']
    seen = set()
    for _ in range(12):
        started = _post_private(
            session,
            base_url,
            app_origin,
            f'/api/demo/{workspace_id}/start',
            payload={'pod_id': 'core-04', 'amount': 100},
        )
        assert started.status_code == 200
        run_id = started.json()['runs'][0]['id']

        ff = _post_private(session, base_url, app_origin, f'/api/demo/{workspace_id}/fast-forward')
        assert ff.status_code == 200
        state = ff.json()
        run = next(r for r in state['runs'] if r['id'] == run_id)
        reward = run['reward']
        tier = tiers[reward['tier']]
        assert tier['min_reward'] <= reward['amount'] <= tier['max_reward']
        seen.add(reward['tier'])

        claim = _post_private(session, base_url, app_origin, f'/api/demo/{workspace_id}/claim/{run_id}')
        assert claim.status_code == 200

        if seen == {'common', 'rare', 'epic', 'legendary'}:
            break

    assert seen, 'No reward tiers observed during cycle generation'


def test_share_idempotent_owned_claimed_only_and_public_snapshot(base_url, app_origin):
    wallet_a, _, a_verified, _ = _wallet_auth(base_url, app_origin)
    wallet_b, _, _, _ = _wallet_auth(base_url, app_origin)
    workspace = a_verified['state']['id']

    started = _post_private(
        wallet_a,
        base_url,
        app_origin,
        f'/api/demo/{workspace}/start',
        payload={'pod_id': 'onyx-06', 'amount': 100},
    )
    assert started.status_code == 200
    run_id = started.json()['runs'][0]['id']

    unclaimed_share = _post_private(wallet_a, base_url, app_origin, f'/api/demo/{workspace}/share/{run_id}')
    assert unclaimed_share.status_code == 409

    ff = _post_private(wallet_a, base_url, app_origin, f'/api/demo/{workspace}/fast-forward')
    assert ff.status_code == 200
    claim = _post_private(wallet_a, base_url, app_origin, f'/api/demo/{workspace}/claim/{run_id}')
    assert claim.status_code == 200

    share_1 = _post_private(wallet_a, base_url, app_origin, f'/api/demo/{workspace}/share/{run_id}')
    share_2 = _post_private(wallet_a, base_url, app_origin, f'/api/demo/{workspace}/share/{run_id}')
    assert share_1.status_code == 200
    assert share_2.status_code == 200
    card_1 = share_1.json()
    card_2 = share_2.json()
    assert card_1['public_id'] == card_2['public_id']

    cross_wallet = _post_private(wallet_b, base_url, app_origin, f'/api/demo/{workspace}/share/{run_id}')
    cross_claim = _post_private(wallet_b, base_url, app_origin, f'/api/demo/{workspace}/claim/{run_id}')
    cross_start = _post_private(wallet_b, base_url, app_origin, f'/api/demo/{workspace}/start', payload={'pod_id': 'core-01', 'amount': 100})
    assert cross_wallet.status_code == 403
    assert cross_claim.status_code == 403
    assert cross_start.status_code == 403

    public_card = requests.get(f"{base_url}/api/public/rewards/{card_1['public_id']}")
    assert public_card.status_code == 200
    public_payload = public_card.json()
    assert public_payload['public_id'] == card_1['public_id']
    assert public_payload['wallet_label'].startswith('0x')
    assert '…' in public_payload['wallet_label']

    leak_text = json.dumps(public_payload).lower()
    assert 'balance' not in leak_text
    assert 'workspace' not in leak_text
    assert 'wallet_address' not in leak_text

    # Keep one share token for manual visual check in final QA.
    Path('/app/test_reports/iteration4_public_reward_id.txt').write_text(card_1['public_id'], encoding='utf-8')


def test_public_reward_not_found_message(base_url):
    missing = requests.get(f'{base_url}/api/public/rewards/not-a-real-public-id')
    assert missing.status_code == 404
    assert 'not found' in missing.json()['detail'].lower()
