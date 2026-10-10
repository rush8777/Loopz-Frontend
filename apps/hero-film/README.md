# Movcues — From friction to action

An isolated Remotion production workspace. No Remotion or player code is shipped to the Astro homepage. The website uses a native H.264 video and WebP posters.

## Production

From the repository root:

```sh
npm ci
npm run studio --workspace @movcues/hero-film
npm run typecheck --workspace @movcues/hero-film
npm run render --workspace @movcues/hero-film
```

FFmpeg must be on PATH. Remotion uses Chrome Headless Shell by default; `REMOTION_BROWSER_EXECUTABLE` can point to an existing compatible browser. `REMOTION_SINGLE_PROCESS=1` is available for constrained render environments.

The renderer exports review stills first, then a master, a compressed web version, and two posters. Run `node apps/hero-film/scripts/render.mjs --stills-only` to review the composition before a full render. Generated bundles and review frames live in the ignored `out` directory.

## Exact timeline

Composition `MovcuesHeroStory`: 1920 × 1080, 30 FPS, exactly 600 frames / 20 seconds. End frames are exclusive.

| Shot | Range | Direction |
|---|---|---|
| Problem | 0–84 | Two masked headline reveals; atmospheric dashboard only |
| Understand | 84–192 | One analytics screen; proportional 1000 / 620 / 340 funnel; 280-user insight |
| Target | 192–294 | One team-configured audience; two event rules; 280 matching users |
| Guide | 294–450 | Acme Workspace; anchored tooltip; cursor clicks its visible CTA; project created |
| Measure | 450–540 | One results screen; 120 viewed / 78 completed / 65% completion |
| Closing | 540–600 | Brand and tagline; fade to the same opening background |

All choreography derives from the current frame. There are no timers, CSS keyframes, playback history, or unseeded random values. Sequences unmount previous interfaces. There is deliberately no inferred activation lift or automatic segment publishing.

## Outputs

- `renders/movcues-hero-master.mp4`: H.264 master, 1920 × 1080, CRF 17.
- `../website/public/videos/hero/movcues-hero-web.mp4`: H.264, 1280 × 720, CRF 24, veryslow compression, no audio, fast-start metadata. The reviewed export is 615,953 bytes (about 602 KiB).
- `../website/public/videos/hero/movcues-hero-poster.webp`: full guidance scene at frame 365.
- `../website/public/videos/hero/movcues-hero-mobile.webp`: separately composed 960 × 720 static guidance illustration.
- `renders/render-manifest.json`: timeline and review-frame metadata.

The mobile poster is a separate close view with larger typography rather than a scaled-down collection of panels. Mobile and reduced-motion visitors do not request the MP4. JavaScript-disabled, blocked-video, unsupported-codec, and autoplay-denied states retain the still illustration and semantic caption. Video playback pauses offscreen and in hidden tabs; explicit pause is respected on return.

The homepage renders a readable timestamped transcript, descriptive image alt text, and VideoObject JSON-LD with a title, description, thumbnail, direct MP4 URL, duration and first publication date. These remain in the server-generated HTML. Preview metadata uses the preview origin and remains noindex; a main-branch build uses the production origin. Update the publication date if the video is first published to production on a later date. Structured data helps discovery but does not guarantee a video search result, particularly on a landing page where the video is supporting content.

The film uses the existing GT Standard UI font files referenced by the website tokens, fetched into `public/fonts` to keep rendering independent of third-party network availability. Colors mirror `packages/tokens/src/index.css`. The original homepage logo is copied unchanged from `apps/dashboard/public/movcues_logo.png` into the render workspace.
