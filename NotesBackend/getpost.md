# Detailed Backend Explanation

This file explains the backend of the notes project in detail.

The backend is built using:

- FastAPI
- MongoDB
- PyMongo
- Pydantic

Its job is to:

- create API routes
- receive requests from the React frontend
- validate incoming note data
- store notes in MongoDB
- fetch notes from MongoDB
- send the note data back as JSON


## Backend Folder Purpose

The backend is the middle layer between:

1. frontend
2. database

The React frontend never talks to MongoDB directly.

Instead:

- frontend sends HTTP requests to FastAPI
- FastAPI handles the request
- FastAPI reads or writes data in MongoDB
- FastAPI returns a response

So the backend acts like a translator and controller.


## Main Backend Files

These are the core backend files:

- `backend/index.py`
- `backend/routes/note.py`
- `backend/config/db.py`
- `backend/modals/note.py`
- `backend/schemas/note.py`

Each file has a different responsibility.


## 1. `backend/index.py`

Current code:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.note import note

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(note)
```

This file is the entry point of the backend.

### What it does

#### `app = FastAPI()`

This creates the FastAPI app.

Without this line:

- the backend does not exist
- there is no server object to run

You run this backend using:

```bash
uvicorn index:app --reload
```

In that command:

- `index` means `index.py`
- `app` means the FastAPI object inside that file

#### `app.add_middleware(CORSMiddleware, ...)`

This allows the frontend to talk to the backend.

Your frontend runs on:

- `http://localhost:5173`

Your backend runs on:

- `http://127.0.0.1:8000`

These are different origins.

Browsers do not allow cross-origin requests by default.

So this middleware tells the browser:

- yes, requests from the frontend are allowed

Without this:

- `fetch()` from React may fail
- you may see CORS errors in the browser console

#### `app.include_router(note)`

This attaches the routes from `routes/note.py` to the FastAPI app.

That means all routes defined in the `note` router become active in the backend.

Without this:

- the route file exists
- but the backend would not use those routes


## 2. `backend/config/db.py`

Current code:

```python
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

conn = MongoClient(
    os.getenv("MONGO_URI"),
    connect=False,
    serverSelectionTimeoutMS=5000,
)
db = conn.notes
notes_collection = db.notes
```

This file handles database setup.

### Why this file exists

Instead of writing MongoDB connection code in every route file, it is cleaner to centralize it in one place.

This gives you:

- reusable connection logic
- cleaner route code
- easier maintenance

### Explanation line by line

#### `load_dotenv(BASE_DIR / ".env")`

This loads the `.env` file.

The `.env` file contains your MongoDB connection string:

```env
MONGO_URI=your_connection_string
```

This is better than hardcoding secrets directly in Python files.

#### `os.getenv("MONGO_URI")`

This reads the Mongo URI from environment variables.

#### `MongoClient(...)`

This creates the MongoDB client object.

This is the object that knows how to communicate with your MongoDB database.

#### `connect=False`

This tells PyMongo:

- do not force the connection immediately at import time

This helps avoid startup crashes if Mongo is temporarily unreachable.

#### `serverSelectionTimeoutMS=5000`

This limits how long Mongo client waits when selecting a server.

So instead of hanging too long, it will fail faster.

#### `db = conn.notes`

This selects the database named `notes`.

#### `notes_collection = db.notes`

This selects the collection named `notes`.

So the backend is using:

- database: `notes`
- collection: `notes`


## 3. `backend/modals/note.py`

Current code:

```python
from pydantic import BaseModel

class Note(BaseModel):
    title: str
    desc: str
    important: bool = False
```

This file defines the shape of incoming note data.

### Why this file matters

When the frontend sends JSON to the backend, FastAPI needs to know:

- what fields are expected
- what types those fields should have

That is what this model does.

### Meaning of each field

#### `title: str`

The note title must be a string.

#### `desc: str`

The note description must be a string.

#### `important: bool = False`

The note importance must be a boolean.

If the frontend does not send it, the default becomes `False`.

### What FastAPI does with this model

When a request comes to:

```python
@note.post("/api/notes")
async def create_item(note: Note):
```

FastAPI automatically:

1. reads request JSON
2. validates the fields
3. converts it into a `Note` object

So if frontend sends invalid data, FastAPI can reject it.


## 4. `backend/schemas/note.py`

Current code:

```python
def noteEntity(item) -> dict:
    return {
        "id": str(item["_id"]),
        "title": item.get("title", ""),
        "desc": item.get("desc", ""),
        "important": item.get("important", False),
    }

def notesEntity(items) -> list:
    return [noteEntity(item) for item in items]
```

