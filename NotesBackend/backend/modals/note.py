#gatekeeper for input

# Frontend → [Modal validates] → FastAPI → MongoDB
# MongoDB → FastAPI → [Schema formats] → Frontend

from pydantic import BaseModel

class Note(BaseModel):
    title: str
    desc: str
    important: bool = False

    

    
