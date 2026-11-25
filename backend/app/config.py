import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./stockflow.db")
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
DEFAULT_LOW_STOCK_THRESHOLD = 5
MIN_LOW_STOCK_THRESHOLD = 5
