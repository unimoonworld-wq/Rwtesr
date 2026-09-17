"""SIWE-shaped exact-message verification for EOA wallets; no chain transactions."""
import hashlib
import hmac
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from eth_account import Account
from eth_account.messages import encode_defunct
from eth_utils import is_address, to_checksum_address
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from pymongo import ReturnDocument
from database import db
from models import DemoState
from engine import mutate
from csrf import issue_csrf, require_csrf

ORIGIN = os.environ['APP_ORIGIN'].rstrip('/')
DOMAIN = os.environ['APP_DOMAIN']
SECRET = os.environ['SESSION_SECRET'].encode()
SECURE = os.environ['COOKIE_SECURE'].lower() == 'true'
assert urlparse(ORIGIN).netloc == DOMAIN, 'APP_DOMAIN must match APP_ORIGIN'
router = APIRouter(prefix='/api/auth')
now = lambda: datetime.now(timezone.utc)
stamp = lambda t: t.replace(microsecond=0).isoformat().replace('+00:00', 'Z')
digest = lambda s: hmac.new(SECRET, s.encode(), hashlib.sha256).hexdigest()


def check_origin(request: Request):
    if request.headers.get('origin') != ORIGIN:
        raise HTTPException(403, 'Request origin not allowed')
    require_csrf(request)


class ChallengeRequest(BaseModel):
    address: str = Field(min_length=42, max_length=42)
    chain_id: int = Field(ge=1, le=2**53 - 1)


class VerificationRequest(BaseModel):
    message: str = Field(max_length=2048)
    signature: str = Field(min_length=130, max_length=132)


class WalletSession(BaseModel):
    authenticated: bool = True
    address: str
    chain_id: int
    state: DemoState


@router.get('/csrf')
async def get_csrf(request: Request, response: Response):
    return issue_csrf(request, response)


async def session_record(request: Request):
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        check_origin(request)
    token = request.cookies.get('inc_wallet_session')
    if not token:
        raise HTTPException(401, 'Connect a wallet to continue')
    record = await db.wallet_sessions.find_one({'token_hash': digest(token), 'expires_at': {'$gt': now()}}, {'_id': 0})
    if not record:
        raise HTTPException(401, 'Wallet session expired. Reconnect to continue.')
    return record


async def require_workspace(session_id: str, session=Depends(session_record)):
    if session['workspace_id'] != session_id:
        raise HTTPException(403, 'Wallet cannot access this allocation')
    return session


@router.post('/challenge')
async def challenge(body: ChallengeRequest, request: Request):
    check_origin(request)
    if not is_address(body.address):
        raise HTTPException(400, 'Invalid EVM wallet address')
    address = to_checksum_address(body.address)
    count = await db.wallet_nonces.count_documents({'address': address.lower(), 'created_at': {'$gt': now() - timedelta(minutes=5)}})
    if count >= 15:
        raise HTTPException(429, 'Too many connection attempts. Try again shortly.')
    nonce = secrets.token_hex(16)
    issued, expires = now(), now() + timedelta(minutes=5)
    message = (f'{DOMAIN} wants you to sign in with your Ethereum account:\n{address}\n\n'
               'Connect this wallet to Inc.hood. This signature authorizes account access, not a blockchain transaction.\n\n'
               f'URI: {ORIGIN}\nVersion: 1\nChain ID: {body.chain_id}\nNonce: {nonce}\n'
               f'Issued At: {stamp(issued)}\nExpiration Time: {stamp(expires)}')
    await db.wallet_nonces.insert_one({'nonce': nonce, 'address': address.lower(), 'chain_id': body.chain_id,
        'message': message, 'created_at': issued, 'expires_at': expires, 'used': False, 'attempts': 0})
    return {'message': message, 'expires_at': stamp(expires)}


@router.post('/verify', response_model=WalletSession)
async def verify(body: VerificationRequest, request: Request, response: Response):
    check_origin(request)
    doc = await db.wallet_nonces.find_one_and_update(
        {'message': body.message, 'used': False, 'expires_at': {'$gt': now()}, 'attempts': {'$lt': 5}},
        {'$inc': {'attempts': 1}}, projection={'_id': 0}, return_document=ReturnDocument.AFTER)
    if not doc:
        raise HTTPException(401, 'Challenge expired, invalid, or already used')
    # Only the exact server-issued message can be signed. Domain, URI, version,
    # address, chain, nonce and timestamps cannot be replaced by client input.
    if not body.message.startswith(DOMAIN + ' wants you to sign in with your Ethereum account:\n') or f'URI: {ORIGIN}\nVersion: 1\n' not in body.message:
        raise HTTPException(401, 'Invalid message domain')
    try:
        signer = Account.recover_message(encode_defunct(text=body.message), signature=body.signature).lower()
    except Exception:
        raise HTTPException(401, 'Invalid wallet signature')
    if signer != doc['address']:
        raise HTTPException(401, 'Signature does not match the selected wallet')
    consumed = await db.wallet_nonces.update_one({'nonce': doc['nonce'], 'used': False, 'expires_at': {'$gt': now()}}, {'$set': {'used': True}})
    if consumed.modified_count != 1:
        raise HTTPException(401, 'Challenge already used')
    fresh = DemoState(id=str(uuid.uuid4()), wallet_address=signer).model_dump()
    workspace = await db.demo_workspaces.find_one_and_update({'wallet_address': signer}, {'$setOnInsert': fresh}, projection={'_id': 0}, upsert=True, return_document=ReturnDocument.AFTER)
    old_token = request.cookies.get('inc_wallet_session')
    if old_token:
        await db.wallet_sessions.delete_one({'token_hash': digest(old_token)})
    token = secrets.token_urlsafe(32)
    await db.wallet_sessions.insert_one({'token_hash': digest(token), 'address': signer, 'workspace_id': workspace['id'],
        'chain_id': doc['chain_id'], 'created_at': now(), 'expires_at': now() + timedelta(hours=8)})
    response.set_cookie('inc_wallet_session', token, httponly=True, secure=SECURE, samesite='lax', max_age=28800, path='/api')
    response.headers['Cache-Control'] = 'no-store'
    return WalletSession(address=to_checksum_address(signer), chain_id=doc['chain_id'], state=await mutate(db, workspace['id']))


@router.get('/me', response_model=WalletSession)
async def me(response: Response, session=Depends(session_record)):
    response.headers['Cache-Control'] = 'no-store'
    return WalletSession(address=to_checksum_address(session['address']), chain_id=session['chain_id'], state=await mutate(db, session['workspace_id']))


@router.post('/logout')
async def logout(request: Request, response: Response):
    check_origin(request)
    token = request.cookies.get('inc_wallet_session')
    if token:
        await db.wallet_sessions.delete_one({'token_hash': digest(token)})
    response.delete_cookie('inc_wallet_session', path='/api', secure=SECURE, httponly=True, samesite='lax')
    return {'ok': True}