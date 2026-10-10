export const VIDEO = { width: 1920, height: 1080, fps: 30, frames: 600 } as const;
export const SHOTS = [
  { name: "Hook", start: 0, end: 90 },
  { name: "Understand", start: 90, end: 180 },
  { name: "Target", start: 180, end: 270 },
  { name: "Guide", start: 270, end: 390 },
  { name: "Measure", start: 390, end: 480 },
  { name: "Brand", start: 480, end: 600 },
] as const;
