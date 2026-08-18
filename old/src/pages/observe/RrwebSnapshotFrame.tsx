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
  width,
  height,
  onError,
}: {
  snapshotNode: SnapshotNode;
  width: number;
  height: number;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setReady(false);

    let iframe: HTMLIFrameElement | null = null;
    const safeSnapshot = sanitizeSnapshot(snapshotNode);

    try {
      const result = rebuildIntoSandboxedIframe(safeSnapshot ?? snapshotNode, {
        root: container,
        cache: createCache(),
        mirror: createMirror(),
      });
      iframe = result.iframe;
      iframe.style.width = `${width}px`;
      iframe.style.height = `${height}px`;
      iframe.style.border = "none";
      iframe.style.display = "block";
      iframe.style.pointerEvents = "none";
      setReady(true);
    } catch (err) {
      console.error(err);
      onError("Couldn't reconstruct this session's page snapshot.");
    }

    return () => {
      iframe?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotNode, width, height]);

  return (
    <div
      ref={containerRef}
      style={{ width, height, background: "#fff", opacity: ready ? 1 : 0, transition: "opacity 0.15s ease" }}
    />
  );
}