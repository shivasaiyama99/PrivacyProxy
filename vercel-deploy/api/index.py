import os
import sys

# Ensure the /api directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the FastAPI application instance
from app.main import app
