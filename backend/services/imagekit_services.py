from config import IMAGE_KIT_PRIVATE_KEY, IMAGE_KIT_URL_ENDPOINT
from imagekitio import ImageKit

imagekit = ImageKit(
    private_key=IMAGE_KIT_PRIVATE_KEY)


def upload_file(file_bytes:bytes, file_name:str, folder:str, content_type:str = "image/png") -> str:
    """ upload a file to imagekit and return the cdn url of the uploaded file """
    result = imagekit.files.upload(
        file=(file_bytes, file_name, content_type),
        file_name=file_name,
        folder=folder,
        is_private_file=False,
        use_unique_file_name=True,
    )

    return result.url

def get_variants(base_url: str) -> dict:
    """return 3 size variant URLs for the given base_url using ImageKit transformations"""
    return{
        "youtube": f"{base_url}?tr=w-1280,h-720, c-maintain_ratio, fo-auto",
        "shorts": f"{base_url}?tr=w-1080,h-1920, c-maintain_ratio, fo-auto",
        "square": f"{base_url}?tr=w-1080,h-1080, c-maintain_ratio, fo-auto"
    }