This file formats MongoDB documents before sending them to the frontend.

### Why this file is needed

MongoDB documents are not always in the exact shape the frontend expects.

For example:

- Mongo uses `_id`
- frontend usually expects `id`

Also, older Mongo documents may be missing some fields.

So this schema file creates clean, safe JSON responses.

### `noteEntity(item)`

This formats one Mongo document.

Example input from Mongo:

```python
{
    "_id": ObjectId("abc"),
    "title": "Study",
    "desc": "Finish FastAPI chapter",
    "important": True
}
```

Formatted output:

```python
{
    "id": "abc",
    "title": "Study",
    "desc": "Finish FastAPI chapter",
    "important": True
}
```

### Why `str(item["_id"])` is important

MongoDB `_id` is an `ObjectId`.

The frontend works more easily with a string.

So it is converted before sending.

### Why `.get(...)` is used

This makes the backend safer.

If an older document does not have:

- `title`
- `desc`
- `important`

the backend will not crash with `KeyError`.

Instead, it will use defaults.

### `notesEntity(items)`

This formats a list of Mongo documents.

It simply applies `noteEntity()` to every document returned by MongoDB.


## 5. `backend/routes/note.py`

Current code:

```python
from fastapi import APIRouter
from config.db import notes_collection
from modals.note import Note
from schemas.note import notesEntity, noteEntity

note = APIRouter()


@note.get("/")
async def read_root():
    return {"message": "Notes backend is running"}


@note.get("/api/notes")
async def get_notes():
    return notesEntity(notes_collection.find({}))


@note.post("/api/notes")
async def create_item(note: Note):
    note_data = note.model_dump()
    result = notes_collection.insert_one(note_data)
    created_note = notes_collection.find_one({"_id": result.inserted_id})
    return noteEntity(created_note)
```

This file contains the actual route logic.

This is where FastAPI decides what to do when requests arrive.


## APIRouter

### `note = APIRouter()`

This creates a router object.

Why use a router?

Because it helps organize routes better.

Instead of putting everything inside `index.py`, you can group related note routes in one file.

This makes code cleaner as the project grows.


## Route 1: `GET /`

Code:

```python
@note.get("/")
async def read_root():
    return {"message": "Notes backend is running"}
```

### What this route does

This is a simple test route.

If you open:

```text
http://127.0.0.1:8000/
```

you get:

```json
{"message": "Notes backend is running"}
```

This route helps check if:

- FastAPI is running
- routes are registered correctly

It does not access MongoDB.


## Route 2: `GET /api/notes`

Code:

```python
@note.get("/api/notes")
async def get_notes():
    return notesEntity(notes_collection.find({}))
```

This is the route used by the frontend to load all notes.

### Detailed flow

#### `notes_collection.find({})`

This asks MongoDB:

- give me every document in the `notes` collection

The empty filter `{}` means:

- no filtering
- return all notes

#### `notesEntity(...)`

Mongo returns raw documents.

Those documents are passed into `notesEntity()`.

That function converts them into frontend-friendly JSON.

#### `return ...`

FastAPI automatically converts the Python list into JSON and sends it to the frontend.

So if Mongo contains:

```python
[
    {
        "_id": ObjectId("1"),
        "title": "Math",
        "desc": "Finish homework",
        "important": True
    }
]
```

the API response becomes:

```json
[
  {
    "id": "1",
    "title": "Math",
    "desc": "Finish homework",
    "important": true
  }
]
```


## Route 3: `POST /api/notes`

Code:

```python
@note.post("/api/notes")
async def create_item(note: Note):
    note_data = note.model_dump()
    result = notes_collection.insert_one(note_data)
    created_note = notes_collection.find_one({"_id": result.inserted_id})
    return noteEntity(created_note)
```

This route is used by the frontend to create a new note.

### Detailed flow

#### `note: Note`

This means the route expects JSON matching the `Note` model.

Expected JSON:

```json
{
  "title": "Shopping",
  "desc": "Buy milk",
  "important": true
}
```

If the JSON is wrong, FastAPI validation will fail.

#### `note.model_dump()`

This converts the Pydantic `Note` object into a normal Python dictionary.

Example:

```python
{
    "title": "Shopping",
    "desc": "Buy milk",
    "important": True
}
```

#### `notes_collection.insert_one(note_data)`

This saves the note into MongoDB.

Mongo will automatically create the `_id`.

#### `result.inserted_id`

This gives the ID of the inserted note.

#### `find_one({"_id": result.inserted_id})`

