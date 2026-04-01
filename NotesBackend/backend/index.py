from routes.note import note
from fastapi import FastAPI

app = FastAPI()

app.include_router(note)

