# NotesBackend Backend Summary

This file is a very detailed explanation of how the backend inside `pythonLearning/NotesBackend/backend` works.

The goal of this summary is not just to say what each file contains, but to explain:

- why the file exists
- what problem it solves
- how data moves through it
- how all backend layers connect to each other
- what each route is doing internally
- how authentication is applied
- how MongoDB documents are converted into safe API responses

This backend is a small but very real full-stack backend. Even though the project is not huge, it already contains the most important backend building blocks:

- an application entrypoint
- route organization
- environment-based configuration
- database connection setup
- request validation
- response formatting
- authentication utilities
- protected CRUD endpoints


## 1. Big Picture: What This Backend Does

The backend is the middle layer between the frontend and the database.

The overall architecture is:

```text
React frontend
   ->
FastAPI backend
   ->
MongoDB
```

That means:

- the frontend does not directly access MongoDB
- the frontend sends HTTP requests to FastAPI
- FastAPI decides what to do with those requests
- FastAPI reads or writes data in MongoDB
- FastAPI returns JSON responses back to the frontend

In this project, the backend handles three major areas:

1. user authentication
2. normal notes
3. sticky notes

So the backend is not just storing notes. It is also deciding:

- who the current user is
- whether the request is allowed
- which notes belong to which user
- what data should be returned to the frontend


## 2. Backend Folder Structure

Important backend files and folders:

```text
backend/
├── .env
├── index.py
├── config/
│   ├── auth.py
│   └── db.py
├── modals/
│   ├── note.py
│   └── user.py
├── routes/
│   ├── auth.py
│   ├── note.py
│   └── sticky.py
├── schemas/
│   ├── note.py
│   ├── sticky.py
│   └── user.py
└── templates/
    └── index.html
```

Each folder has a clear job:

- `index.py` starts the FastAPI app and connects all routers
- `config/` contains reusable configuration code
- `routes/` contains API endpoints
- `modals/` contains Pydantic input models
- `schemas/` formats MongoDB data before returning it
- `templates/` contains an HTML template for server-rendered UI

Important note:

The folder is named `modals`, but conceptually it is being used like `models` for request validation. In many FastAPI projects, this folder might be called `models`, `schemas`, `dtos`, or `validators`. Here, `modals` is the folder where incoming request body shapes are defined.


## 3. Core Backend Flow

Before going file by file, it helps to understand the full request lifecycle.

When the frontend sends a protected request like:

```text
GET /api/notes
Authorization: Bearer <jwt_token>
```

the request flows like this:

1. The request reaches the FastAPI app in `index.py`.
2. FastAPI finds the matching route in `routes/note.py`.
3. That route has `Depends(get_current_user)`, so FastAPI first runs `get_current_user()` from `config/auth.py`.
4. `get_current_user()` extracts the bearer token, decodes it, and finds the user in MongoDB.
5. If token validation fails, FastAPI returns `401 Unauthorized`.
6. If the token is valid, the user document is injected into the route function.
7. The route uses `notes_collection` from `config/db.py` to query MongoDB.
8. MongoDB returns note documents.
9. `schemas/note.py` formats those Mongo documents into JSON-friendly output.
10. FastAPI sends the final response back to the frontend.

That same layered idea appears again and again in this backend:

- config code is reused
- routes orchestrate logic
- models validate incoming input
- schemas format outgoing data


## 4. Main Entry Point: `backend/index.py`

Code:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import auth
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

app.include_router(auth)
app.include_router(note)
app.include_router(sticky)
```

This is the backend entrypoint.

It does three essential things:

1. creates the FastAPI application object
2. enables CORS for the frontend
3. registers all route groups


### 4.1 `app = FastAPI()`

This creates the FastAPI application instance.

Without this line:

- there is no backend app object
- Uvicorn has nothing to run
- routes cannot be attached

When you run:

```bash
uvicorn index:app --reload
```

this means:

- `index` refers to `index.py`
- `app` refers to the `FastAPI()` object inside that file

So `index.py` is the bootstrap file for the whole backend.


### 4.2 Why CORS is configured here

The frontend runs on Vite development server URLs such as:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

The backend usually runs on something like:

- `http://127.0.0.1:8000`

These are different origins.

Browsers block many cross-origin requests by default for security reasons. If CORS is not configured, the browser may stop the frontend from reading the backend response even if the backend itself worked correctly.

This middleware tells the browser:

- requests from these frontend origins are allowed
- cookies or credentials may be included if needed
- all HTTP methods are allowed
- all headers are allowed

Important settings:

- `allow_origins=[...]`
  Only the listed origins are allowed.
- `allow_credentials=True`
  Allows credentials like cookies or authorization-related browser behavior.
- `allow_methods=["*"]`
  Allows GET, POST, PUT, DELETE, and others.
- `allow_headers=["*"]`
  Allows custom headers like `Authorization`.

This is especially important because authenticated requests usually send an `Authorization` header with a bearer token.


### 4.3 Why routers are included here

These lines:

```python
app.include_router(auth)
app.include_router(note)
app.include_router(sticky)
```

tell FastAPI to activate routes defined in other files.

Without them:

- the route files may exist
- but FastAPI would never expose those endpoints

So `index.py` is the assembly point where the application is constructed from smaller route modules.


## 5. Database Setup: `backend/config/db.py`

