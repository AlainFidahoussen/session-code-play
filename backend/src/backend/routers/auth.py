from fastapi import APIRouter, Depends, HTTPException, Response, status

from backend.auth import get_current_user
from backend.models import AuthResponse, LoginRequest, SignupRequest
from backend.store import AuthenticatedUser, InvalidCredentialsError, UsernameTakenError, user_store

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=AuthResponse)
def signup(body: SignupRequest) -> AuthResponse:
    try:
        user = user_store.signup(body.username, body.password)
    except UsernameTakenError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken") from exc
    return AuthResponse(token=user.token, username=user.username)


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest) -> AuthResponse:
    try:
        user = user_store.login(body.username, body.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password") from exc
    return AuthResponse(token=user.token, username=user.username)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(current: AuthenticatedUser = Depends(get_current_user)) -> Response:
    user_store.logout(current.token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=AuthResponse)
def me(current: AuthenticatedUser = Depends(get_current_user)) -> AuthResponse:
    return AuthResponse(token=current.token, username=current.username)
