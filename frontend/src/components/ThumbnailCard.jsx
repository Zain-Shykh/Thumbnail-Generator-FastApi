import { useState } from "react";
import StatusStamp from "./StatusStamp";

function frameLabel(index) {
  return `F-${String(index + 1).padStart(2, "0")}`;
}

export default function ThumbnailCard({ index, thumbnail }) {
  const [copied, setCopied] = useState(false);
  const [activeVariant, setActiveVariant] = useState(null);

  const status = thumbnail?.status ?? "pending";
  const variantEntries = thumbnail?.variants ? Object.entries(thumbnail.variants) : [];
  const imageUrl =
    (activeVariant && thumbnail?.variants?.[activeVariant]) || thumbnail?.imagekit_url;

  async function copyUrl() {
    if (!imageUrl) return;
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable — fail silently, link is still viewable/right-clickable.
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-md bg-panel border border-panel-line">
      {/* frame number tab */}
      <div className="absolute left-2 top-2 z-10 font-mono text-[10px] text-paper-dim/80 bg-charcoal/70 backdrop-blur-sm px-1.5 py-0.5 rounded-sm">
        {frameLabel(index)}
      </div>

      <StatusStamp status={status} className="absolute right-2 top-2 z-10" />

      <div className="aspect-square w-full relative bg-charcoal-2">
        {status === "ready" && imageUrl && (
          <img
            src={imageUrl}
            alt={thumbnail.style_name ?? `Generated thumbnail ${index + 1}`}
            className="h-full w-full object-cover animate-develop"
          />
        )}

        {status === "failed" && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="font-display text-3xl text-safelight-dim">×</span>
            <p className="text-xs text-paper-dim leading-snug">
              {thumbnail?.error || thumbnail?.reason || "This frame didn't develop. The lab lost the exposure."}
            </p>
          </div>
        )}

        {(status === "pending" || status === "developing") && (
          <div className="relative h-full w-full overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-charcoal-2),var(--color-panel))]" />
            <div className="absolute inset-x-0 top-0 h-1/3 bg-brass/10 animate-scan" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-[10px] text-paper-dim/60 tracking-widest">
                {status === "developing" ? "DEVELOPING…" : "IN QUEUE"}
              </span>
            </div>
          </div>
        )}

        {/* hover overlay, ready state only */}
        {status === "ready" && (
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-charcoal/95 via-charcoal/10 to-transparent
            opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3">
            <p className="font-display text-sm text-paper truncate mb-2">{thumbnail.style_name}</p>

            {variantEntries.length > 1 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {variantEntries.map(([size]) => (
                  <button
                    key={size}
                    onClick={() => setActiveVariant(size)}
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm border transition-colors
                      ${activeVariant === size || (!activeVariant && size === variantEntries[0][0])
                        ? "border-brass text-brass"
                        : "border-panel-line text-paper-dim hover:border-paper-dim"}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={copyUrl}
                className="flex-1 rounded-sm bg-paper text-charcoal text-xs font-semibold py-1.5
                  hover:bg-brass transition-colors"
              >
                {copied ? "Copied ✓" : "Copy CDN URL"}
              </button>
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-sm border border-paper-dim/40 px-3 py-1.5 text-xs text-paper-dim
                  hover:text-paper hover:border-paper transition-colors"
              >
                View
              </a>
            </div>
          </div>
        )}
      </div>

      {status !== "ready" && (
        <div className="px-3 py-2">
          <p className="font-mono text-[11px] text-paper-dim/70 truncate">
            {thumbnail?.style_name ?? "awaiting style assignment"}
          </p>
        </div>
      )}
    </div>
  );
}