Code:

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
sticky_notes_collection = db.stickynotes
users_collection = db.users
```

This file centralizes database connection logic.

That is important because database configuration should not be duplicated inside every route file.

If every route manually created a MongoDB client, the code would become:

- repetitive
- harder to maintain
- easier to break

Instead, this file creates shared collection references that the rest of the backend imports.


### 5.1 `BASE_DIR`

```python
BASE_DIR = Path(__file__).resolve().parent.parent
```

This finds the backend root directory.

Why?

Because `db.py` lives inside `backend/config/`, but the `.env` file lives in the parent backend folder. This line helps create the correct path to `.env` regardless of where the code is run from.

So this is path-safe and cleaner than hardcoding string paths.


### 5.2 `load_dotenv(BASE_DIR / ".env")`

This loads environment variables from the backend’s `.env` file.

That file likely contains secret or environment-specific values such as:

- `MONGO_URI`
- `SECRET_KEY`
- `ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`

Why use `.env`?

Because secrets and environment configuration should not be hardcoded into Python files.

This gives several benefits:

- easier local development
- safer secret handling
- easier deployment changes later


### 5.3 `MongoClient(...)`

```python
conn = MongoClient(
    os.getenv("MONGO_URI"),
    connect=False,
    serverSelectionTimeoutMS=5000,
)
```

This creates the PyMongo client.

Important details:

- `os.getenv("MONGO_URI")`
  Reads the MongoDB connection string from environment variables.
- `connect=False`
  Avoids forcing the DB connection immediately at import time.
- `serverSelectionTimeoutMS=5000`
  Prevents waiting too long if MongoDB is unreachable.

This means the app tries to be a little more fault-tolerant during startup.


### 5.4 Database and collection selection

```python
db = conn.notes
notes_collection = db.notes
sticky_notes_collection = db.stickynotes
users_collection = db.users
```

This means:

- database name is `notes`
- notes are stored in collection `notes`
- sticky notes are stored in collection `stickynotes`
- users are stored in collection `users`

These collection variables are extremely important because they are imported into route and auth files.

So instead of writing:

```python
conn.notes.notes.find(...)
```

everywhere, the project uses clear reusable names:

- `notes_collection`
- `sticky_notes_collection`
- `users_collection`


### 5.5 Why this file matters architecturally

This file is not just about connecting to MongoDB.

It defines the persistent storage layer for the whole application.

Every important backend feature depends on it:

- login queries users from `users_collection`
- signup inserts into `users_collection`
- note CRUD queries `notes_collection`
- sticky note CRUD queries `sticky_notes_collection`

So `config/db.py` is one of the most foundational files in the project.


## 6. Authentication Utilities: `backend/config/auth.py`

Code:

```python
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from config.db import users_collection

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
```

This file contains all reusable authentication logic.

That is exactly the right design decision.

Authentication code is usually shared across many routes. If that logic were copied into every route file, it would become messy very quickly.

This file handles:

- password hashing
- password verification
- JWT token creation
- JWT token decoding
- extracting the current logged-in user from the token


### 6.1 Why auth config is separated from routes

Routes should focus on request handling.

For example:

- signup route should focus on user creation
- login route should focus on verifying credentials
- note route should focus on notes

But authentication itself includes reusable lower-level utilities such as:

- hashing
- verification
- decoding bearer tokens
- fetching the user by token subject

That is why `config/auth.py` exists.

It keeps the route files smaller and more readable.


### 6.2 Environment values used by auth

```python
SECRET_KEY = os.getenv("SECRET_KEY", "")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
```

These define how JWT tokens are created and verified.

- `SECRET_KEY`
  Used to sign tokens so they cannot be tampered with easily.
- `ALGORITHM`
  Defines the signing algorithm, defaulting to `HS256`.
- `ACCESS_TOKEN_EXPIRE_MINUTES`
  Controls how long the token stays valid.

The defaults provide a fallback, but in real use you want `.env` to define secure values.


### 6.3 Password hashing context

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

This tells Passlib to hash passwords using `bcrypt`.

This is extremely important.

You should never save plain text passwords in the database.

Correct backend behavior is:

1. user sends plain password at signup
2. backend hashes it
3. database stores only the hash

Then at login:

1. user sends plain password again
2. backend compares it against the stored hash
3. plain password itself is still never stored

This is a major security principle.


### 6.4 OAuth2PasswordBearer

```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
```

This tells FastAPI how to extract bearer tokens from incoming requests.

When a request includes:

```text
Authorization: Bearer <token>
```

this helper knows how to read the token portion.

`tokenUrl="/auth/login"` tells FastAPI that the token is obtained from that login endpoint. This is useful for documentation and follows FastAPI auth conventions.


### 6.5 `hash_password(password: str) -> str`

```python
def hash_password(password: str) -> str:
    return pwd_context.hash(password)
```

This function converts a plain password into a secure hash.

It is used during signup.

Example:

- incoming password: `mypassword123`
- stored value: a long bcrypt hash

The stored hash is intentionally one-way. You do not decrypt it later. Instead, you verify against it.


### 6.6 `verify_password(...)`

```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

This is used during login.

It checks whether the user’s typed password matches the previously stored hash.

It does not compare raw strings directly.

That is important because the stored DB value is a hash, not the original password.


### 6.7 `create_access_token(data: dict) -> str`

