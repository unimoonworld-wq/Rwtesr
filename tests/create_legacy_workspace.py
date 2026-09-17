import os
from pathlib import Path

import requests
from dotenv import load_dotenv
from pymongo import MongoClient


load_dotenv(Path('/app/frontend/.env'))
load_dotenv(Path('/app/backend/.env'))


def main():
    base_url = os.environ.get('REACT_APP_BACKEND_URL')
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    if not base_url or not mongo_url or not db_name:
        raise RuntimeError('Missing required environment variables')

    session = requests.post(f"{base_url.rstrip('/')}/api/demo/sessions", timeout=20)
    session.raise_for_status()
    session_id = session.json()['id']

    client = MongoClient(mongo_url)
    try:
        collection = client[db_name]['demo_workspaces']
        collection.update_one(
            {'id': session_id},
            {
                '$set': {
                    'events': [
                        {
                            'id': 'legacy-deposit',
                            'kind': 'deposit',
                            'message': 'Demo INC added',
                            'timestamp': 1700000000,
                            'amount': 10000,
                            'symbol': 'INC',
                        },
                        {
                            'id': 'legacy-burn',
                            'kind': 'burn',
                            'message': '25% INC permanently removed from demo supply',
                            'timestamp': 1700000001,
                            'amount': 25,
                            'symbol': 'INC',
                        },
                    ]
                }
            },
        )
    finally:
        client.close()

    output_file = Path('/app/tests/legacy_workspace_id.txt')
    output_file.write_text(session_id, encoding='utf-8')
    print(session_id)


if __name__ == '__main__':
    main()