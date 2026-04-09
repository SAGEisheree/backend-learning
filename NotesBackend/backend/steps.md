# Email and Password Authentication Steps

This file explains, in detail, how to add simple email and password authentication to this project.

The goal is:

1. user signs up with email and password
2. user logs in with email and password
3. backend returns a JWT token
4. frontend stores that token
5. frontend sends the token with note requests
6. backend allows each user to see only their own notes

This project does **not** use Google login here.
This is a normal email + password login system.


## Big Picture

Your final architecture should become:

```text
React frontend
   ->
FastAPI backend
   ->
MongoDB
```

But now the backend will also do:

- password hashing
- login verification
- token generation
- user identification
- route protection

So the real flow becomes:

```text
Frontend signup/login
   ->
FastAPI auth routes
   ->
MongoDB users collection
   ->
JWT token
   ->
Protected note routes
```


## Step 1: Install required packages

Go to the backend folder and activate your virtual environment.

Then install:

```bash
pip install python-jose passlib[bcrypt] email-validator python-multipart
```

### Why these packages are needed

#### `python-jose`

Used for JWT tokens.

JWT is the token the backend gives after login.

#### `passlib[bcrypt]`

Used to hash passwords securely.

You must never save plain text passwords in MongoDB.

#### `email-validator`

Used with Pydantic’s `EmailStr` to validate email addresses.

#### `python-multipart`

Useful when dealing with forms or auth-related request parsing.


## Step 2: Update `.env`

File:

- `backend/.env`

Add:

```env
MONGO_URI=your_mongodb_connection_string
SECRET_KEY=your_long_random_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### What these values mean

#### `SECRET_KEY`

This signs your JWT tokens.

It should be long and random.

#### `ALGORITHM`

This is the JWT signing algorithm.

For this project:

```env
HS256
```

is correct.

#### `ACCESS_TOKEN_EXPIRE_MINUTES`

This controls how long a token stays valid.


## Step 3: Add users collection to database setup

File:

- `backend/config/db.py`

You already have:

- `notes_collection`
- `sticky_notes_collection`

Add:

```python
users_collection = db.users
```

### Why

You need a separate collection to store registered users.

That collection will store:

- email
- hashed password

Later you may also store:

- created_at
- last_login
- profile data


## Step 4: Create input models for auth

File to create or complete:

- `backend/modals/user.py`

This file should contain models for:

1. signup request
2. login request

Example structure:

```python
from pydantic import BaseModel, EmailStr

