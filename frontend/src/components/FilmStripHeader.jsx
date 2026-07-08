import StatusStamp from "./StatusStamp";

/**
 * The header bar of the contact sheet: job prompt, frame count,
 * overall status, and a sprocket-hole strip bordering the sheet
 * top and bottom, like a real strip of film.
 */
export default function FilmStripHeader({ prompt, total, readyCount, failedCount, jobStatus, onNewJob }) {
  return (
    <div className="mb-6">
      <div className="flex flex-col gap-4 rounded-md bg-panel border border-panel-line p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="stamp text-xs text-brass mb-1 tracking-[0.2em]">Roll · {total} frame{total === 1 ? "" : "s"}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-tight text-paper truncate">
            {prompt}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="font-mono text-xs text-paper-dim text-right leading-snug">
            <div><span className="text-emulsion">{readyCount}</span> ready · <span className="text-safelight">{failedCount}</span> failed</div>
            <div className="text-paper-dim/70">of {total} total</div>
          </div>
          <StatusStamp
            status={jobStatus === "completed" ? "ready" : jobStatus === "error" ? "failed" : "developing"}
            className="rotate-2"
          />
          <button
            onClick={onNewJob}
            className="rounded-sm border border-panel-line bg-charcoal px-3 py-2 text-xs font-medium text-paper-dim
              hover:text-paper hover:border-brass transition-colors"
          >
            New roll
          </button>
        </div>
      </div>

      <div className="h-2 sprocket-row bg-panel-line rounded-b-sm" aria-hidden="true" />
    </div>
  );
}