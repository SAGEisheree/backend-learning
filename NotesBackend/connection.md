# Frontend and Backend Connection Explanation

This file explains in detail how the React frontend is connected to the FastAPI backend in this notes project.

The project is split into two parts:

1. `frontend`
2. `backend`

The `frontend` is responsible for:

- showing the UI
- taking user input
- sending requests to the backend
- displaying the notes returned by the backend

The `backend` is responsible for:

- receiving requests from the frontend
- talking to MongoDB
- saving note data
- returning note data back to the frontend

So the overall flow is:

1. user opens the React page
2. React asks FastAPI for notes
3. FastAPI reads notes from MongoDB
4. FastAPI sends JSON back to React
5. React displays that JSON as note cards
6. when user adds a new note, React sends the note to FastAPI
7. FastAPI stores it in MongoDB
8. FastAPI returns the newly saved note
9. React adds that note to the screen


## Big Picture Architecture

The app works like this:

```text
React frontend  <----HTTP---->  FastAPI backend  <---->  MongoDB
```

This means:

- React never talks directly to MongoDB
- React only talks to FastAPI
- FastAPI is the middle layer between UI and database

That is the standard full-stack pattern:

- frontend handles presentation
- backend handles logic and database work


## Files Involved In the Connection

These are the main files that make the connection work:

### Frontend

- `frontend/src/components/homepage.jsx`

This file:

- stores local React state
- calls the backend with `fetch()`
- sends note data to the backend
- receives note data from the backend
- displays the notes on the screen

### Backend

- `backend/index.py`
- `backend/routes/note.py`
- `backend/config/db.py`
- `backend/modals/note.py`
- `backend/schemas/note.py`

Each one has a specific job:

- `index.py` creates the FastAPI app and enables CORS
- `routes/note.py` defines API routes
- `db.py` connects to MongoDB
- `modals/note.py` defines what a note should look like when data comes from React
- `schemas/note.py` formats MongoDB documents before sending them to React


## Step 1: Backend App Setup

The backend entry file is:

- `backend/index.py`

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

### What this code does

#### `app = FastAPI()`

This creates the FastAPI application.

Without this line, there is no backend server.

#### `app.add_middleware(CORSMiddleware, ...)`

This is very important for frontend-backend connection in development.

Your React frontend runs on:

- `http://localhost:5173`

Your FastAPI backend runs on:

- `http://127.0.0.1:8000`

These are different origins.

Browsers block requests between different origins unless the backend explicitly allows them.

That is exactly what CORS does.

This code tells FastAPI:

- allow requests from `localhost:5173`
- allow requests from `127.0.0.1:5173`

Without CORS:

- the React app may send a request
- but the browser will block the response
- and you will see CORS errors in the browser console

#### `app.include_router(note)`

This attaches the routes from `routes/note.py` into the backend app.

So this line makes endpoints like these available:

- `GET /`
- `GET /api/notes`
- `POST /api/notes`

Without `include_router(note)`, those routes would not exist.


## Step 2: MongoDB Connection

The Mongo connection setup is in:

- `backend/config/db.py`

This file contains:

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

### What this code does

#### `load_dotenv(BASE_DIR / ".env")`

This loads environment variables from the `.env` file.

That is where your Mongo connection string is stored.

Example:

```env
MONGO_URI=your_mongodb_connection_string
```

#### `MongoClient(...)`

This creates a MongoDB client object.

That object is what FastAPI uses to talk to the database.

#### `db = conn.notes`

This selects the Mongo database named `notes`.

#### `notes_collection = db.notes`

This selects the collection named `notes` inside the `notes` database.

So the backend is reading and writing to:

- database: `notes`
- collection: `notes`

That means your documents are stored in:

```text
notes.notes
```


## Step 3: Backend Routes

The API routes are in:

- `backend/routes/note.py`

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

Now let’s break this down carefully.


## Route 1: Health Route

```python
@note.get("/")
async def read_root():
    return {"message": "Notes backend is running"}
```

This is just a simple test route.

If you open:

```text
http://127.0.0.1:8000/
```

you should get:

```json
{"message": "Notes backend is running"}
```

This confirms:

- FastAPI is running
- routing is working

This route is not used by React for note data.


## Route 2: Get All Notes

```python
@note.get("/api/notes")
async def get_notes():
    return notesEntity(notes_collection.find({}))
```

This route is used by React to load all notes.

### How it works

#### `notes_collection.find({})`

This asks MongoDB:

- give me all documents in the `notes` collection

The `{}` means no filter.