class UserSignup(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
```

### Why this file is needed

FastAPI uses Pydantic models to validate incoming data.

That means:

- email must really look like an email
- password must exist

This prevents bad request data from reaching database logic.


## Step 5: Create user output schema

File to create or complete:

- `backend/schemas/user.py`

This file should format user documents before sending them back to frontend.

It should return safe user data only.

Example:

```python
def userEntity(item) -> dict:
    return {
        "id": str(item["_id"]),
        "email": item.get("email", ""),
    }
```

### Important rule

Do not return password hashes to the frontend.

Never send:

- `password`

in user API responses.


## Step 6: Create auth utility file

File to create or complete:

- `backend/config/auth.py`

This file should hold all reusable auth logic.

It should contain:

1. password hashing
2. password verification
3. JWT creation
4. JWT decoding
5. current-user extraction logic

### Functions to create

You should create functions like:

- `hash_password(password)`
- `verify_password(plain_password, hashed_password)`
- `create_access_token(data)`
- `verify_token(token)`
- `get_current_user(...)`

### Why this file matters

If you keep auth logic directly inside route files, the code gets messy very fast.

This file keeps auth logic centralized and reusable.

### What should be inside `config/auth.py`

Your `auth.py` should import:

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
```

### Why these imports are used

#### `datetime`, `timedelta`, `timezone`

Used to create token expiry time.

#### `ObjectId`

Used to convert MongoDB user id string back into real Mongo `_id` type when finding users.

#### `load_dotenv`

Used to read secret settings from `.env`.

#### `Depends`

Used by FastAPI for dependency injection.

#### `HTTPException`

Used when token or user is invalid.

#### `OAuth2PasswordBearer`

Used to read bearer token from request header.

#### `jwt`

Used to encode and decode JWT tokens.

#### `CryptContext`

Used for password hashing and password verification.

### Values to load from `.env`

Inside `config/auth.py`, load:

```python
SECRET_KEY = os.getenv("SECRET_KEY", "")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
```

### Shared auth objects to create

You should create:

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
```

#### `pwd_context`

This handles password hashing.

#### `oauth2_scheme`

This tells FastAPI to read:

```http
Authorization: Bearer <token>
```

from incoming requests.


## Step 7: Implement password hashing

Inside `config/auth.py`, create a password context using `passlib`.

Concept:

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

Then:

```python
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)
```

### Why hashing is necessary

If your database is ever exposed, raw passwords would be visible.

Hashing means:

- password is transformed into a secure irreversible value
- login still works by checking the hash
- original password is not stored

### How signup should use hashing

When user signs up:

1. frontend sends raw password
2. backend receives password
3. backend calls:

```python
hashed_password = hash_password(user.password)
```

4. backend stores `hashed_password` in MongoDB

So the database stores:

```json
{
  "email": "user@example.com",
  "password": "$2b$12$somehashedvalue"
}
```

not:

```json
{
  "email": "user@example.com",
  "password": "12345678"
}
```

### How login should use password verification

When user logs in:

1. frontend sends raw password again
2. backend finds the user by email
3. backend checks:

```python
verify_password(login_data.password, user["password"])
```

If this returns `True`:

- password is correct
- user can log in

If this returns `False`:

- backend should return login error

### Important note

You never compare:

```python
plain_password == hashed_password
```

That is not how password hashes work.

Always use:

```python
pwd_context.verify(...)
```


## Step 8: Implement JWT creation

Still inside `config/auth.py`, create token generation logic.

Your token should include:

- user id
- email
- expiry time

Conceptually:

```python
{
    "sub": "user_id",
    "email": "user@example.com",
    "exp": expiration_time
}
```

### Why include `sub`

`sub` usually means “subject”.

In auth systems, this is commonly the user id.

That is the main field the backend will use to identify the logged-in user.

### Actual function structure

Your function should look like this conceptually:

```python
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

### What this function does

#### `data.copy()`

Makes a copy of the payload before editing it.

#### `expire = ...`

Creates expiration time based on `.env` setting.

#### `to_encode.update({"exp": expire})`

Adds token expiry into JWT payload.

#### `jwt.encode(...)`

Signs the token using:

- `SECRET_KEY`
- `ALGORITHM`

and returns the final JWT string.

### Example login token payload

When user logs in, backend should create token data like:

```python
access_token = create_access_token(
    {
        "sub": str(user["_id"]),
        "email": user["email"],
    }
)
```

So the final token carries:

- who the user is
- when token expires

### Why JWT is useful

After login, the backend does not need to store login session manually.

Instead:

- frontend sends token with every protected request
- backend decodes the token each time
- backend identifies the current user from that token


## Step 9: Implement token verification and current user extraction

Still inside `config/auth.py`, create logic to:

1. receive JWT token
2. decode it using `SECRET_KEY`
3. verify it is valid
4. extract user id
5. find that user in MongoDB

This logic will be used for protected routes.

### Part 1: verify token

You should create a function like:

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
    except JWTError:
        raise credentials_exception
```

### What this function does

#### `jwt.decode(...)`

Reads and verifies the token.

If token is:

- expired
- signed with wrong key
- malformed

then decoding fails.

#### `payload.get("sub")`

Extracts the user id from token.

If `sub` is missing, the token is not useful for authentication.

#### `HTTPException(...)`

If token is invalid, backend returns:

- `401 Unauthorized`

That tells frontend:

- user is not properly logged in

### Part 2: get current user

After token is verified, you still need to find the actual user in MongoDB.

Create function like:

```python
def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = verify_token(token)
    user_id = payload.get("sub")

    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
