import { useRef, useState } from "react";
import { uploadHeadshot, createjob } from "../api";

const FRAME_COUNTS = [1,2,3];

export default function UploadForm({ onJobCreated }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [numThumbnails, setNumThumbnails] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState("idle"); // idle | uploading | creating | error
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef(null);

  function handleFile(selected) {
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file || !prompt.trim() || stage === "uploading" || stage === "creating") return;

    setErrorMessage("");
    try {
      setStage("uploading");
      const uploadResult = await uploadHeadshot(file);
      // Backend upload-response shape wasn't in the provided schemas —
      // this covers the likely field names defensively.
      const headshotUrl = uploadResult.url || uploadResult.headshot_url || uploadResult.imagekit_url;

      setStage("creating");
      const { job_id } = await createjob({ prompt: prompt.trim(), numThumbnails, headshotUrl });

      onJobCreated({ jobId: job_id, prompt: prompt.trim(), numThumbnails, headshotUrl });
    } catch (err) {
      setStage("error");
      setErrorMessage(err?.message || "Something went wrong in the lab. Try again.");
    }
  }

  const isBusy = stage === "uploading" || stage === "creating";

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <p className="stamp text-xs text-brass mb-2 tracking-[0.25em]">Contact Sheet Studio</p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-paper">
          Load a roll, get a proof sheet.
        </h1>
        <p className="mt-3 text-sm text-paper-dim">
          Upload a headshot, describe the shot, and we'll develop a set of thumbnail variations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-md bg-panel border border-panel-line p-5 sm:p-7">
        {/* headshot dropzone */}
        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-paper-dim">
            Headshot
          </label>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative flex aspect-[3/2] cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed transition-colors
              ${isDragging ? "border-brass bg-brass/5" : "border-panel-line bg-charcoal-2 hover:border-paper-dim"}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {previewUrl ? (
              <img src={previewUrl} alt="Headshot preview" className="h-full w-full object-cover" />
            ) : (
              <div className="text-center px-4">
                <p className="font-display text-lg text-paper-dim">Drop a photo here</p>
                <p className="mt-1 text-xs text-paper-dim/60">or click to browse — JPG, PNG</p>
              </div>
            )}
            {previewUrl && (
              <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-charcoal/80 via-transparent to-transparent p-3 opacity-0 hover:opacity-100 transition-opacity">
                <span className="rounded-sm bg-charcoal/80 px-2 py-1 text-xs text-paper">Change photo</span>
              </div>
            )}
          </div>
        </div>

        {/* prompt */}
        <div>
          <label htmlFor="prompt" className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-paper-dim">
            Prompt
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Bold gaming thumbnail, neon rim light, dramatic expression, high contrast"
            className="w-full resize-none rounded-md border border-panel-line bg-charcoal-2 px-3 py-2.5 text-sm text-paper
              placeholder:text-paper-dim/50 focus:border-brass outline-none transition-colors"
          />
        </div>

        {/* frame count */}
        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-paper-dim">
            Frames to develop
          </label>
          <div className="flex flex-wrap gap-2">
            {FRAME_COUNTS.map((count) => (
              <button
                type="button"
                key={count}
                onClick={() => setNumThumbnails(count)}
                className={`rounded-sm border px-4 py-2 text-sm font-medium transition-colors
                  ${numThumbnails === count
                    ? "border-brass bg-brass/10 text-brass"
                    : "border-panel-line text-paper-dim hover:border-paper-dim"}`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {stage === "error" && (
          <div className="rounded-md border border-safelight/50 bg-safelight-dim/20 px-3 py-2 text-sm text-paper">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={!file || !prompt.trim() || isBusy}
          className="w-full rounded-md bg-paper py-3 font-display text-lg font-semibold text-charcoal
            transition-colors hover:bg-brass disabled:cursor-not-allowed disabled:opacity-40"
        >
          {stage === "uploading" && "Loading the film…"}
          {stage === "creating" && "Winding the roll…"}
          {(stage === "idle" || stage === "error") && "Start developing"}
        </button>
      </form>
    </div>
  );
}