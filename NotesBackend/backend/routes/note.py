from fastapi import APIRouter
from config.db import notes_collection
from modals.note import Note
from schemas.note import notesEntity, noteEntity

note = APIRouter()


@note.get("/")
async def read_root():
    return {"message": "Notes backend is running"}


@note.get("/api/notes")
async def get_notes():
    return notesEntity(notes_collection.find({}))


@note.post("/api/notes")
async def create_item(note: Note):
    note_data = note.model_dump()
    result = notes_collection.insert_one(note_data)
    created_note = notes_collection.find_one({"_id": result.inserted_id})
    return noteEntity(created_note)
    
