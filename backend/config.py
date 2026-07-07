import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
IMAGE_KIT_PRIVATE_KEY = os.getenv("IMAGE_KIT_PRIVATE_KEY", "")
IMAGE_KIT_PUBLIC_KEY = os.getenv("IMAGE_KIT_PUBLIC_KEY", "")
IMAGE_KIT_URL_ENDPOINT = os.getenv("IMAGE_KIT_URL_ENDPOINT", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")