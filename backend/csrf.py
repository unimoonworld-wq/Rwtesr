import hashlib
import hmac
import os
import secrets
from fastapi import HTTPException, Request, Response
from database import db  # loads protected environment before configuration

SECRET = os.environ['CSRF_SECRET'].encode()
PUBLIC_ORIGIN = os.environ['APP_ORIGIN'].rstrip('/')
PROXY_ORIGIN = os.environ['APP_PROXY_ORIGIN'].rstrip('/')


class ProxyOriginAdapter:
    """One exact infrastructure-origin mapping for CORS, never identity proof."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'http':
            headers = scope.get('headers', [])
            if any(k.lower() == b'origin' and v.decode('latin-1') == PROXY_ORIGIN for k, v in headers):
                scope = {**scope, 'headers': [(k, PUBLIC_ORIGIN.encode() if k.lower() == b'origin' else v) for k, v in headers]}
        await self.app(scope, receive, send)


def sign(binding, nonce):
    return nonce + '.' + hmac.new(SECRET, f'{len(binding)}:{binding}:{nonce}'.encode(), hashlib.sha256).hexdigest()


def binding_for(request):
    return request.cookies.get('inc_wallet_session') or request.cookies.get('__Host-inc_browser')


def valid(token, binding):
    if not token or not binding or len(token) > 200:
        return False
    try:
        nonce, _ = token.split('.', 1)
        return len(nonce) == 48 and hmac.compare_digest(token, sign(binding, nonce))
    except ValueError:
        return False


def issue_csrf(request: Request, response: Response):
    seed = request.cookies.get('__Host-inc_browser')
    if not seed:
        seed = secrets.token_hex(24)
        response.set_cookie('__Host-inc_browser', seed, secure=True, httponly=True, samesite='lax', path='/', max_age=28800)
    binding = request.cookies.get('inc_wallet_session') or seed
    token = request.cookies.get('__Host-inc_csrf')
    if not valid(token, binding):
        token = sign(binding, secrets.token_hex(24))
    response.set_cookie('__Host-inc_csrf', token, secure=True, httponly=True, samesite='lax', path='/', max_age=28800)
    response.headers['Cache-Control'] = 'no-store'
    return {'csrfToken': token}


def require_csrf(request: Request):
    if request.headers.get('sec-fetch-site') in ('cross-site', 'same-site'):
        raise HTTPException(403, 'Cross-site changes are not allowed')
    cookie = request.cookies.get('__Host-inc_csrf', '')
    header = request.headers.get('x-inc-csrf', '')
    if not cookie or not header or not hmac.compare_digest(cookie, header) or not valid(cookie, binding_for(request)):
        raise HTTPException(403, 'Invalid request token', headers={'X-CSRF-Refresh': '1'})