So every note is returned.

#### `notesEntity(...)`

MongoDB returns documents in a raw format.

Each Mongo document contains an `_id` field that is not directly JSON-friendly in the way the frontend expects.

So the backend uses a schema formatter before sending data to React.


## Step 4: Data Formatting Before Sending to React

This logic is in:

- `backend/schemas/note.py`

Code:

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

### Why this file matters

MongoDB documents look something like this:

```python
{
    "_id": ObjectId("..."),
    "title": "Study",
    "desc": "Finish FastAPI notes",
    "important": True
}
```

But React prefers simple JSON like this:

```json
{
  "id": "some_string_id",
  "title": "Study",
  "desc": "Finish FastAPI notes",
  "important": true
}
```

### What `noteEntity()` does

It converts one Mongo document into a clean JSON-friendly dictionary.

Important part:

```python
"id": str(item["_id"])
```

Mongo uses `_id`, but frontend uses `id`.

Also, `_id` is converted to string because React expects a string or number key, not a Mongo `ObjectId` object.

### What `notesEntity()` does

It loops through all Mongo documents and converts every one of them using `noteEntity()`.

So:

- `find({})` gets raw Mongo documents
- `notesEntity(...)` converts them into frontend-friendly JSON


## Step 5: Backend Validation of Incoming Data

This logic is in:

- `backend/modals/note.py`

Code:

```python
from pydantic import BaseModel

class Note(BaseModel):
    title: str
    desc: str
    important: bool = False
```

### What this does

This defines the expected shape of incoming note data.

When React sends a POST request, FastAPI checks the incoming JSON against this model.

So the backend expects:

```json
{
  "title": "Some title",
  "desc": "Some description",
  "important": true
}
```

If the data shape is wrong, FastAPI automatically rejects it.

This is useful because it protects the backend from bad input.


## Route 3: Create a New Note

Back in `routes/note.py`:

```python
@note.post("/api/notes")
async def create_item(note: Note):
    note_data = note.model_dump()
    result = notes_collection.insert_one(note_data)
    created_note = notes_collection.find_one({"_id": result.inserted_id})
    return noteEntity(created_note)
```

This route is used when React sends a new note to the backend.

### Step by step

#### `note: Note`

FastAPI receives request JSON and validates it using the `Note` model.

If React sends:

```json
{
  "title": "Math",
  "desc": "Revise algebra",
  "important": true
}
```

FastAPI parses it into a `Note` object.

#### `note.model_dump()`

This converts the Pydantic model into a normal Python dictionary:

```python
{
    "title": "Math",
    "desc": "Revise algebra",
    "important": True
}
```

#### `notes_collection.insert_one(note_data)`

This inserts the note into MongoDB.

Mongo automatically creates an `_id`.

#### `result.inserted_id`

After insertion, Mongo returns the ID of the newly created document.

#### `find_one({"_id": result.inserted_id})`

The backend fetches the newly inserted note from Mongo again.

This is useful because now the backend has the complete saved document, including `_id`.

#### `return noteEntity(created_note)`

This converts the Mongo document into clean JSON and sends it back to React.

So React receives something like:

```json
{
  "id": "abc123",
  "title": "Math",
  "desc": "Revise algebra",
  "important": true
}
```


## Step 6: React Side Connection Code

The frontend connection code is in:

- `frontend/src/components/homepage.jsx`

This file contains two main backend interactions:

1. fetch notes when the page loads
2. send a new note when user clicks Add Note


## React State Used For Connection

Code:

```javascript
const [noteTitle, setNoteTitle] = useState('')
const [noteText, setNoteText] = useState('')
const [isImportant, setIsImportant] = useState(false)
const [notes, setNotes] = useState([])
const [isLoading, setIsLoading] = useState(true)
const [errorMessage, setErrorMessage] = useState('')
```

### What each state variable does

#### `noteTitle`

Stores the current note title typed by the user.

#### `noteText`

Stores the current note description typed by the user.

#### `isImportant`

Stores whether the Important checkbox is checked.

#### `notes`

Stores the list of notes received from the backend.

This is the actual data shown on the screen.

#### `isLoading`

Used to show a loading message while notes are being fetched.

#### `errorMessage`

Stores any fetch or save error message.

This is how the UI shows backend connection problems.


## API Base URL In React

Code:

```javascript
const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
```

### What this means

React needs to know where the backend is running.

This line says:

- if `VITE_API_URL` exists in frontend environment variables, use it
- otherwise use `http://127.0.0.1:8000`

