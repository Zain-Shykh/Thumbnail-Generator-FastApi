import { useEffect, useRef, useState } from "react";
import { subscribeToJob } from "../api";
import FilmStripHeader from "./FilmStripHeader";
import ThumbnailCard from "./ThumbnailCard";

/**
 * Reconciles SSE events into an ordered contact sheet.
 * Thumbnails are keyed by id as they arrive; slots that haven't
 * produced an event yet render as empty "in queue" frames so the
 * grid never jumps around as results stream in.
 */
export default function JobDashboard({ job, onNewJob }) {
  const [thumbnailsById, setThumbnailsById] = useState({});
  const [order, setOrder] = useState([]);
  const [jobStatus, setJobStatus] = useState("running"); // running | completed | error
  const [connectionError, setConnectionError] = useState(false);
  const hasSubscribed = useRef(false);

  useEffect(() => {
    // Guards against React StrictMode's dev-only double effect invocation.
    // Note: subscribeToJob doesn't hand back its EventSource, so the stream
    // can't be explicitly torn down on unmount — it closes itself on
    // "job_completed" or "error", which covers the normal lifecycle here.
    if (hasSubscribed.current) return;
    hasSubscribed.current = true;

    setConnectionError(false);

    subscribeToJob(job.jobId, {
      onThumbnailReady: (data) => {
        upsertThumbnail(data.id, { ...data, status: "ready" });
      },
      onThumbnailFailed: (data) => {
        upsertThumbnail(data.id, { ...data, status: "failed" });
      },
      onJobComplete: (data) => {
        if (Array.isArray(data?.thumbnails)) {
          const byId = {};
          const ids = [];
          data.thumbnails.forEach((t) => {
            byId[t.id] = t;
            ids.push(t.id);
          });
          setThumbnailsById(byId);
          setOrder(ids);
        }
        setJobStatus("completed");
      },
      onError: () => {
        setConnectionError(true);
        setJobStatus((prev) => (prev === "completed" ? prev : "error"));
      },
    });
  }, [job.jobId]);

  function upsertThumbnail(id, data) {
    setThumbnailsById((prev) => ({ ...prev, [id]: data }));
    setOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function retryConnection() {
    hasSubscribed.current = false;
    setConnectionError(false);
    // Re-trigger the effect by forcing a fresh subscribe pass.
    hasSubscribed.current = true;
    subscribeToJob(job.jobId, {
      onThumbnailReady: (data) => upsertThumbnail(data.id, { ...data, status: "ready" }),
      onThumbnailFailed: (data) => upsertThumbnail(data.id, { ...data, status: "failed" }),
      onJobComplete: (data) => {
        if (Array.isArray(data?.thumbnails)) {
          const byId = {};
          const ids = [];
          data.thumbnails.forEach((t) => {
            byId[t.id] = t;
            ids.push(t.id);
          });
          setThumbnailsById(byId);
          setOrder(ids);
        }
        setJobStatus("completed");
      },
      onError: () => setConnectionError(true),
    });
  }

  const readyCount = order.filter((id) => thumbnailsById[id]?.status === "ready").length;
  const failedCount = order.filter((id) => thumbnailsById[id]?.status === "failed").length;

  const slots = Array.from({ length: job.numThumbnails }, (_, i) => {
    const id = order[i];
    return id ? thumbnailsById[id] : null;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <FilmStripHeader
        prompt={job.prompt}
        total={job.numThumbnails}
        readyCount={readyCount}
        failedCount={failedCount}
        jobStatus={jobStatus}
        onNewJob={onNewJob}
      />

      {connectionError && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-safelight/50 bg-safelight-dim/20 px-4 py-3">
          <p className="text-sm text-paper">
            Connection to the lab dropped. Frames already developed are safe.
          </p>
          <button
            onClick={retryConnection}
            className="shrink-0 rounded-sm border border-safelight px-3 py-1.5 text-xs font-semibold text-paper hover:bg-safelight/20 transition-colors"
          >
            Reconnect
          </button>
        </div>
      )}

      <div className="rounded-md bg-charcoal-2 border border-panel-line p-4 sm:p-6">
        <div className="h-2 sprocket-row bg-panel-line rounded-t-sm mb-4" aria-hidden="true" />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {slots.map((thumbnail, i) => (
            <ThumbnailCard key={order[i] ?? `pending-${i}`} index={i} thumbnail={thumbnail} />
          ))}
        </div>

        <div className="h-2 sprocket-row bg-panel-line rounded-b-sm mt-4" aria-hidden="true" />
      </div>

      {jobStatus === "completed" && (
        <p className="mt-6 text-center font-mono text-xs text-paper-dim/70 tracking-widest">
          ROLL COMPLETE · {readyCount} DEVELOPED · {failedCount} LOST
        </p>
      )}
    </div>
  );
}