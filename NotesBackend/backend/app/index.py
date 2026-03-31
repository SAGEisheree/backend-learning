from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from config.db import notes_collection

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")


@router.get("/", response_class=HTMLResponse)
async def read_item(request: Request):
    docs = notes_collection.find({})
    new_docs = []

    for doc in docs:
        new_docs.append(
            {
                "id": str(doc["_id"]),
                "note": doc.get("note", ""),
                "title": doc.get("title", ""),
            }
        )

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"newDocs": new_docs},
    )