So during development, the frontend expects FastAPI to run on port `8000`.

This is a nice setup because later you can change the backend URL without editing code.


## React Fetch Logic: Loading Notes

Code:

```javascript
useEffect(() => {
  const fetchNotes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes`)

      if (!response.ok) {
        throw new Error('Unable to load notes right now.')
      }

      const data = await response.json()
      setNotes(data)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  fetchNotes()
}, [API_BASE_URL])
```

### Detailed explanation

#### `useEffect(...)`

This runs after the component renders.

Because the dependency array contains `API_BASE_URL`, it effectively runs once on page load unless that URL changes.

So this is the code that loads notes when the page first opens.

#### `fetch(`${API_BASE_URL}/api/notes`)`

This sends a GET request to:

```text
http://127.0.0.1:8000/api/notes
```

That request goes to FastAPI.

FastAPI then:

1. matches the route `GET /api/notes`
2. reads notes from MongoDB
3. converts them to JSON
4. sends them back to React

#### `if (!response.ok)`

This checks if the backend returned a successful status.

If the backend sends `500`, `404`, or any non-success status, React throws an error.

#### `await response.json()`

This converts the backend response into a JavaScript array of objects.

Example:

```javascript
[
  {
    id: '1',
    title: 'Study',
    desc: 'Finish API chapter',
    important: true
  }
]
```

#### `setNotes(data)`

This stores the backend data in React state.

Once `notes` state updates, React re-renders the page and displays the notes.

#### `setErrorMessage('')`

If the fetch succeeds, clear any previous error.

#### `catch (error)`

If the fetch fails because:

- backend is not running
- CORS fails
- `/api/notes` returns an error
- MongoDB query crashes

then React stores the error message and shows it in the UI.

#### `finally`

This always runs, whether fetch succeeds or fails.

It changes:

```javascript
setIsLoading(false)
```

So the loading state disappears after the request finishes.


## React Save Logic: Creating a Note

Code:

```javascript
const handleAddNote = async () => {
  const trimmedTitle = noteTitle.trim()
  const trimmedNote = noteText.trim()

  if (!trimmedTitle || !trimmedNote) {
    return
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: trimmedTitle,
        desc: trimmedNote,
        important: isImportant,
      }),
    })

    if (!response.ok) {
      throw new Error('Unable to save the note right now.')
    }

    const createdNote = await response.json()

    setNotes((currentNotes) => [createdNote, ...currentNotes])
    setNoteTitle('')
    setNoteText('')
    setIsImportant(false)
    setErrorMessage('')
  } catch (error) {
    setErrorMessage(error.message)
  }
}
```

### Detailed explanation

#### Step 1: trim input

```javascript
const trimmedTitle = noteTitle.trim()
const trimmedNote = noteText.trim()
```

This removes extra spaces from the beginning and end of input.

#### Step 2: prevent empty save

```javascript
if (!trimmedTitle || !trimmedNote) {
  return
}
```

This means:

- if title is empty, do not send request
- if description is empty, do not send request

So React blocks invalid input before calling the backend.

#### Step 3: send POST request

```javascript
await fetch(`${API_BASE_URL}/api/notes`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: trimmedTitle,
    desc: trimmedNote,
    important: isImportant,
  }),
})
```

This is the main frontend-to-backend connection for saving notes.

React sends JSON to FastAPI.

The request body looks like:

```json
{
  "title": "Shopping",
  "desc": "Buy milk and bread",
  "important": true
}
```

#### Why `Content-Type: application/json` matters

This tells FastAPI:

- the request body is JSON

Without this header, FastAPI may not parse the request the way you expect.

#### Step 4: backend receives the note

FastAPI route:

```python
@note.post("/api/notes")
async def create_item(note: Note):
```

This route validates the incoming JSON and inserts it into MongoDB.

#### Step 5: backend returns created note

After saving, FastAPI returns the created note as JSON.

React receives it here:

```javascript
const createdNote = await response.json()
```

#### Step 6: update the UI immediately

```javascript
setNotes((currentNotes) => [createdNote, ...currentNotes])
```

This adds the newly created note to the top of the notes list in React state.

This is important because:

- React does not need a full page reload
- the UI updates immediately after the backend confirms save

#### Step 7: clear the form

```javascript
setNoteTitle('')
setNoteText('')
setIsImportant(false)
```

This resets the form after a successful save.

#### Step 8: handle errors

If POST fails, React stores the error and shows it in the UI.


## How Notes Are Rendered In React

Code:

```javascript
{notes.map((note) => (
  <article key={note.id}>
    <h2>{note.title}</h2>
    <p>{note.desc}</p>
  </article>
))}
```

### What happens here

`notes` contains the data received from FastAPI.

React loops over that array and creates one note card for each note.

Each note uses:

- `note.id`
- `note.title`
- `note.desc`
- `note.important`

This is why backend response shape matters so much.

If backend returned different field names, the UI would break or show empty values.


## Why The Field Names Must Match

The connection only works smoothly because the same data shape is used across the stack.

Current shared shape:

```text
title
desc
important
```

Where this shape is used:

- React POST body
- FastAPI Pydantic model
- MongoDB documents
- schema serializer
- React display UI

If one file used `note` instead of `desc`, then one of these would happen:

- backend could save wrong shape
- frontend might receive empty values
- serializer could crash
- UI could show blank notes

So consistency across files is one of the most important parts of frontend-backend connection.


## Why CORS Was Needed

React dev server and FastAPI dev server do not run on the same origin.

React:

- `http://localhost:5173`

