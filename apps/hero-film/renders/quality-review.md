# Export review — 10 October 2026

The opening was developed and rendered as a separate four-second 1080p study before the remaining scenes were built. Its first review caught an early light wipe and a positional jump in the surviving dot. The revised export corrected both.

The complete film was reviewed using 46 master scene / transition stills, 23 social stills and six decoded frames per second from both finished MP4s. Follow-up corrections removed a clipped tooltip pointer, residual tooltip exit pixels and a social scene clock that stopped advancing after guidance.

The final master holds the specified messages, follows the dot / journey / audience / action / progress / brand sequence and contains only one recognizable fictional UI interaction. The social edit completes all six beats and holds on the brand. The film is silent and uses no third-party audio.

| Export | Dimensions | FPS | Frames | Duration | Size |
|---|---|---|---|---|---|
| Master | 1920 × 1080 | 30 | 600 | 20 s | 1,843,671 bytes |
| Website | 1280 × 720 | 30 | 600 | 20 s | 404,090 bytes |
| Social | 1920 × 1080 | 30 | 360 | 12 s | 904,828 bytes |
| Desktop WebP | 1280 × 720 | — | — | — | 16,038 bytes |
| Mobile WebP | 960 × 720 | — | — | — | 23,678 bytes |

All MP4s decode without FFmpeg errors, contain H.264 video without audio, and place the metadata atom before media data for fast start. The source opening and final master frames match. The encoded loop seam has a mean RGB error below 0.064 / 255 per channel.

Remotion Studio loaded the composition at 1920 × 1080 / 30 FPS / 20 seconds. The film TypeScript check passed. Astro checked 63 files with no errors, warnings or hints and built 26 static pages.

Actual Chromium H.264 playback completed the full 20 seconds and looped. Pause / play, offscreen pause, 390 px and 320 px mobile layouts, reduced motion, blocked MP4 and no-JavaScript poster fallbacks passed with no page runtime errors. The 12-second social MP4 played to the final brand hold without errors. The waitlist dialog still opens and closes correctly.

The server-generated page retains the HTML headline, waitlist CTA, descriptive caption, complete timestamped transcript and VideoObject metadata. Preview assets use the preview origin, the preview stays noindex, and no Remotion runtime appears in the public page.

The Reddit post text was accessible, but playback of its reference video was blocked by Reddit network security. The visual direction follows the supplied brief; exact timing against that reference was not assessed.