```python
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

This creates a JWT access token.

Step by step:

1. copy the input payload
2. compute an expiration time
3. add that expiration as `exp`
4. sign the token using the secret key and algorithm

In this project, the payload includes:

- `sub`: the user’s MongoDB `_id` as a string
- `email`: the user’s email

The `sub` field is especially important because it acts like the identity reference for later requests.

When the token is decoded later, the backend uses `sub` to find the correct user in MongoDB.


### 6.8 `verify_token(token: str) -> dict`

```python
def verify_token(token: str) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        if not user_id:
            raise credentials_exception

        return payload
    except JWTError as exc:
        raise credentials_exception from exc
```

This function decodes and validates the JWT token.

It checks:

- whether the token signature is valid
- whether the token can be decoded
- whether the payload contains `sub`

If any of that fails, it raises a `401 Unauthorized`.

Important detail:

The function creates a reusable `credentials_exception` first, then raises it for all token validation failures. That gives consistent behavior for protected routes.

Also note:

- `jwt.decode(...)` may fail for invalid signature, malformed token, or expiration problems
- `JWTError` catches decode-related problems


### 6.9 `get_current_user(token: str = Depends(oauth2_scheme)) -> dict`

```python
def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = verify_token(token)
    user_id = payload.get("sub")

    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
    except InvalidId as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
```

This is one of the most important functions in the entire backend.

It is the bridge between:

- authentication token
- actual database user document

What it does:

1. FastAPI injects the bearer token using `oauth2_scheme`
2. the token is verified with `verify_token`
3. the `sub` claim is extracted
4. the string `sub` is converted into a Mongo `ObjectId`
5. the user is looked up in `users_collection`
6. if the user exists, the full Mongo user document is returned

This means protected routes do not merely know that a token exists.

They get the actual current user object from the database.

That makes downstream route logic simple:

```python
current_user_id = str(current_user["_id"])
```

and now the route can safely query only that user’s notes.


### 6.10 Why `InvalidId` is handled

Mongo user IDs use `ObjectId`.

If someone tampers with a token and puts a non-ObjectId string inside `sub`, then:

```python
ObjectId(user_id)
```

would fail.

This code catches that and returns:

- `401 Unauthorized`
- `"Invalid user token"`

That is a good defensive step.


### 6.11 Why this file is central to security

Without `config/auth.py`, the app would not safely support:

- password hashing
- login verification
- token generation
- route protection
- per-user data isolation

So this file is the core security layer of the backend.


## 7. Note Input Models: `backend/modals/note.py`

Code:

```python
from pydantic import BaseModel

class Note(BaseModel):
    title: str
    desc: str
    important: bool = False


class stickyNote(BaseModel):
    color: str
    desc: str
```

This file defines the expected shape of incoming note-related request bodies.

These are Pydantic models.

Pydantic is used by FastAPI to validate input automatically.


### 7.1 Why input models matter

If the frontend sends JSON to create a note, FastAPI needs to know:

- what fields are expected
- which types those fields should have
- which fields are required
- which fields are optional

That is exactly what these classes do.

Without them, the route would have to manually parse and validate raw request data.


### 7.2 `class Note(BaseModel)`

This model is used for normal note creation and note updates.

Fields:

- `title: str`
  Required string
- `desc: str`
  Required string
- `important: bool = False`
  Optional boolean with default `False`

This means:

- if `title` is missing, request validation fails
- if `desc` is missing, request validation fails
- if `important` is omitted, FastAPI supplies `False`

That default is useful because not every note must be marked important.


### 7.3 `class stickyNote(BaseModel)`

This model is used for sticky note creation.

Fields:

- `color: str`
- `desc: str`

Both are required.

So the route receives guaranteed validated data before it inserts anything into the database.


### 7.4 Why this file is a gatekeeper

The comments in the file already hint at the correct idea:

```python
# gatekeeper for input
```

That is exactly how you should think about these classes.

They sit at the boundary where external data enters the backend.

So they protect the rest of the backend from malformed input.


## 8. User Input Models: `backend/modals/user.py`

Code:

```python
from pydantic import BaseModel, EmailStr, Field

