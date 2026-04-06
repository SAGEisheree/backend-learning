import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

conn = MongoClient(
    os.getenv("MONGO_URI"),
    connect=False,
    serverSelectionTimeoutMS=5000,
)
db = conn.notes
notes_collection = db.notes
sticky_notes_collection = db.stickynotes