```

### What this function does

#### `Depends(oauth2_scheme)`

Tells FastAPI:

- read bearer token from request automatically

#### `verify_token(token)`

Checks whether token is valid.

#### `ObjectId(user_id)`

Converts token user id string into Mongo `_id` type.

#### `users_collection.find_one(...)`

Looks up the real user in database.

If user exists:

- return user object

If user does not exist:

- raise `401 Unauthorized`

### Why `get_current_user()` is important

This is the function that protects private routes.

You will use it in note routes like this:

```python
from fastapi import Depends
from config.auth import get_current_user

@note.get("/api/notes")
async def get_notes(current_user: dict = Depends(get_current_user)):
    ...
```

That means:

- no valid token -> route fails
- valid token -> route gets current logged-in user

### End result of steps 6 to 9

After completing these steps, your backend will be able to:

1. hash passwords securely
2. verify passwords during login
3. create JWT tokens
4. decode JWT tokens
5. identify the current user from token
6. protect private routes


## Step 9: Implement token verification

Also in `config/auth.py`, create logic to:

1. receive JWT token
2. decode it using `SECRET_KEY`
3. verify it is valid
4. extract user id
5. find that user in MongoDB

This logic will be used for protected routes.


## Step 10: Create auth routes

File to create or complete:

- `backend/routes/auth.py`

This file should contain:

1. `POST /auth/signup`
2. `POST /auth/login`
3. `GET /auth/me`


## Step 11: Build signup route

Route:

```text
POST /auth/signup
```

What it should do:

1. receive email + password from frontend
2. check whether that email already exists in `users_collection`
3. if it exists, return an error
4. if not, hash the password
5. save the new user in MongoDB
6. return safe user info

### MongoDB user document should look like:

```json
{
  "email": "user@example.com",
  "password": "hashed_password_here"
}
```

Not:

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```


## Step 12: Build login route

Route:

```text
POST /auth/login
```

What it should do:

1. receive email + password
2. find user by email
3. if user not found, return error
4. verify entered password against hashed password
5. if password is correct, create JWT token
6. return token and user info

Example login response:

```json
{
  "access_token": "jwt_token_here",
  "token_type": "bearer",
  "user": {
    "id": "mongo_user_id",
    "email": "user@example.com"
  }
}
```


## Step 13: Build current-user route

Route:

```text
GET /auth/me
```

What it should do:

1. read token from `Authorization` header
2. decode token
3. find current user in database
4. return safe user info

### Why this route matters

It helps the frontend know:

- is the user still logged in?
- who is the current user after page refresh?


## Step 14: Include auth router in backend app

File:

- `backend/index.py`

You already include note and sticky routers.

Add auth router too.

Example idea:

```python
from routes.auth import auth
app.include_router(auth)
```

Without this, your auth routes will exist in the file but not actually work in the app.


## Step 15: Protect notes routes

File:

- `backend/routes/note.py`

Right now your notes routes are public.

That means anyone could access every note.

You need to protect them using the current-user dependency from `config/auth.py`.

### What should change

#### `GET /api/notes`

Current behavior:

- returns all notes

New behavior:

- return only notes belonging to logged-in user

So instead of:

```python
notes_collection.find({})
```

you should use:

```python
notes_collection.find({"user_id": current_user["id"]})
```

#### `POST /api/notes`

Current behavior:

- saves note without ownership

New behavior:

- save note with `user_id`

Example:

```python
note_data["user_id"] = current_user["id"]
```

#### `PUT /api/notes/{id}`

Current behavior:

- updates by note id only

New behavior:

- update only if note belongs to current user

#### `DELETE /api/notes/{id}`

Current behavior:

- deletes by note id only

New behavior:

- delete only if note belongs to current user


## Step 16: Protect sticky routes too

File:

- `backend/routes/sticky.py`

Do the same thing there if sticky notes should also be private per user.

That means:

- add `user_id` when creating sticky
- fetch stickies by `user_id`
- update/delete by both `_id` and `user_id`