class UserSignup(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=32)

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=32)
```

This file defines the expected request body for signup and login.


### 8.1 Why separate user models exist

Auth requests have a different shape from note requests.

They need:

- `email`
- `password`

Using a dedicated file for user-related inputs keeps the backend organized and clear.


### 8.2 `EmailStr`

`EmailStr` is better than a normal `str` when you want email validation.

It means FastAPI and Pydantic will reject obviously invalid email formats.

So this gives automatic validation before your database logic runs.

This is helpful because it reduces bad data entering the app.


### 8.3 Password `Field(min_length=8, max_length=32)`

This enforces password length rules at the validation layer.

That means:

- too short passwords are rejected immediately
- extremely long passwords beyond your chosen limit are also rejected

This is useful because route code does not need to manually check length later.


### 8.4 Why validation at input stage is useful

By validating here, the backend ensures:

- cleaner route logic
- predictable request bodies
- fewer runtime surprises

So route functions can trust that the incoming `user` parameter already matches the expected structure.


## 9. Note Output Schemas: `backend/schemas/note.py`

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

This file formats MongoDB note documents before they are returned to the frontend.

This is very important because MongoDB documents are not always in the same shape you want to expose through your API.


### 9.1 Why output schemas exist

MongoDB stores documents with fields like:

- `_id`
- maybe internal fields
- values in database-native types

But frontend code usually wants a clean JSON shape.

For example, MongoDB uses:

```python
"_id": ObjectId("...")
```

That is not ideal for frontend use.

So this schema converts it into:

```json
{
  "id": "..."
}
```

That makes the API response cleaner and easier for the frontend to use.


### 9.2 `noteEntity(item)`

This function formats one note document.

It returns:

- `id`
- `title`
- `desc`
- `important`

Important details:

- `str(item["_id"])`
  Converts Mongo `ObjectId` into a normal string
- `.get("title", "")`
  Uses a safe fallback if the field is missing
- `.get("important", False)`
  Applies a default boolean fallback

So this function acts like a serializer for a single note.


### 9.3 `notesEntity(items)`

This function formats multiple note documents.

It loops through the cursor or iterable and applies `noteEntity()` to each one.

That means:

- `noteEntity()` handles one document
- `notesEntity()` handles a list of documents

This is a very common and clean pattern.


### 9.4 Why schema functions are separate from models

This project nicely separates:

- input validation
- output formatting

Input validation is handled by `modals/`.

Output formatting is handled by `schemas/`.

That separation is useful because incoming data and outgoing data often have different rules.

Example:

- incoming note creation does not include `id`
- outgoing note response should include `id`

So it would be wrong to treat them as exactly the same thing.


## 10. Sticky Output Schemas: `backend/schemas/sticky.py`

Code:

```python
def stickyEntity(item) -> dict:
    return {
        "id": str(item["_id"]),
        "color": item.get("color", ""),
        "desc": item.get("desc", ""),
    }

def stickysEntity(items) -> list:
    return [stickyEntity(item) for item in items]
```

This file does for sticky notes what `schemas/note.py` does for normal notes.

It converts MongoDB sticky note documents into clean JSON responses.


### 10.1 `stickyEntity(item)`

Formats a single sticky note:

- converts `_id` to `id`
- returns `color`
- returns `desc`


### 10.2 `stickysEntity(items)`

Formats multiple sticky note documents.

It applies `stickyEntity()` to every document in the result set.


### 10.3 Why this file matters

Even though it is small, it is part of a very important backend pattern:

- DB documents are not returned raw
- response shape is controlled explicitly

That makes the API cleaner and safer.


## 11. User Output Schema: `backend/schemas/user.py`

Code:

```python
def userEntity(item) -> dict:
    return {
        "id": str(item["_id"]),
        "email": item.get("email", ""),
    }
```

This file formats user documents before returning them to the client.


### 11.1 Why this file is especially important

User responses must be handled very carefully.

A Mongo user document may contain:

- `_id`
- `email`
- `password`

But the frontend should never receive the hashed password.

This schema prevents that by exposing only:

- `id`
- `email`

That is excellent practice.


### 11.2 Main security benefit

This file helps enforce the rule:

- password hashes stay on the server
- only safe user information is returned

This is one of the most important reasons response schemas exist.


## 12. Authentication Routes: `backend/routes/auth.py`

Code:

```python
from fastapi import APIRouter, Depends, HTTPException, status

from config.auth import create_access_token, get_current_user, hash_password, verify_password
from config.db import users_collection
from modals.user import UserLogin, UserSignup
from schemas.user import userEntity

auth = APIRouter(prefix="/auth", tags=["auth"])
```

This file defines all auth-related endpoints.

It uses:

- input models from `modals/user.py`
- auth helpers from `config/auth.py`
- Mongo collection from `config/db.py`
- response formatter from `schemas/user.py`

This is a very good example of how backend layers come together.


### 12.1 Router setup

```python
auth = APIRouter(prefix="/auth", tags=["auth"])
```

This means all routes in this file start with `/auth`.

So:

- `@auth.post("/signup")` becomes `/auth/signup`
- `@auth.post("/login")` becomes `/auth/login`
- `@auth.get("/me")` becomes `/auth/me`

The `tags=["auth"]` part helps group routes in FastAPI docs.


### 12.2 Signup route

Code:

```python
@auth.post("/signup")
async def signup(user: UserSignup):
    existing_user = users_collection.find_one({"email": user.email})

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user_data = {
        "email": user.email,
        "password": hash_password(user.password),
    }

    result = users_collection.insert_one(user_data)
    created_user = users_collection.find_one({"_id": result.inserted_id})

    return {
        "message": "User created successfully",
        "user": userEntity(created_user),
    }
