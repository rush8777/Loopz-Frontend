import { bundle } from '@remotion/bundler';
import { openBrowser, selectComposition, renderStill, renderMedia } from '@remotion/renderer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const renders = resolve(root, 'renders');
const qa = resolve(root, 'out/qa');
const assets = resolve(root, '../website/public/videos/hero');
mkdirSync(renders, {recursive:true}); mkdirSync(qa, {recursive:true}); mkdirSync(assets, {recursive:true});
const serveUrl = await bundle({ entryPoint: resolve(root, 'src/index.ts'), publicDir: resolve(root, 'public'), outDir: resolve(root, 'out/bundle') });
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || undefined;
const chromiumOptions = { gl: 'swangle', enableMultiProcessOnLinux: !process.env.REMOTION_SINGLE_PROCESS };
const browser = await openBrowser('chrome', {browserExecutable, chromiumOptions});
try {
  const composition = await selectComposition({serveUrl, id:'MovcuesHeroStory', puppeteerInstance:browser, chromiumOptions});
  if(composition.durationInFrames !== 600 || composition.fps !== 30) throw new Error('Timeline contract failed');
  const common = {serveUrl, composition, puppeteerInstance:browser, chromiumOptions};
  const samples = [0,35,83,84,120,180,191,192,220,293,294,320,365,410,449,450,475,539,540,550,599];
  for(const frame of process.argv.includes('--posters-only') || process.argv.includes('--video-only') ? [] : samples) {
    await renderStill({...common, frame, output:resolve(qa,`${String(frame).padStart(3,'0')}.png`), imageFormat:'png', scale:2/3});
    console.log(`Inspected frame export: ${frame}`);
  }
  if(!process.argv.includes('--video-only')) {
    const mobileComposition = await selectComposition({serveUrl, id:'MovcuesHeroStory', inputProps:{mobilePoster:true}, puppeteerInstance:browser, chromiumOptions});
    await renderStill({...common, composition:{...mobileComposition,width:960,height:720}, inputProps:{mobilePoster:true}, frame:365, output:resolve(qa,'poster-mobile.png'), imageFormat:'png'});
    for(const [source,target] of [['365.png','movcues-hero-poster.webp'],['poster-mobile.png','movcues-hero-mobile.webp']]) execFileSync('ffmpeg',['-y','-i',resolve(qa,source),'-c:v','libwebp','-q:v','88','-compression_level','6',resolve(assets,target)],{stdio:'ignore'});
  }
  if(process.argv.includes('--stills-only') || process.argv.includes('--posters-only')) process.exitCode = 0;
  else {
    const master=resolve(renders,'movcues-hero-master.mp4');
    let last = -1;
    await renderMedia({...common, outputLocation:master, codec:'h264', crf:17, pixelFormat:'yuv420p', concurrency:1, disableSharedMemoryCapture:Boolean(browserExecutable), disallowParallelEncoding:true, onProgress:({progress,renderedFrames,encodedFrames})=>{const bucket=Math.floor(progress*20);if(bucket!==last){last=bucket;console.log(`Master rendering: ${Math.round(progress*100)}% · ${renderedFrames} frames rendered · ${encodedFrames} encoded`);}}});
    execFileSync('ffmpeg',['-y','-i',master,'-vf','scale=1280:720:flags=lanczos','-c:v','libx264','-preset','veryslow','-crf','24','-pix_fmt','yuv420p','-an','-map_metadata','-1','-movflags','+faststart',resolve(assets,'movcues-hero-web.mp4')],{stdio:'inherit'});
    writeFileSync(resolve(renders,'render-manifest.json'),JSON.stringify({composition:'MovcuesHeroStory',width:1920,height:1080,fps:30,frames:600,duration:20,web:{width:1280,height:720},posterFrame:365,samples},null,2)+'\n');
  }
} finally {await browser.close({silent:true});}
