const API_BASE = "/api";

export async function uploadHeadshot(file){
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/upload-headshot`, {
        method:"POST",
        body:form,
    });
    if (!res.ok){
        throw new Error("failed to upload headshot");
    }
    return res.json();
}


export async function createjob({prompt, numThumbnails, headshotUrl}){
    console.log("Creating job with prompt:", prompt, "numThumbnails:", numThumbnails, "headshotUrl:", headshotUrl);
    const res = await fetch(`${API_BASE}/jobs`, {
        method: "POST",
        headers:{
            "Content-Type":"application/json",
        },
        body:JSON.stringify({
            prompt,
            num_thumbnails:numThumbnails,
            headshot_url: headshotUrl,
        }),
    });
    if(!res.ok){
        throw new Error("failed to create job");
    }
    return res.json();
}


export async function subscribeToJob(jobId, 
    {onThumbnailReady, onThumbnailFailed, onJobComplete, onError})
    {
        const es = new EventSource(`${API_BASE}/jobs/${jobId}/stream`);
        es.addEventListener("thumbnail_ready", (event) => {
            onThumbnailReady(JSON.parse(event.data));
        });
        es.addEventListener("thumbnail_failed", (event) => {
            onThumbnailFailed(JSON.parse(event.data));
        });
        es.addEventListener("job_completed", (event) => {
            onJobComplete(JSON.parse(event.data));
            es.close();
        });
        es.addEventListener("error", (event) => {
            onError(event);
            es.close();
        });
    }
