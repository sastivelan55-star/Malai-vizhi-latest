import sys
import os
import pytest

# Ensure backend directory and project root are in the python path for tests
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app import app as flask_app
from models import init_db

@pytest.fixture(scope="session")
def app():
    flask_app.config.update({
        "TESTING": True,
    })
    init_db()
    yield flask_app

@pytest.fixture(scope="function")
def client(app):
    return app.test_client()
