from fastapi import APIRouter
from modals.note import  stickyNote
from config.db import sticky_notes_collection
from schemas.sticky import stickyEntity, stickysEntity
from bson import ObjectId

sticky = APIRouter()

@sticky.get("/api/stickynotes")
async def get_sticky_notes():
    return stickysEntity(sticky_notes_collection.find({}))

@sticky.post("/api/stickynotes")
async def create_sticky_note(stickyNoteSingle: stickyNote):
    sticky_note_data = stickyNoteSingle.model_dump()
    result = sticky_notes_collection.insert_one(sticky_note_data) 
    created_sticky_note = sticky_notes_collection.find_one({"_id": result.inserted_id})
    return stickyEntity(created_sticky_note)

@sticky.delete("/api/stickynotes/{id}")
async def delete_sticky_note(id: str):
    result = sticky_notes_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 1:
        return {"message": "Sticky Note deleted successfully"}
    else:
        return {"message": "Sticky Note not found"}