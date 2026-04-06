from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.note import note
from routes.sticky import sticky

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(note)
app.include_router(sticky)