## Step 17: Add `user_id` to saved documents

This is the key idea that makes notes private.

Each saved note should look like:

```json
{
  "title": "Study",
  "desc": "Finish backend auth",
  "important": true,
  "user_id": "logged_in_user_id"
}
```

Each sticky note should also include:

```json
{
  "color": "yellow",
  "desc": "Buy groceries",
  "user_id": "logged_in_user_id"
}
```

Without this, the backend cannot know which note belongs to which user.


## Step 18: Frontend files to create

Inside frontend, create:

```text
frontend/src/components/login.jsx
frontend/src/components/signup.jsx
```

You may also create:

```text
frontend/src/components/auth.jsx
```

if you want one combined auth page instead of two separate pages.


## Step 19: Frontend login flow

The frontend should:

1. show signup form
2. show login form
3. send signup/login requests to backend
4. receive JWT token on login
5. save JWT token
6. send token with future requests


## Step 20: Where to store token in frontend

Simplest beginner version:

```javascript
localStorage.setItem("token", access_token)
```

On logout:

```javascript
localStorage.removeItem("token")
```

This is simple and works for learning projects.

### What should happen after login

When frontend receives the backend login response:

```json
{
  "access_token": "jwt_token_here",
  "token_type": "bearer",
  "user": {
    "id": "mongo_user_id",
    "email": "user@example.com"
  }
}
```

store the token like this:

```javascript
localStorage.setItem("token", data.access_token)
```

### Why `localStorage` is used here

This is the easiest beginner-friendly way to keep a user logged in after refresh.

So if the page reloads:

- token is still available
- frontend can still send it to backend
- backend can still identify the user

### Where you should read the token

Whenever you need to call a protected route, read it like this:

```javascript
const token = localStorage.getItem("token")
```

### Better pattern used in your frontend

Instead of repeating token logic everywhere, create a small helper inside the component:

```javascript
const getAuthHeaders = (includeJson = false) => {
  const token = localStorage.getItem('token')
  const headers = {}

  if (includeJson) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}
```

### Why this helper is useful

It avoids repeating:

- token lookup
- content type logic
- authorization header logic

in every fetch request.

### Logout behavior

When user logs out:

```javascript
localStorage.removeItem("token")
```

After that:

- protected routes will stop working
- frontend should redirect user to login page

### Important note

`localStorage` is okay for learning projects.

For more security in bigger apps, people often use cookies instead.


## Step 21: Send token with frontend fetch requests

File to update:

- `frontend/src/components/homepage.jsx`

Right now your requests do not include auth.

You will need to add:

```javascript
Authorization: `Bearer ${token}`
```

to fetch requests.

Example:

```javascript
const token = localStorage.getItem("token")

const response = await fetch(`${API_BASE_URL}/api/notes`, {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
})
```

Do this for:

- get notes
- create note
- update note
- delete note
- sticky note routes too

### What the authorization header means

When frontend sends:

```http
Authorization: Bearer <token>
```

the backend reads that token using:

```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
```

and then:

```python
current_user: dict = Depends(get_current_user)
```

So this header is what allows the backend to know who the user is.

### How you now use it in `homepage.jsx`

For loading notes:

```javascript
const response = await fetch(`${API_BASE_URL}/api/notes`, {
  headers: getAuthHeaders(),
})
```

For creating or updating notes:

```javascript
const response = await fetch(requestUrl, {
  method: isEditing ? 'PUT' : 'POST',
  headers: getAuthHeaders(true),
  body: JSON.stringify({
    title: trimmedTitle,
    desc: trimmedNote,
    important: isImportant,
  }),
})
```

For deleting notes:

```javascript
const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
  method: 'DELETE',
  headers: getAuthHeaders(),
})
```

### How you should use it in `sticky.jsx`

For loading sticky notes:

```javascript
const response = await fetch(`${API_BASE_URL}/api/stickynotes`, {
  headers: getAuthHeaders(),
})
```

For creating sticky notes:

