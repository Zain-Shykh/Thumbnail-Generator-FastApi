const STYLES = {
  ready: {
    label: "Ready",
    border: "border-emulsion",
    text: "text-emulsion",
    dot: "bg-emulsion",
  },
  developing: {
    label: "Developing",
    border: "border-brass",
    text: "text-brass",
    dot: "bg-brass animate-pulse",
  },
  pending: {
    label: "Queued",
    border: "border-paper-dim",
    text: "text-paper-dim",
    dot: "bg-paper-dim",
  },
  failed: {
    label: "Failed",
    border: "border-safelight",
    text: "text-safelight",
    dot: "bg-safelight",
  },
};

/**
 * A tilted, double-ruled ink stamp — the signature visual motif.
 * status: "ready" | "developing" | "pending" | "failed"
 */
export default function StatusStamp({ status = "pending", className = "" }) {
  const s = STYLES[status] ?? STYLES.pending;

  return (
    <div
      className={`stamp inline-flex items-center gap-2 rounded-sm border-2 ${s.border} ${s.text}
        px-2.5 py-1 text-[11px] font-semibold -rotate-3 bg-charcoal/70 backdrop-blur-sm
        shadow-[inset_0_0_0_1px_rgba(237,228,211,0.08)] ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </div>
  );
}