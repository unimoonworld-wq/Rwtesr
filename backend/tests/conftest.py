import os
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient


load_dotenv(Path('/app/frontend/.env'))
load_dotenv(Path('/app/backend/.env'))


@pytest.fixture(scope='session')
def base_url():
    url = os.environ.get('REACT_APP_BACKEND_URL')
    if not url:
        pytest.fail('Missing REACT_APP_BACKEND_URL environment variable')
    return url.rstrip('/')


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    return session


@pytest.fixture(scope='session')
def mongo_collection():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    if not mongo_url or not db_name:
        pytest.fail('Missing MONGO_URL or DB_NAME environment variable')
    client = MongoClient(mongo_url)
    collection = client[db_name]['demo_workspaces']
    yield collection
    client.close()


@pytest.fixture
def create_session(api_client, base_url):
    # Creates isolated demo workspace per test
    response = api_client.post(f'{base_url}/api/demo/sessions')
    assert response.status_code == 200
    return response.json()