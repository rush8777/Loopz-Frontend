# Movcues — Turn user behavior into action

A typography-led commercial built with Remotion, React, TypeScript, CSS and SVG. The public Astro page ships a native H.264 video with WebP posters; it does not ship the Remotion runtime.

## Production

From the repository root:

```sh
npm ci
npm run studio --workspace @movcues/hero-film
npm run typecheck --workspace @movcues/hero-film
npm run review-opening --workspace @movcues/hero-film
npm run render --workspace @movcues/hero-film
```

FFmpeg must be on PATH. Remotion uses Chrome Headless Shell by default. `REMOTION_BROWSER_EXECUTABLE` can select a compatible installed browser, and `REMOTION_SINGLE_PROCESS=1` supports constrained environments.

The opening study is a separate 120-frame, 1080p composition: the hook followed by its transformation into the investigation scene. Its script exports a four-second video and review stills before the remaining scenes are produced.

The full renderer exports 46 master review frames and 23 social review frames, posters, the master, web encode and social edit. Use `--stills-only`, `--video-only` or `--social-only` for focused iteration. Generated bundles and review images are in ignored `out/` directories.

## Direction and timeline

`MovcuesHeroStory`: 1920 × 1080, 30 FPS, 600 frames / 20 seconds. Ranges below are inclusive.

| Scene | Frames | Focal point and transformation |
|---|---|---|
| Hook | 0–89 | Oversized character reveals; users travel along a curved path and disappear; one surviving dot becomes a focus ring |
| Understand | 90–179 | Focus ring investigates a single interruption in a simplified journey, then collapses into a user |
| Target | 180–269 | One user expands into a geometric audience; a selected group connects and converges into an action |
| Guide | 270–389 | An action dot becomes a button with one contextual tooltip; a deliberate click becomes a completion check |
| Measure | 390–479 | The check transforms into an abstract progress path and a completion signal |
| Brand | 480–599 | The endpoint reveals the original Movcues logo and tagline; a circular mask returns to the opening |

The first and final master frames match for looping. `MovcuesSocial` is a separate 360-frame / 12-second edit with a stronger “Signed up. Then disappeared.” hook, accelerated scene clocks and a readable brand hold. It ends on the brand rather than looping.

All movement derives from the frame: no timers, CSS animations or unseeded randomness. `KineticType` coordinates word masks and character reveals; `ShapeLayers` supplies curved particle paths and localized five-sample camera motion blur. `VirtualCamera`, `SceneMasks`, `MorphPath` and `BrandReveal` provide reusable camera, portal, geometry and logo choreography. Only the guidance scene contains recognizable fictional product UI.

There are no outcome percentages or claims of improved retention, revenue or conversion. The abstract measurement illustration is labeled as illustrative. Product messaging covers behavior investigation, behavioral audiences, contextual guidance and evaluating what happens next.

## Exports

- `renders/movcues-hero-master.mp4`: 1080p H.264 master, CRF 17, 20 seconds.
- `../website/public/videos/hero/movcues-hero-web.mp4`: 720p H.264, CRF 24, veryslow compression, silent, fast start.
- `renders/movcues-social-12s.mp4`: 1080p H.264, CRF 20, silent, fast start.
- `../website/public/videos/hero/movcues-hero-poster.webp`: selected audience at frame 230.
- `../website/public/videos/hero/movcues-hero-mobile.webp`: separately composed 960 × 720 brand and behavior illustration.
- `renders/render-manifest.json`: composition contracts and review-frame lists.

Review actual encoded videos as well as stills. Inspect scene boundaries, text holds, tooltip masking, cursor click, check-to-path continuity, logo reveal and the master loop seam. A successful TypeScript check alone does not validate the film.

The film communicates silently. Optional narration can follow the scene headlines; restrained sound cues can accompany disappearing dots, focus, audience selection, the click and brand reveal. No third-party music or audio is included.

## Website and assets

The landing page preserves its HTML headline, waitlist CTA, descriptive caption and timestamped transcript. VideoObject metadata describes the film and links directly to its poster and MP4. Preview builds use their preview origin and remain noindex; main-branch builds use the production origin. Update the first-publication date if production publication happens later. Structured data does not guarantee a video search appearance.

Mobile and reduced-motion visitors receive a poster without requesting the MP4. No-JavaScript, blocked video, unsupported codec and autoplay-denied states retain the illustration and caption. Playback pauses offscreen and when the tab is hidden; the explicit pause control remains respected.

GT Standard font files, the original Movcues logo and the existing navy / blue design tokens are reused. Render assets are local, so the film does not depend on third-party requests. All work belongs on `preview/hero-story-demo`; do not commit or push it to main.