```javascript
const response = await fetch(`${API_BASE_URL}/api/stickynotes`, {
  method: 'POST',
  headers: getAuthHeaders(true),
  body: JSON.stringify({
    color: stickyColor,
    desc: trimmedStickyText,
  }),
})
```

For deleting sticky notes:

```javascript
const response = await fetch(`${API_BASE_URL}/api/stickynotes/${stickyId}`, {
  method: 'DELETE',
  headers: getAuthHeaders(),
})
```

### Why the backend needs this on every request

The backend does not “remember” the user automatically.

Each protected request must carry proof of login.

That proof is the JWT token.

So every protected request must send the token again.

### What happens if token is missing

If the frontend does not send the token:

- backend will fail in `get_current_user`
- FastAPI will return `401 Unauthorized`

### What happens if token is invalid or expired

If token is wrong or expired:

- backend cannot verify it
- backend returns `401 Unauthorized`

### Practical result of steps 20 and 21

After doing these two steps:

1. frontend remembers the login token
2. frontend sends token with note and sticky requests
3. backend can identify the logged-in user
4. backend can return only that user’s data


## Step 22: Add frontend auth state

Your frontend should track:

- current user
- token
- whether user is logged in

You can do this in:

- `App.jsx`
- or a separate auth context later

Simple version:

- if token exists, show notes page
- if token does not exist, show login/signup page


## Step 23: Suggested backend file checklist

### Files you should create or complete

1. `backend/config/auth.py`
2. `backend/modals/user.py`
3. `backend/schemas/user.py`
4. `backend/routes/auth.py`

### Files you should update

1. `backend/config/db.py`
2. `backend/index.py`
3. `backend/routes/note.py`
4. `backend/routes/sticky.py`


## Step 24: Suggested frontend file checklist

### Files to create

1. `frontend/src/components/login.jsx`
2. `frontend/src/components/signup.jsx`

### Files to update

1. `frontend/src/components/homepage.jsx`
2. maybe `frontend/src/App.jsx`


## Step 25: Order to implement everything

Follow this order.

### Phase 1: Backend auth foundation

1. install packages
2. update `.env`
3. add `users_collection` to `db.py`
4. create `modals/user.py`
5. create `schemas/user.py`
6. create `config/auth.py`

### Phase 2: Backend auth routes

7. create `routes/auth.py`
8. implement signup route
9. implement login route
10. implement `/auth/me`
11. include auth router in `index.py`

### Phase 3: Protect notes

12. create `get_current_user` dependency
13. update `routes/note.py`
14. update `routes/sticky.py`
15. save notes with `user_id`
16. fetch notes by `user_id`

### Phase 4: Frontend auth UI

17. create login component
18. create signup component
19. store token in `localStorage`
20. send token with requests
21. show user-specific notes after login


## Step 26: Example request flow

### Signup

Frontend sends:

```json
POST /auth/signup
{
  "email": "user@example.com",
  "password": "12345678"
}
```

Backend:

1. validates request
2. hashes password
3. saves user to MongoDB


### Login

Frontend sends:

```json
POST /auth/login
{
  "email": "user@example.com",
  "password": "12345678"
}
```

Backend:

1. finds user
2. verifies password
3. creates JWT
4. returns token


### Protected notes request

Frontend sends:

```http
GET /api/notes
Authorization: Bearer your_token_here
```

Backend:

1. reads token
2. verifies token
3. finds current user
4. returns only that user’s notes


## Step 27: Important security rules

Always remember:

1. never store plain text passwords
2. never return password hashes in responses
3. never trust frontend user identity without token verification
4. always check note ownership before update/delete
5. keep `SECRET_KEY` in `.env`


## Step 28: Final simple summary

To add auth to this project, you need to do these core things:

1. create users collection
2. hash passwords
3. create signup/login routes
4. create JWT token
5. store token in frontend
6. send token with note requests
7. attach `user_id` to notes
8. fetch notes only for that logged-in user

That is the full step-by-step path for adding simple email + password authentication to this project.
