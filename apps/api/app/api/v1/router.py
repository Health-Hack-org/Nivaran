from fastapi import APIRouter
from app.api.v1.endpoints import prescriptions, urges

api_router = APIRouter()

api_router.include_router(
    prescriptions.router,
    prefix="/prescriptions",
    tags=["Prescriptions"]
)

api_router.include_router(
    urges.router,
    prefix="/urges",
    tags=["Urges"]
)
