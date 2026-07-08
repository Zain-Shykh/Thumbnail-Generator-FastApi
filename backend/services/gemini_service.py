import base64
import httpx
from google import genai
from google.genai import types
from google.genai import errors  # 👈 FIX: Import the new SDK's native error tracker
from config import GEMINI_API_KEY
import logging
import asyncio
import random

logger = logging.getLogger(__name__)

# Initialize the client. The .aio namespace handles all async tasks
client = genai.Client(api_key=GEMINI_API_KEY)

async def generate_thumbnail(prompt: str, style_prompt: str, headshot_url: str) -> bytes:
    """pass the headshot url directly as an input image returns raw png bytes"""

    full_prompt = (
        f"{style_prompt}\n\n"
        f"User request: {prompt}\n\n"
        "IMPORTANT: The generated thumbnail must prominently feature the person "
        "shown in provided reference headshot photo. Keep their likeness accurate."
    )

    # 1. Download the input image into memory asynchronously
    async with httpx.AsyncClient() as http_client:
        image_response = await http_client.get(headshot_url)
        if image_response.status_code != 200:
            raise RuntimeError("Failed to fetch the reference headshot_url")
        image_bytes = image_response.content

    max_retry = 3
    base_delay = 20
    response = None
    
    for attempt in range(max_retry):
        try:
            logger.info(f"Sending request to Gemini (Attempt {attempt + 1}/{max_retry})...")
            # 2. Call the correct async endpoint (.aio.models.generate_content)
            response = await client.aio.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type="image/png"
                    ),
                    full_prompt
                ],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(
                        aspect_ratio="16:9" # Perfect fit for standard YouTube thumbnails
                    )
                )
            )
            break

        # 👈 FIX: Catch the new native ClientError framework
        except errors.ClientError as e:
            # Verify if this is actually a 429 Rate Limit error. 
            # If it's a different client error (like 400 Bad Request), crash immediately.
            if e.code != 429:
                raise e

            # If this was our final try, raise the exception to let generate_single_thumbnail handle failure
            if attempt == max_retry - 1:
                logger.error(f"Gemini API quota totally exhausted after {max_retry} attempts.")
                raise e

            # Math: base_delay * 2^attempt (e.g., 4s, 8s, 16s)
            calculated_delay = base_delay * (2 ** attempt)
            
            # Jitter: Add/subtract a random float between -1.5 and 1.5 seconds
            jitter = random.uniform(-1.5, 1.5)
            
            # Ensure we don't accidentally sleep for a negative number
            sleep_duration = max(1.0, calculated_delay + jitter)

            logger.warning(
                f"Hit Gemini 429 Rate Limit. "
                f"Retrying in {sleep_duration:.2f} seconds... (Error: {e.message})"
            )
            
            await asyncio.sleep(sleep_duration)

    # 3. Explicit Type Guards: Ensure response structures are completely safe and loaded
    if not response or not response.candidates or not response.candidates[0].content:
        raise RuntimeError("Image generation failed: Empty response payload returned from Gemini.")

    parts = response.candidates[0].content.parts
    if not parts:
        raise RuntimeError("Image generation failed: No content blocks found inside the response object.")

    # 4. Safely loop through verified content part objects
    for part in parts:
        if part.inline_data and part.inline_data.data:
            # Type checker is satisfied here because data existence has been validated
            return part.inline_data.data
        
    raise RuntimeError("Image generation failed or returned empty content blocks")