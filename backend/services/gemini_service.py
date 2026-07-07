# import base64
# from openai import AsyncOpenAI
# from config import GEMINI_API_KEY

# client = AsyncOpenAI(api_key=GEMINI_API_KEY)

# async def generate_thumbnail(prompt:str, style_prompt:str, headshot_url:str) -> bytes:
#     """pass the headshot url directly as an input image returns raw png bytes"""

#     full_prompt = (
#         f"{style_prompt}\n\n"
#         f"User request: {prompt}\n\n"
#         "IMPORTANT: The generated thumbnail must prominently feature the person"
#         "shown in provided reference headshot photo. Keep their likeness accurate"
#     )

#     response = await client.responses.create(
#         model="gpt-4o",
#         input=[
#             {
#                 "role": "user",
#                 "content": [
#                     {
#                         "type": "input_image",
#                         "url": headshot_url
#                     },
#                     {
#                         "type": "text",
#                         "text": full_prompt
#                     }
#                 ]
#             }
#         ],
#         tools=[{
#             "type":"image_generation",
#             "model":"gpt-image-2",
#             "size":"1536x1024",
#             "quality":"high",
#             "output_format":"png",
#             }],
#     )

#     for item in response.output:
#         if item.type == "image_generation_call" and item.result:
#             return base64.b64decode(item.result)
        
#     raise RuntimeError


import base64
import httpx
from google import genai
from google.genai import types
from config import GEMINI_API_KEY

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

    # 3. Explicit Type Guards: Ensure response structures are completely safe and loaded
    if not response.candidates or not response.candidates[0].content:
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