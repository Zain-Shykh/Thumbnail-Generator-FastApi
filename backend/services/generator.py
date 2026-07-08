import asyncio
import logging
from sqlmodel import Session, select
from database import engine
from models import Job, Thumbnail
from services.gemini_service import generate_thumbnail
from services.imagekit_services import upload_file


logger = logging.getLogger(__name__)

STYLES = {
    "bold_dramatic": (
        "Create a bold, dramatic youtube thubnail with high contrast colors, dynamic composition, and cinematic lighting. "
        "dark moody background and powerful composition"
        "the person face should be prominent with a dramatic expression"
    ),
    "clean_minimal":(
        "Create a clean, minimal youtube thunbnail with bright lighting"
        "light background, modern professional aesthetic, sharp clean composition" 
        "The person should look approachable and professional"
    ),
    "vibrant_energetic":(
        "Create a vibrant, energetic youtube thumbnail with colorful gradients "
        "The person should look excited and engaging expression"
        "dynamic angles, eye-catching, pop art style colors, and energetic"
    
    )
}

STYLE_ORDER = ["bold_dramatic", "clean_minimal", "vibrant_energetic"]


async def generate_single_thumbnail(thumbnail_id: str, prompt: str, headshort_url: str):
    # Fetch style information and update status to generating
    with Session(engine) as session:
        thumb = session.get(Thumbnail, thumbnail_id)
        if not thumb:
            logger.error(f"Thumbnail ID {thumbnail_id} not found.")
            return
        thumb.status = "generating"
        style_name = thumb.style_name
        session.add(thumb)
        session.commit()
        style_prompt = STYLES[style_name]

    # AI Call & Upload Execution Flow
    try:
        # 1. Trigger the actual Gemini Client call
        image_byte = await generate_thumbnail(prompt, style_prompt, headshort_url)
        
        with Session(engine) as session:
            thumb = session.get(Thumbnail, thumbnail_id)
            job_id = thumb.job_id
            
        # 2. Upload raw bytes to ImageKit
        url = upload_file(
            file_bytes=image_byte,
            file_name=f"{thumbnail_id}.png",
            folder_path=f"thumbnails/{job_id}/",
        )
        
        # 3. Save URL on success
        with Session(engine) as session:
            thumb = session.get(Thumbnail, thumbnail_id)
            thumb.imagekit_url = url
            thumb.status = "uploaded"
            session.add(thumb)
            session.commit()
        logger.info(f"Thumbnail {thumbnail_id} generated and uploaded successfully.")
        
    except Exception as e:
        logger.error(f"Error generating thumbnail {thumbnail_id}: {e}")
        
        # 🟢 FIX: Open a dedicated, locked session to write and flush the error immediately
        with Session(engine) as session:
            thumb = session.get(Thumbnail, thumbnail_id)
            if thumb:
                thumb.status = "error"
                # Store clean string interpretation of the 429 response
                thumb.error_message = str(e)[:500]  
                session.add(thumb)
                session.commit()  # Forces data out of Python memory straight into the DB file
                logger.info(f"Successfully saved failure state for Thumbnail {thumbnail_id}")


# async def process_job(job_id: str):
#     #make job as processing
#     #find all thumbnails for this job
#     # start one worker for each thumbnail
#     #wait for all workers to finish
#     #mark job as completed/failed

#     with Session(engine) as session:
#         job = session.get(Job, job_id)
#         job.status = "processing"
#         prompt = job.prompt
#         headshot_url = job.headshot_url
#         session.add(job)
#         session.commit()
#     thumbnails = session.exec(select(Thumbnail).where(Thumbnail.job_id == job_id)).all()
#     thumbnails_ids = [thumb.id for thumb in thumbnails]

#     tasks = [
#         generate_single_thumbnail(thumbnail_id=thumb_id, prompt=prompt, headshort_url=headshot_url)
#         for thumb_id in thumbnails_ids
#     ]

#     for task in tasks:
#         await task
#         logger.info("Waiting 15 seconds before hitting Gemini again...")
#         await asyncio.sleep(15)

#     with Session(engine) as session:
#         thumbnails = session.exec(select(Thumbnail).where(Thumbnail.job_id == job_id)).all()
#         all_failed = all(thumb.status == "error" or thumb.status == "failed" for thumb in thumbnails)
#         job = session.get(Job, job_id)
#         job.status = "failed" if all_failed else "completed"
#         session.add(job)
#         session.commit()

async def process_job(job_id: str):
    """
    Processes a thumbnail generation job by running style variations sequentially 
    to respect the Gemini Free Tier TPM/RPM limits, updating statuses gracefully.
    """
    logger.info(f"Starting background job process for Job ID: {job_id}")

    # 1. Mark Master Job as processing and fetch reference details
    with Session(engine) as session:
        job = session.get(Job, job_id)
        if not job:
            logger.error(f"Job {job_id} not found in database.")
            return
            
        job.status = "processing"
        prompt = job.prompt
        headshot_url = job.headshot_url
        session.add(job)
        session.commit()

    # 2. Fetch all child thumbnails linked to this job
    with Session(engine) as session:
        thumbnails = session.exec(select(Thumbnail).where(Thumbnail.job_id == job_id)).all()
        thumbnail_ids = [thumb.id for thumb in thumbnails]

    logger.info(f"Found {len(thumbnail_ids)} thumbnail variations to generate for Job {job_id}")

    # 3. Process each thumbnail variation sequentially with pacing delay
    for index, thumb_id in enumerate(thumbnail_ids):
        logger.info(f"Executing worker for thumbnail {thumb_id} ({index + 1}/{len(thumbnail_ids)})...")
        
        # Execute the single thumbnail worker directly
        await generate_single_thumbnail(
            thumbnail_id=thumb_id, 
            prompt=prompt, 
            headshort_url=headshot_url
        )
        
        # Only sleep if there are more thumbnail variations left in the queue
        if index < len(thumbnail_ids) - 1:
            logger.info("Pacing active. Waiting 15 seconds before launching next Gemini style variation...")
            await asyncio.sleep(15)

    # 4. Compute final overall master Job status based on individual results
    with Session(engine) as session:
        # Re-fetch the fresh records from the database to look at the updated statuses
        updated_thumbnails = session.exec(select(Thumbnail).where(Thumbnail.job_id == job_id)).all()
        
        any_failed = any(thumb.status in ["error", "failed"] for thumb in updated_thumbnails)
        all_failed = all(thumb.status in ["error", "failed"] for thumb in updated_thumbnails)
        
        job = session.get(Job, job_id)
        
        if all_failed:
            logger.error(f"All variations failed for Job {job_id}. Marking Master Job as failed.")
            job.status = "failed"
        elif any_failed:
            logger.warning(f"Some variations failed for Job {job_id}. Marking Master Job as failed to alert frontend.")
            job.status = "failed"  # Frontend will stop spinner and show which individual styles failed
        else:
            logger.info(f"All thumbnail variations successfully processed for Job {job_id}.")
            job.status = "completed"
            
        session.add(job)
        session.commit()