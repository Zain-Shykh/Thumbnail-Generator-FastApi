import os
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from schemas import CreateJobRequest, CreateJobResponse, ThumbnailResponse, JobResponse
from sqlmodel import Session, select
from database import get_session
from models import Job, Thumbnail
from services.generator import process_job, STYLE_ORDER
from services.imagekit_services import upload_file, get_variants

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

@router.post("/upload-headshot")
async def upload_headshot(file: UploadFile = File(...)):
    contents = await file.read()
    url = upload_file(
        file_bytes=contents,
        file_name=file.filename,
        folder="/headshots",
        content_type=file.content_type or "image/png",
    )
    return {"url": url}

@router.post("/jobs", response_model=CreateJobResponse)
async def create_job(request: CreateJobRequest, session: Session = Depends(get_session)):
    if request.num_thumbnails < 1 or request.num_thumbnails > 3:
        raise HTTPException(status_code=400, detail="num_thumbnails must be between 1 and 3")
    
    job = Job(prompt=request.prompt, num_thumbnails=request.num_thumbnails, headshot_url=request.headshot_url)
    session.add(job)

    styles = STYLE_ORDER[:request.num_thumbnails]
    for style in styles:
        thumbnail = Thumbnail(job_id=job.id, style_name=style)
        session.add(thumbnail)

    session.commit()

    # fire and forget style generation

    asyncio.create_task(process_job(job.id))

    return CreateJobResponse(job_id=job.id)


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, session: Session = Depends(get_session)):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    thumbnails = session.exec(select(Thumbnail).where(Thumbnail.job_id == job_id)).all()
    
    thumb_responses = []
    for t in thumbnails:
        variants = get_variants(t.imagekit_url) if t.imagekit_url else None
        thumb_responses.append(ThumbnailResponse(
            id=t.id,
            style_name=t.style_name,
            status=t.status,
            imagekit_url=t.imagekit_url,
            error_message=t.error_message,
            variants=variants
        ))

    return JobResponse(
        id=job.id,
        prompt=job.prompt,
        num_thumbnails=job.num_thumbnails,
        headshot_url=job.headshot_url,
        status=job.status,
        thumbnails=thumb_responses,
    )