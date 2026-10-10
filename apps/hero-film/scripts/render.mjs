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
  const samples = [0,8,28,50,70,78,86,89,90,94,112,140,168,174,179,180,186,210,230,250,262,269,270,276,298,325,345,365,378,389,390,396,414,440,470,479,480,488,510,540,566,583,588,594,598,599];
  const socialComposition = await selectComposition({serveUrl,id:'MovcuesSocial',puppeteerInstance:browser,chromiumOptions});
  if(socialComposition.durationInFrames !== 360 || socialComposition.fps !== 30) throw new Error('Social timeline contract failed');
  const socialSamples=[0,20,34,46,59,60,83,104,105,126,149,150,181,199,211,224,225,246,269,270,300,335,359];
  const skipStills=process.argv.includes('--posters-only') || process.argv.includes('--video-only') || process.argv.includes('--social-only');
  for(const frame of skipStills ? [] : samples) {
    await renderStill({...common, frame, output:resolve(qa,`${String(frame).padStart(3,'0')}.png`), imageFormat:'png', scale:2/3});
    console.log(`Inspected frame export: ${frame}`);
  }
  mkdirSync(resolve(qa,'social'),{recursive:true});
  for(const frame of skipStills ? [] : socialSamples) {
    await renderStill({...common,composition:socialComposition,frame,output:resolve(qa,'social',`${String(frame).padStart(3,'0')}.png`),imageFormat:'png',scale:2/3});
    console.log(`Social edit frame: ${frame}`);
  }
  if(!process.argv.includes('--video-only') && !process.argv.includes('--social-only')) {
    if(process.argv.includes('--posters-only')) await renderStill({...common,frame:230,output:resolve(qa,'230.png'),imageFormat:'png',scale:2/3});
    const mobileComposition = await selectComposition({serveUrl, id:'MovcuesHeroStory', inputProps:{mobilePoster:true}, puppeteerInstance:browser, chromiumOptions});
    await renderStill({...common, composition:{...mobileComposition,width:960,height:720}, inputProps:{mobilePoster:true}, frame:0, output:resolve(qa,'poster-mobile.png'), imageFormat:'png'});
    for(const [source,target] of [['230.png','movcues-hero-poster.webp'],['poster-mobile.png','movcues-hero-mobile.webp']]) execFileSync('ffmpeg',['-y','-i',resolve(qa,source),'-c:v','libwebp','-q:v','88','-compression_level','6',resolve(assets,target)],{stdio:'ignore'});
  }
  if(process.argv.includes('--stills-only') || process.argv.includes('--posters-only')) process.exitCode = 0;
  else {
    const master=resolve(renders,'movcues-hero-master.mp4');
    let last = -1;
    if(!process.argv.includes('--social-only')) {
      await renderMedia({...common, outputLocation:master, codec:'h264', crf:17, pixelFormat:'yuv420p', concurrency:1, disableSharedMemoryCapture:Boolean(browserExecutable), disallowParallelEncoding:true, onProgress:({progress,renderedFrames,encodedFrames})=>{const bucket=Math.floor(progress*20);if(bucket!==last){last=bucket;console.log(`Master rendering: ${Math.round(progress*100)}% · ${renderedFrames} frames rendered · ${encodedFrames} encoded`);}}});
      execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',master,'-vf','scale=1280:720:flags=lanczos','-c:v','libx264','-preset','veryslow','-crf','24','-pix_fmt','yuv420p','-an','-map_metadata','-1','-movflags','+faststart',resolve(assets,'movcues-hero-web.mp4')],{stdio:'inherit'});
    }
    last=-1;
    await renderMedia({...common,composition:socialComposition,outputLocation:resolve(root,'out/social-raw.mp4'),codec:'h264',crf:20,pixelFormat:'yuv420p',concurrency:1,disableSharedMemoryCapture:Boolean(browserExecutable),disallowParallelEncoding:true,onProgress:({progress})=>{const bucket=Math.floor(progress*10);if(bucket!==last){last=bucket;console.log(`Social rendering: ${bucket*10}%`);}}});
    execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',resolve(root,'out/social-raw.mp4'),'-c','copy','-an','-map_metadata','-1','-movflags','+faststart',resolve(renders,'movcues-social-12s.mp4')],{stdio:'inherit'});
    writeFileSync(resolve(renders,'render-manifest.json'),JSON.stringify({composition:'MovcuesHeroStory',width:1920,height:1080,fps:30,frames:600,duration:20,web:{width:1280,height:720},posterFrame:230,samples,social:{composition:'MovcuesSocial',width:1920,height:1080,fps:30,frames:360,duration:12,samples:socialSamples}},null,2)+'\n');
  }
} finally {await browser.close({silent:true});}