This reads back the exact note that was just inserted.

This is useful because now the backend can return:

- saved title
- saved desc
- saved important
- generated `_id`

#### `noteEntity(created_note)`

This converts the saved Mongo document into clean JSON.

Then FastAPI returns that JSON to the frontend.


## What GET and POST Mean In This Project

### GET

`GET` is used when you want to read data.

In this project:

```python
@note.get("/api/notes")
```

means:

- ask for existing notes
- do not change data

### POST

`POST` is used when you want to send new data to the backend.

In this project:

```python
@note.post("/api/notes")
```

means:

- send a new note to the backend
- backend saves it in MongoDB

So:

- GET = read
- POST = create


## End-to-End Backend Flow For Loading Notes

This is what happens when frontend wants notes:

1. frontend sends `GET /api/notes`
2. FastAPI receives the request
3. route `get_notes()` is called
4. MongoDB is queried using `notes_collection.find({})`
5. Mongo documents are formatted using `notesEntity()`
6. FastAPI returns JSON response


## End-to-End Backend Flow For Saving Notes

This is what happens when frontend adds a note:

1. frontend sends `POST /api/notes`
2. request body contains JSON note data
3. FastAPI validates it using the `Note` model
4. `create_item()` converts the model to dictionary
5. MongoDB inserts the note
6. backend fetches the inserted note using `_id`
7. backend formats the note using `noteEntity()`
8. backend returns the created note as JSON


## How MongoDB Data Looks In This App

Each note document is expected to look like this:

```json
{
  "title": "Study",
  "desc": "Read FastAPI notes",
  "important": false
}
```

After MongoDB stores it, it also includes:

```json
{
  "_id": "generated by mongodb",
  "title": "Study",
  "desc": "Read FastAPI notes",
  "important": false
}
```

Before sending back to frontend, schema changes `_id` into `id`.


## Why Backend Code Is Split Into Multiple Files

This project uses multiple files for a reason.

### `index.py`

Responsible for:

- creating the FastAPI app
- enabling CORS
- attaching routers

### `db.py`

Responsible for:

- loading `.env`
- creating Mongo connection
- selecting database and collection

### `modals/note.py`

Responsible for:

- describing what a valid incoming note looks like

### `schemas/note.py`

Responsible for:

- converting Mongo documents into clean response objects

### `routes/note.py`

Responsible for:

- defining backend endpoints
- calling database logic
- returning responses

This separation makes the project easier to understand and maintain.


## Why Pydantic Model and Schema Are Different

This is an important concept.

### Pydantic model

File:

- `modals/note.py`

Used for:

- validating incoming request data

It answers:

- what should the frontend send?

### Schema formatter

File:

- `schemas/note.py`

Used for:

- formatting outgoing response data

It answers:

- what should the backend send back?

These are related, but not the same thing.


## Common Backend Errors In This Project

Here are common problems you can face.

### 1. MongoDB connection issues

If `MONGO_URI` is wrong or network access fails:

- GET route may fail
- POST route may fail

### 2. Missing fields in Mongo documents

If older documents do not contain `important`, direct access like:

```python
item["important"]
```

can crash.

That is why the schema uses:

```python
item.get("important", False)
```

### 3. CORS errors

If CORS middleware is removed or frontend URL changes:

- browser may block frontend-backend communication

### 4. Wrong backend URL in frontend

If React points to the wrong port or host:

- requests fail
- no notes load


## Example Request and Response

### POST request sent by frontend

```http
POST /api/notes
Content-Type: application/json
```

Body:

```json
{
  "title": "Work",
  "desc": "Finish backend explanation",
  "important": true
}
```

### Response returned by backend

```json
{
  "id": "67f0example",
  "title": "Work",
  "desc": "Finish backend explanation",
  "important": true
}
```

### GET response for all notes

```json
[
  {
    "id": "67f0example",
    "title": "Work",
    "desc": "Finish backend explanation",
    "important": true
  }
]
```


## Final Summary

The backend works in this order:

1. `index.py` creates the FastAPI app
2. CORS is enabled so React can communicate with FastAPI
3. `db.py` creates MongoDB connection objects
4. `routes/note.py` defines GET and POST routes
5. `modals/note.py` validates incoming note data
6. `schemas/note.py` formats outgoing note data
7. MongoDB stores and returns note documents
8. FastAPI sends clean JSON responses to the frontend

In simple words:

- GET route reads notes from MongoDB
- POST route saves notes into MongoDB
- model validates input
- schema formats output
- router connects endpoints
- FastAPI sends JSON

That is how the backend of this notes app works.
