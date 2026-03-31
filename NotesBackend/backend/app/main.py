from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pymongo import MongoClient 
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

conn = MongoClient(os.getenv("MONGO_URI"))



@app.get("/", response_class=HTMLResponse)
async def read_item(request: Request): 
    docs = conn.notes.notes.find({})
    newDocs = []
    
    for doc in docs:
        newDocs.append({
            "id": doc["_id"],
            "note": doc["note"]
        })
    
    return templates.TemplateResponse(
        request=request, 
        name="index.html", 
        context={"newDocs": newDocs}
    )