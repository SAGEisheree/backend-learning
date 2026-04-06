from fastapi import APIRouter, Depends, HTTPException, status

from config.auth import create_access_token, get_current_user, hash_password, verify_password
from config.db import users_collection
from modals.user import UserLogin, UserSignup
from schemas.user import userEntity

auth = APIRouter(prefix="/auth", tags=["auth"])


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


@auth.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": userEntity(current_user)}
