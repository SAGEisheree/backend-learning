from fastapi import APIRouter
from config.db import notes_collection
from modals.note import Note, stickyNote
from schemas.note import notesEntity, noteEntity
from bson import ObjectId

note = APIRouter()
sticky = APIRouter()

@note.get("/")
async def read_root():
    return {"message": "Notes backend is running"}


@note.get("/api/notes")
async def get_notes():
    return notesEntity(notes_collection.find({}))


@note.post("/api/notes")
async def create_item(noteSingle: Note):
    note_data = noteSingle.model_dump()
    result = notes_collection.insert_one(note_data) 
    created_note = notes_collection.find_one({"_id": result.inserted_id})
    return noteEntity(created_note)
    
@note.delete("/api/notes/{id}")
async def delete_note(id: str):
    result = notes_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 1:
        return {"message": "Note deleted successfully"}
    else:
        return {"message": "Note not found"}
    
@note.put("/api/notes/{id}")
async def update_note(id: str, noteSingle: Note):
    note_data = noteSingle.model_dump()

    notes_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": note_data}
    )

    updated_note = notes_collection.find_one({"_id": ObjectId(id)})
    return noteEntity(updated_note)