FastAPI:

- `http://127.0.0.1:8000`

Even though both are local, the browser still treats them as different origins.

That means the browser protects the frontend unless the backend explicitly allows access.

That is why this code matters:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Without it:

- `fetch()` from React to FastAPI may fail
- browser console would show a CORS error


## End-to-End Example

Let’s walk through one complete note creation.

User enters:

- title: `Study`
- description: `Finish FastAPI routing`
- important: checked

### In React

React state becomes:

```javascript
noteTitle = "Study"
noteText = "Finish FastAPI routing"
isImportant = true
```

When user clicks `Add Note`, React sends:

```json
POST /api/notes
{
  "title": "Study",
  "desc": "Finish FastAPI routing",
  "important": true
}
```

### In FastAPI

FastAPI route receives it:

```python
async def create_item(note: Note):
```

The `Note` model validates it.

Then FastAPI inserts it into MongoDB.

Mongo stores something like:

```json
{
  "_id": ObjectId("..."),
  "title": "Study",
  "desc": "Finish FastAPI routing",
  "important": true
}
```

Then backend returns:

```json
{
  "id": "some_generated_id",
  "title": "Study",
  "desc": "Finish FastAPI routing",
  "important": true
}
```

### Back in React

React receives that response and runs:

```javascript
setNotes((currentNotes) => [createdNote, ...currentNotes])
```

Now the note instantly appears on the page.


## How Initial Loading Works

When the page first loads:

1. React component renders
2. `useEffect()` runs
3. React sends `GET /api/notes`
4. FastAPI reads all notes from MongoDB
5. FastAPI formats them with `notesEntity()`
6. FastAPI returns JSON array
7. React stores the array in `notes`
8. React shows all notes on screen


## Common Failure Points In This Connection

Here are the most common places where frontend-backend connection can fail:

### 1. Backend not running

If FastAPI is not running, React fetch fails.

Typical result:

- browser shows `NetworkError when attempting to fetch resource`

### 2. Wrong API URL

If `API_BASE_URL` is wrong, React sends requests to the wrong place.

### 3. CORS not enabled

If backend does not allow the frontend origin, browser blocks the response.

### 4. MongoDB connection problem

If FastAPI cannot talk to MongoDB, routes like `GET /api/notes` or `POST /api/notes` fail.

### 5. Field name mismatch

If frontend sends `note` but backend expects `desc`, the app breaks logically.

### 6. Missing fields in old Mongo documents

If serializer expects fields that older documents do not have, backend may return 500 errors unless safe defaults are used.


## Why This Current Setup Is Better Than Backend HTML Rendering

Earlier, the backend template `templates/index.html` was being used as the UI.

Now the connection is better structured because:

- React fully controls the UI
- FastAPI becomes a clean API backend
- frontend and backend are properly separated
- this scales much better if you add:
  - edit note
  - delete note
  - filters
  - authentication

This separation is the standard modern setup:

- React = frontend UI
- FastAPI = backend API
- MongoDB = database


## Final Summary

The connection works because of these exact pieces:

1. React calls FastAPI using `fetch()`
2. FastAPI allows React through CORS
3. FastAPI routes read and write MongoDB data
4. Pydantic validates incoming note data
5. schema functions convert Mongo documents into frontend-friendly JSON
6. React stores backend responses in state
7. React re-renders the UI using that state

In simple words:

- frontend sends note data to backend
- backend saves it in MongoDB
- backend sends notes back as JSON
- frontend shows them on the screen

That is how the backend is connected to the frontend in this project.
