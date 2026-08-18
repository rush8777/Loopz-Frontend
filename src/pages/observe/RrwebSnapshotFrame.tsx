import { useEffect, useRef, useState } from "react";
import { rebuildIntoSandboxedIframe, createCache, createMirror } from "rrweb-snapshot";

type SnapshotNode = Parameters<typeof rebuildIntoSandboxedIframe>[0];

function sanitizeSnapshot(node: any): any {
  if (!node || typeof node !== "object") return node;
  const tag = (node.tagName || node.nodeName || "").toString().toLowerCase();
  if (tag === "script") return null;

  const copy: any = Array.isArray(node) ? [] : {};
  for (const key of Object.keys(node)) {
    const val = node[key];
    if (key === "childNodes" && Array.isArray(val)) {
      const children: any[] = [];
      for (const c of val) {
        const s = sanitizeSnapshot(c);
        if (s !== null) children.push(s);
      }
      copy[key] = children;
      continue;
    }
    if (key === "attributes" && val && typeof val === "object") {
      const attrs: any = {};
      for (const [aK, aV] of Object.entries(val)) {
        const lowerKey = aK.toLowerCase();
        if (lowerKey.startsWith("on")) continue;
        if (
          (lowerKey === "href" || lowerKey === "src") &&
          typeof aV === "string" &&
          aV.trim().toLowerCase().startsWith("javascript:")
        ) {
          continue;
        }
        attrs[aK] = aV;
      }
      copy[key] = attrs;
      continue;
    }
    copy[key] = sanitizeSnapshot(val);
  }
  return copy;
}

export function RrwebSnapshotFrame({
  snapshotNode,
  captureWidth,
  renderWidth,
  onDimensions,
  onError,
}: {
  snapshotNode: SnapshotNode;
  /** Width to lay the reconstructed document out at (its originally captured viewport width), so it reflows exactly as it did when captured. */
  captureWidth: number;
  /** Target on-screen width - the reconstructed document is scaled down to this via CSS transform, preserving its full-page layout. */
  renderWidth: number;
  /** Called once the document's true (captureWidth-relative) scrollWidth/scrollHeight are known, so the caller can size the outer wrapper and overlay canvas to match. */
  onDimensions: (naturalWidth: number, naturalHeight: number) => void;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setReady(false);

    let iframe: HTMLIFrameElement | null = null;
    let cancelled = false;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const safeSnapshot = sanitizeSnapshot(snapshotNode);

    try {
      const result = rebuildIntoSandboxedIframe(safeSnapshot ?? snapshotNode, {
        root: container,
        cache: createCache(),
        mirror: createMirror(),
      });
      iframe = result.iframe;
      iframe.style.border = "none";
      iframe.style.display = "block";
      iframe.style.pointerEvents = "none";
      iframe.style.position = "absolute";
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.transformOrigin = "top left";
      // Lay the document out at its originally captured width, with a
      // generous starting height so nothing clips before we measure the
      // real content height below.
      iframe.style.width = `${captureWidth}px`;
      iframe.style.height = "20000px";

      // Reads the reconstructed document's actual full-page size at
      // captureWidth, then (1) shrinks the iframe down to exactly that
      // height so it no longer carries its own internal scrollbar or
      // trailing blank space, and (2) CSS-scales the whole iframe down to
      // renderWidth so the outer page can display it at a sane size
      // without altering the captured content or its layout.
      const measure = () => {
        if (cancelled || !iframe) return;
        const doc = iframe.contentDocument;
        if (!doc || !doc.documentElement) return;
        const naturalHeight = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0, 1);
        const naturalWidth = Math.max(doc.documentElement.scrollWidth, doc.body?.scrollWidth ?? 0, captureWidth);

        iframe.style.height = `${naturalHeight}px`;
        iframe.style.width = `${naturalWidth}px`;
        const scale = renderWidth / naturalWidth;
        iframe.style.transform = `scale(${scale})`;

        onDimensions(naturalWidth, naturalHeight);
        setReady(true);
      };

      // The snapshot is synchronous DOM, but web fonts/images can still
      // shift layout after first paint - measure once on the next frame,
      // then once more shortly after to catch that settling without
      // polling indefinitely.
      requestAnimationFrame(measure);
      settleTimer = setTimeout(measure, 300);
    } catch (err) {
      console.error(err);
      onError("Couldn't reconstruct this session's page snapshot.");
    }

    return () => {
      cancelled = true;
      if (settleTimer) clearTimeout(settleTimer);
      iframe?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotNode, captureWidth, renderWidth]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#fff",
        opacity: ready ? 1 : 0,
        transition: "opacity 0.15s ease",
      }}
    />
  );
}