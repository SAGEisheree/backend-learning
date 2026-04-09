
from fastapi import APIRouter, Depends, HTTPException, status
from config.auth import get_current_user
from config.db import notes_collection
from modals.note import Note
from schemas.note import notesEntity, noteEntity
from bson import ObjectId

note = APIRouter()

@note.get("/")
async def read_root():
    return {"message": "Notes backend is running"}


@note.get("/api/notes")
async def get_notes(current_user: dict = Depends(get_current_user)):
    current_user_id = str(current_user["_id"])
    return notesEntity(notes_collection.find({"user_id": current_user_id}))


@note.post("/api/notes")
async def create_item(
    noteSingle: Note, current_user: dict = Depends(get_current_user)
):
    note_data = noteSingle.model_dump()
    note_data["user_id"] = str(current_user["_id"])
    result = notes_collection.insert_one(note_data)
    created_note = notes_collection.find_one({"_id": result.inserted_id})
    return noteEntity(created_note)
    
@note.delete("/api/notes/{id}")
async def delete_note(id: str, current_user: dict = Depends(get_current_user)):
    current_user_id = str(current_user["_id"])
    result = notes_collection.delete_one(
        {"_id": ObjectId(id), "user_id": current_user_id}
    )
    if result.deleted_count == 1:
        return {"message": "Note deleted successfully"}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Note not found",
    )
    
@note.put("/api/notes/{id}")
async def update_note(
    id: str, noteSingle: Note, current_user: dict = Depends(get_current_user)
):
    current_user_id = str(current_user["_id"])
    note_data = noteSingle.model_dump()

    result = notes_collection.update_one(
        {"_id": ObjectId(id), "user_id": current_user_id},
        {"$set": note_data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    updated_note = notes_collection.find_one(
        {"_id": ObjectId(id), "user_id": current_user_id}
    )
    return noteEntity(updated_note)

