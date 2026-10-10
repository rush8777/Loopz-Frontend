export const VIDEO = { width: 1920, height: 1080, fps: 30, frames: 600 } as const;
export const SHOTS = [
  { name: "Problem", start: 0, end: 84 },
  { name: "Analytics", start: 84, end: 192 },
  { name: "Audience", start: 192, end: 294 },
  { name: "Guidance", start: 294, end: 450 },
  { name: "Results", start: 450, end: 540 },
  { name: "Closing", start: 540, end: 600 },
] as const;
