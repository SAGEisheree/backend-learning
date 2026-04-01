from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from config.db import notes_collection

note = APIRouter()
templates = Jinja2Templates(directory="templates")


@note.get("/", response_class=HTMLResponse)
async def read_item(request: Request):
    docs = notes_collection.find({})
    newDocs = []

    for doc in docs:
        newDocs.append(
            {
                "id": str(doc["_id"]),
                "title": doc.get("title", ""),
                "desc": doc.get("desc", ""),
                "important": doc.get("important", False),
            }
        )

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"newDocs": newDocs},
    )

 
@note.post("/notes")
async def create_item(request: Request):
    form = await request.form()
    note_data = dict(form)
    note_data["important"] = note_data.get("important") == "on"
    notes_collection.insert_one(note_data)
    return {"Success": "Note created successfully"}
    
