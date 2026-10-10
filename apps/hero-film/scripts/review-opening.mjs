import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderStill,renderMedia} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(root,'out/opening');mkdirSync(out,{recursive:true});
const serveUrl=await bundle({entryPoint:resolve(root,'src/index.ts'),publicDir:resolve(root,'public'),outDir:resolve(root,'out/bundle')});
const chromiumOptions={gl:'swangle',enableMultiProcessOnLinux:!process.env.REMOTION_SINGLE_PROCESS};
const browserExecutable=process.env.REMOTION_BROWSER_EXECUTABLE||undefined;
const browser=await openBrowser('chrome',{browserExecutable,chromiumOptions});
try {
  const composition=await selectComposition({serveUrl,id:'OpeningStudy',puppeteerInstance:browser,chromiumOptions});
  const common={serveUrl,composition,puppeteerInstance:browser,chromiumOptions};
  for(const frame of [0,8,18,28,36,42,50,60,70,78,82,86,89,90,94,98,104,112,119]) {
    await renderStill({...common,frame,output:resolve(out,`${String(frame).padStart(3,'0')}.png`),imageFormat:'png',scale:2/3});
    console.log(`Opening study frame ${frame}`);
  }
  if(!process.argv.includes('--stills-only')) {
    let last=-1;
    await renderMedia({...common,outputLocation:resolve(out,'opening-1080p.mp4'),codec:'h264',crf:17,pixelFormat:'yuv420p',concurrency:1,disableSharedMemoryCapture:Boolean(browserExecutable),disallowParallelEncoding:true,onProgress:({progress})=>{const p=Math.floor(progress*10);if(p!==last){last=p;console.log(`Opening render ${p*10}%`);}}});
  }
} finally {await browser.close({silent:true});}