```

This route registers a new user.

Step by step:

1. FastAPI validates the request body using `UserSignup`
2. MongoDB is queried to see whether that email already exists
3. if it exists, the route returns `400 Bad Request`
4. if not, the password is hashed
5. the new user is inserted into `users_collection`
6. the inserted user is fetched again using the inserted ID
7. a success response is returned


### 12.3 Why email uniqueness check matters

```python
existing_user = users_collection.find_one({"email": user.email})
```

This prevents duplicate accounts with the same email.

Without this:

- the same email could sign up multiple times
- login behavior could become confusing
- user identity would become unreliable


### 12.4 Why the password is hashed before insert

```python
"password": hash_password(user.password)
```

This is a major security step.

The DB stores:

- hashed password

not:

- plain password

That means even if someone saw the database, they would not immediately see the original passwords.


### 12.5 Why inserted user is read again

```python
created_user = users_collection.find_one({"_id": result.inserted_id})
```

This is done so the API can return the actual saved document in a normalized way.

Then `userEntity(created_user)` removes sensitive fields before sending the response.


### 12.6 Login route

Code:

```python
@auth.post("/login")
async def login(user: UserLogin):
    existing_user = users_collection.find_one({"email": user.email})

    if not existing_user or not verify_password(user.password, existing_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        {
            "sub": str(existing_user["_id"]),
            "email": existing_user["email"],
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": userEntity(existing_user),
    }
```

This route authenticates an existing user.

Step by step:

1. FastAPI validates the request body using `UserLogin`
2. MongoDB looks up the user by email
3. if no user exists, login fails
4. if user exists, the plain password is verified against the stored hash
5. if password check fails, login fails
6. if both checks pass, a JWT token is created
7. the token and safe user data are returned


### 12.7 Why the token payload includes `sub`

```python
{
    "sub": str(existing_user["_id"]),
    "email": existing_user["email"],
}
```

The `sub` claim is used as the user identity.

Later, `get_current_user()` will:

- decode the token
- read `sub`
- convert it to `ObjectId`
- fetch the user

So `sub` is the key piece that allows future protected requests to identify the current user.


### 12.8 Why login returns `token_type: "bearer"`

This makes it clear how the frontend should send the token later:

```text
Authorization: Bearer <access_token>
```

That is the standard bearer token format.


### 12.9 `/auth/me` route

Code:

```python
@auth.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": userEntity(current_user)}
```

This route returns the currently logged-in user.

It does not ask for email/password again.

Instead:

1. it requires a bearer token
2. `Depends(get_current_user)` validates the token
3. FastAPI injects the current user document
4. the route returns safe user info

This is a common pattern used by frontends to restore auth state after refresh.


## 13. Note Routes: `backend/routes/note.py`

Code:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from config.auth import get_current_user
from config.db import notes_collection
from modals.note import Note
from schemas.note import notesEntity, noteEntity
from bson import ObjectId

note = APIRouter()
```

This file defines endpoints related to normal notes.

It is one of the main functional route files in the app.


### 13.1 Root health/message route

```python
@note.get("/")
async def read_root():
    return {"message": "Notes backend is running"}
```

This is a simple route that proves the backend server is alive.

It is helpful for:

- quick testing in browser
- verifying FastAPI startup
- confirming routing is working

It is basically a simple health or welcome response.


### 13.2 Get all notes for current user

Code:

```python
@note.get("/api/notes")
async def get_notes(current_user: dict = Depends(get_current_user)):
    current_user_id = str(current_user["_id"])
    return notesEntity(notes_collection.find({"user_id": current_user_id}))
```

This route returns only the logged-in user’s notes.

That line is very important:

```python
current_user: dict = Depends(get_current_user)
```

It means:

- the route is protected
- the request must include a valid bearer token
- FastAPI will inject the Mongo user document

Then:

```python
notes_collection.find({"user_id": current_user_id})
```

filters notes by owner.

This is how per-user data isolation is implemented.

Without this filter, users could see everyone’s notes.


### 13.3 Why `user_id` is stored as string here

The code converts the current user’s `_id` to a string:

```python
current_user_id = str(current_user["_id"])
```

That suggests note documents store `user_id` as a string, not as Mongo `ObjectId`.

So the route must query using the same type.

This is an important implementation detail because Mongo queries are type-sensitive.

If the DB stored `user_id` as string but the query used raw `ObjectId`, the query would not match documents correctly.


### 13.4 Create a new note

Code:

```python
@note.post("/api/notes")
async def create_item(
    noteSingle: Note, current_user: dict = Depends(get_current_user)
):
    note_data = noteSingle.model_dump()
    note_data["user_id"] = str(current_user["_id"])
    result = notes_collection.insert_one(note_data)
    created_note = notes_collection.find_one({"_id": result.inserted_id})
    return noteEntity(created_note)
```

This route creates a new note.

Step by step:

1. request body is validated using `Note`
2. current user is obtained through dependency injection
3. `noteSingle.model_dump()` converts the Pydantic model into a normal dictionary
4. `user_id` is added manually so note ownership is stored
5. note is inserted into MongoDB
6. inserted note is fetched again
7. note is formatted with `noteEntity()`
8. response is returned


### 13.5 Why `model_dump()` is used

`noteSingle` is a Pydantic model object.

MongoDB expects normal Python dictionary data.

So:

```python
noteSingle.model_dump()
```

converts validated model data into a standard dict that can be inserted into MongoDB.


### 13.6 Why `user_id` is added on the server side

This is very important.

The backend does not trust the frontend to tell it who owns the note.

Instead, it sets:

```python
note_data["user_id"] = str(current_user["_id"])
```

based on the authenticated user.

That is the correct and secure design.

If the frontend were allowed to send arbitrary `user_id`, a malicious user could create notes for another account.


### 13.7 Delete note route

Code:

```python
@note.delete("/api/notes/{id}")
async def delete_note(id: str, current_user: dict = Depends(get_current_user)):
    current_user_id = str(current_user["_id"])
    result = notes_collection.delete_one(
        {"_id": ObjectId(id), "user_id": current_user_id}
    )
    if result.deleted_count == 1:
        return {"message": "Note deleted successfully"}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Note not found",
    )
```

This route deletes a note by ID, but only if it belongs to the current user.

That filter is key:

```python
{"_id": ObjectId(id), "user_id": current_user_id}
```

It means:

- ID must match
- owner must also match

So even if a user somehow knows another note’s ID, they still cannot delete it unless the `user_id` also matches their own account.

This is a very important authorization rule.


### 13.8 Why `deleted_count` is checked

`delete_one()` returns an operation result object, not the deleted document itself.

So the route checks:

```python
if result.deleted_count == 1:
```

If one document was deleted, success is returned.

If zero documents were deleted, the backend returns `404 Not Found`.

That usually means one of these happened:

- the note ID does not exist
- the note exists but does not belong to the current user


### 13.9 Update note route

Code:

```python
@note.put("/api/notes/{id}")
async def update_note(
    id: str, noteSingle: Note, current_user: dict = Depends(get_current_user)
):
    current_user_id = str(current_user["_id"])
    note_data = noteSingle.model_dump()

    result = notes_collection.update_one(
        {"_id": ObjectId(id), "user_id": current_user_id},
        {"$set": note_data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    updated_note = notes_collection.find_one(
        {"_id": ObjectId(id), "user_id": current_user_id}
    )
    return noteEntity(updated_note)
```

This route updates an existing note.

Step by step:

1. note ID comes from the URL path
2. request body is validated using `Note`
3. current user is injected by auth dependency
4. update query filters by both note ID and current user ID
5. `$set` replaces the note fields with new values
6. if no matching note exists, `404` is returned
7. updated note is read from DB again
8. formatted note is returned


### 13.10 Why update also filters by current user

Same reason as delete.

This is authorization.

The backend must ensure users can only update their own documents.


### 13.11 Why the updated note is read again

After `update_one()`, the code fetches the note again:

```python
updated_note = notes_collection.find_one(...)
```

This ensures the response contains the latest stored version of the note.

That is convenient for the frontend because it gets the updated object in final API shape.


## 14. Sticky Note Routes: `backend/routes/sticky.py`

Code:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from config.auth import get_current_user
from modals.note import stickyNote
from config.db import sticky_notes_collection
from schemas.sticky import stickyEntity, stickysEntity
from bson import ObjectId

sticky = APIRouter()
```

This file defines routes for sticky notes.

It follows the same overall pattern as normal note routes, which is good because consistent route structure makes a backend easier to understand and maintain.


### 14.1 Get sticky notes

```python
@sticky.get("/api/stickynotes")
async def get_sticky_notes(current_user: dict = Depends(get_current_user)):
    current_user_id = str(current_user["_id"])
    return stickysEntity(
        sticky_notes_collection.find({"user_id": current_user_id})
    )
```

This route returns all sticky notes for the current user only.

It is protected exactly like normal notes:

- token required
- current user loaded
- query filtered by `user_id`


### 14.2 Create sticky note

```python
@sticky.post("/api/stickynotes")
async def create_sticky_note(
    stickyNoteSingle: stickyNote, current_user: dict = Depends(get_current_user)
):
    sticky_note_data = stickyNoteSingle.model_dump()
    sticky_note_data["user_id"] = str(current_user["_id"])
    result = sticky_notes_collection.insert_one(sticky_note_data)
    created_sticky_note = sticky_notes_collection.find_one({"_id": result.inserted_id})
    return stickyEntity(created_sticky_note)
```

This is the sticky-note equivalent of note creation.

Important backend pattern repeated here:

- validate input
- attach authenticated `user_id`
- insert into MongoDB
- fetch saved document
- format response


### 14.3 Delete sticky note

```python
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
```

This deletes a sticky note only if it belongs to the current user.

Same authorization rule as note deletion.


### 14.4 Pattern reuse

One good thing about this file is that it mirrors the structure of `routes/note.py`.

That kind of consistency is valuable because:

- new features are easier to add
- logic is easier to debug
- future refactors are simpler


## 15. Template File: `backend/templates/index.html`

This file is a server-rendered HTML page for a note-taking UI.

It contains:

- page layout
- note creation form
- note card display
- empty state
- some Jinja-style templating blocks such as `{% if newDocs %}`

Examples:

- `{% if newDocs %}`
- `{% for doc in newDocs %}`
- `{{ doc.title }}`

This strongly suggests it was designed for a template-based rendering flow, likely with FastAPI plus Jinja templates or a similar setup.


### 15.1 Is it active in the current backend?

Based on the current backend code, this template is not being used by `index.py` or any route file right now.

There is no route that:

- loads `Jinja2Templates`
- returns `TemplateResponse`
- serves `index.html`

So at the moment, this file appears to be:

- an older version of the app
- an experiment
- a backup UI
- or a future server-rendered alternative


### 15.2 Why it is still useful to understand

Even if unused, it shows an earlier design idea:

- backend-rendered UI instead of React-rendered UI

This helps you see that the project evolved toward a cleaner split:

- React frontend for UI
- FastAPI backend for API


## 16. How All Important Files Connect

Now let’s connect everything together in one flow.


### 16.1 Signup flow

```text
Frontend sends POST /auth/signup
   ->
routes/auth.py receives request
   ->
modals/user.py validates email and password
   ->
config/db.py gives access to users_collection
   ->
config/auth.py hashes password
   ->
MongoDB stores user
   ->
schemas/user.py formats safe response
   ->
Frontend receives created user
```


### 16.2 Login flow

```text
Frontend sends POST /auth/login
   ->
routes/auth.py receives request
   ->
modals/user.py validates input
   ->
users_collection finds user by email
   ->
config/auth.py verifies password hash
   ->
config/auth.py creates JWT token
   ->
schemas/user.py formats user safely
   ->
Frontend receives token + user data
```


### 16.3 Protected note fetch flow

```text
Frontend sends GET /api/notes with Authorization header
   ->
routes/note.py route starts
   ->
Depends(get_current_user) runs
   ->
config/auth.py extracts and verifies JWT
   ->
config/auth.py loads user from users_collection
   ->
routes/note.py queries notes_collection by user_id
   ->
schemas/note.py formats notes
   ->
Frontend receives only that user's notes
```


### 16.4 Note create flow

```text
Frontend sends POST /api/notes
   ->
modals/note.py validates title, desc, important
   ->
config/auth.py identifies current user
   ->
routes/note.py adds user_id to note data
   ->
MongoDB inserts note
   ->
schemas/note.py formats inserted note
   ->
Frontend receives created note
```


### 16.5 Sticky note flow

Same pattern, but using:

- `sticky_notes_collection`
- `stickyNote`
- `stickyEntity`


## 17. Why This Backend Design Is Good for Learning

This project is a very good learning backend because it demonstrates clear layer separation.


### 17.1 It separates concerns well

Different responsibilities are placed in different files:

- app setup in `index.py`
- DB setup in `config/db.py`
- auth utilities in `config/auth.py`
- input validation in `modals/`
- response formatting in `schemas/`
- business/request handling in `routes/`

This is one of the most important habits in backend engineering.


### 17.2 It teaches dependency injection

FastAPI’s `Depends(get_current_user)` is a very valuable concept.

It shows that authentication can be plugged into routes cleanly instead of manually repeating token parsing in every function.


### 17.3 It teaches per-user authorization

The code is not just authenticating a user.

It is also authorizing access by filtering DB operations using:

- note ID
- current user ID

That distinction matters:

- authentication = who are you?
- authorization = what are you allowed to access?

Your backend implements both.


### 17.4 It teaches request and response separation

This project clearly distinguishes:

- request models
- response schemas

That is a very important backend design principle.


## 18. Important Concepts Learned From Each File

This section summarizes the learning value of each major file.


### `backend/index.py`

Learn:

- how a FastAPI app is created
- how middleware is added
- how routers are registered
- why CORS matters for frontend-backend communication


### `backend/config/db.py`

Learn:

- how to load environment variables
- how to create a Mongo client
- how to select databases and collections
- why DB config should be centralized


### `backend/config/auth.py`

Learn:

- how password hashing works
- how password verification works
- how JWT tokens are created
- how bearer tokens are decoded
- how protected routes identify the current user


### `backend/modals/note.py`

Learn:

- how FastAPI validates incoming note data
- how request body structure is declared
- how default values work in Pydantic


### `backend/modals/user.py`

Learn:

- how to validate email input
- how to enforce password rules
- how auth request bodies are structured


### `backend/schemas/note.py`

Learn:

- how MongoDB documents are transformed for API output
- why `_id` is converted to string `id`
- why output shaping should be explicit


### `backend/schemas/sticky.py`

Learn:

- how the same output formatting pattern is reused for another resource


### `backend/schemas/user.py`

Learn:

- how to hide sensitive database fields
- why password hashes should never be returned


### `backend/routes/auth.py`

Learn:

- how signup works
- how login works
- how tokens are returned
- how current-user route works


### `backend/routes/note.py`

Learn:

- how protected CRUD works
- how note ownership is enforced
- how create, read, update, delete endpoints use MongoDB


### `backend/routes/sticky.py`

Learn:

- how to build another protected resource using the same patterns


## 19. Current API Surface

Based on the current backend code, these are the active endpoints.


### Auth endpoints

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`


### Note endpoints

- `GET /`
- `GET /api/notes`
- `POST /api/notes`
- `DELETE /api/notes/{id}`
- `PUT /api/notes/{id}`


### Sticky note endpoints

- `GET /api/stickynotes`
- `POST /api/stickynotes`
- `DELETE /api/stickynotes/{id}`


## 20. What the Database Documents Probably Look Like

Based on the route logic, the stored Mongo documents probably look like this.


### 20.1 User document

```json
{
  "_id": "ObjectId(...)",
  "email": "user@example.com",
  "password": "hashed_password_here"
}
```

The API response from `userEntity()` becomes:

```json
{
  "id": "...",
  "email": "user@example.com"
}
```


### 20.2 Note document

```json
{
  "_id": "ObjectId(...)",
  "title": "My note",
  "desc": "Some description",
  "important": true,
  "user_id": "user_object_id_as_string"
}
```

The API response becomes:

```json
{
  "id": "...",
  "title": "My note",
  "desc": "Some description",
  "important": true
}
```


### 20.3 Sticky note document

```json
{
  "_id": "ObjectId(...)",
  "color": "yellow",
  "desc": "Buy milk",
  "user_id": "user_object_id_as_string"
}
```

The API response becomes:

```json
{
  "id": "...",
  "color": "yellow",
  "desc": "Buy milk"
}
```


## 21. Distinction Between Authentication and Authorization

This backend gives a good practical example of both.


### Authentication

Authentication means proving who the user is.

In this project, authentication happens when:

- user logs in with email and password
- backend verifies password
- backend issues JWT token

Later, the token proves identity.


### Authorization

Authorization means deciding what the authenticated user is allowed to access.

In this project, authorization happens when routes query or modify notes using:

```python
{"_id": ObjectId(id), "user_id": current_user_id}
```

That ensures users can only access their own notes.


## 22. Common Backend Patterns This Project Demonstrates


### Pattern 1: Centralized config

Both DB and auth configuration are centralized inside `config/`.


### Pattern 2: Router-based organization

Auth, notes, and sticky notes are split into separate route files.


### Pattern 3: Dependency injection

Protected routes reuse `Depends(get_current_user)`.


### Pattern 4: Input/output separation

- `modals/` for incoming data
- `schemas/` for outgoing data


### Pattern 5: Ownership stored in DB

Notes are associated with users through `user_id`.


### Pattern 6: Re-query after insert/update

Routes fetch documents again after insert/update so they can return clean final data.


## 23. Subtle Technical Details Worth Noticing


### 23.1 `async def` with PyMongo

The route functions use `async def`, but PyMongo itself is synchronous.

That means the route handlers are declared as async because FastAPI supports that style, but the DB calls are still normal synchronous operations.

This is fine for a learning project and many small projects, but it is useful to understand that the database library here is not async-native.


### 23.2 `ObjectId` conversion is necessary

For route path parameters like `/{id}`, FastAPI gives the ID as string.

MongoDB `_id` fields are `ObjectId`.

So for note and sticky-note update/delete operations, the string path ID must be converted:

```python
ObjectId(id)
```


### 23.3 User IDs in note documents are strings

This app stores note ownership as string:

```python
"user_id": str(current_user["_id"])
```

So ownership queries also use string values.


### 23.4 Schema functions use `.get(...)`

This is a small but thoughtful detail.

Using `.get()` with fallback values makes response formatting more resilient if some DB field is absent.


## 24. Practical End-to-End Example

Let’s walk through one realistic user session.


### Step 1: user signs up

Frontend sends:

```json
{
  "email": "a@example.com",
  "password": "password123"
}
```

Backend flow:

- `UserSignup` validates email and password length
- `users_collection` checks if email already exists
- password is hashed
- user is inserted
- `userEntity()` returns safe user data


### Step 2: user logs in

Frontend sends:

```json
{
  "email": "a@example.com",
  "password": "password123"
}
```

Backend flow:

- `UserLogin` validates request
- DB finds user by email
- password is verified against stored hash
- JWT token is created with `sub`
- frontend receives token


### Step 3: frontend stores token

Frontend keeps the token and sends it in later requests:

```text
Authorization: Bearer eyJ...
```


### Step 4: user creates a note

Frontend sends:

```json
{
  "title": "Study FastAPI",
  "desc": "Understand routers and dependencies",
  "important": true
}
```

Backend flow:

- token is extracted
- current user is resolved
- request body is validated
- `user_id` is attached by server
- note is inserted
- inserted note is returned


### Step 5: user fetches all notes

Backend:

- resolves current user from token
- queries notes where `user_id == current user`
- formats them with `notesEntity()`
- returns only this user’s notes


### Step 6: user deletes a note

Backend:

- resolves current user
- converts note ID to `ObjectId`
- deletes only if note ID and `user_id` both match

That is the authorization check in action.


## 25. Strengths of the Current Backend


### Strength 1: clear layer separation

The code is split in a way that is easy to learn from.


### Strength 2: authentication is properly integrated

This is not just open CRUD. The routes are protected and user-specific.


### Strength 3: password hashing is handled correctly

That is one of the most important security basics.


### Strength 4: user data exposure is controlled

`schemas/user.py` avoids returning password hashes.


### Strength 5: note ownership is enforced

The queries consistently filter by `user_id`.


## 26. Important Mental Model for This Project

If you want to remember this backend simply, think of it in layers:

```text
index.py
  = creates app and connects everything

config/
  = reusable setup and security logic

routes/
  = decides what endpoint should do

modals/
  = validates incoming request bodies

schemas/
  = formats outgoing response data

MongoDB
  = stores users, notes, and sticky notes
```

That mental model will help you understand almost any future FastAPI backend too.


## 27. Final Summary

This backend is a clean learning example of a real API-driven notes application.

Its backend architecture is centered around a few strong ideas:

- FastAPI is the HTTP server layer
- MongoDB is the persistence layer
- Pydantic models validate incoming data
- schema functions format outgoing data
- JWT authentication identifies users
- route protection ensures only authenticated users can access data
- `user_id` ownership checks ensure users only access their own notes

The most important files in the backend are:

- `backend/index.py`
- `backend/config/db.py`
- `backend/config/auth.py`
- `backend/routes/auth.py`
- `backend/routes/note.py`
- `backend/routes/sticky.py`
- `backend/modals/note.py`
- `backend/modals/user.py`
- `backend/schemas/note.py`
- `backend/schemas/sticky.py`
- `backend/schemas/user.py`

If you understand those files well, then you understand almost the entire backend.

In one sentence:

This backend receives validated requests, authenticates the user, talks to MongoDB, and returns clean user-specific JSON responses to the frontend.
