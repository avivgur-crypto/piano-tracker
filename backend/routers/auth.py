from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from database import get_db
from models import User
from schemas import AuthResponse, TokenData, UserCreate, UserOut

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check existing user
    result = await db.execute(select(User).where(User.email == user.email))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed,
        full_name=user.full_name,
        role=user.role,
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    access_token = create_access_token(
        data={"user_id": db_user.id, "email": db_user.email, "role": db_user.role},
        expires_delta=None,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserOut(
            id=db_user.id,
            email=db_user.email,
            full_name=db_user.full_name,
            role=db_user.role,
            created_at=db_user.created_at,
        ),
    }


@router.post("/login", response_model=AuthResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"user_id": user.id, "email": user.email, "role": user.role},
        expires_delta=None,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserOut(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            created_at=user.created_at,
        ),
    }


@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        created_at=current_user.created_at,
    )
