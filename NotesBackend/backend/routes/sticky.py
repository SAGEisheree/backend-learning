from fastapi import APIRouter, Depends, HTTPException, status
from config.auth import get_current_user
from modals.note import stickyNote
from config.db import sticky_notes_collection
from schemas.sticky import stickyEntity, stickysEntity
from bson import ObjectId

sticky = APIRouter()

@sticky.get("/api/stickynotes")
async def get_sticky_notes(current_user: dict = Depends(get_current_user)):
    current_user_id = str(current_user["_id"])
    return stickysEntity(
        sticky_notes_collection.find({"user_id": current_user_id})
    )

@sticky.post("/api/stickynotes")
async def create_sticky_note(
    stickyNoteSingle: stickyNote, current_user: dict = Depends(get_current_user)
):
    sticky_note_data = stickyNoteSingle.model_dump()
    sticky_note_data["user_id"] = str(current_user["_id"])
    result = sticky_notes_collection.insert_one(sticky_note_data)
    created_sticky_note = sticky_notes_collection.find_one({"_id": result.inserted_id})
    return stickyEntity(created_sticky_note)

@sticky.delete("/api/stickynotes/{id}")
async def delete_sticky_note(
    id: str, current_user: dict = Depends(get_current_user)
):
    current_user_id = str(current_user["_id"])
    result = sticky_notes_collection.delete_one(
        {"_id": ObjectId(id), "user_id": current_user_id}
    )
    if result.deleted_count == 1:
        return {"message": "Sticky Note deleted successfully"}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Sticky Note not found",
    )
