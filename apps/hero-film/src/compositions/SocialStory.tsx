import {AbsoluteFill,interpolate,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {HookScene} from '../scenes/HookScene';
import {UnderstandScene} from '../scenes/UnderstandScene';
import {TargetScene} from '../scenes/TargetScene';
import {GuideScene} from '../scenes/GuideScene';
import {MeasureScene} from '../scenes/MeasureScene';
import {CommercialBrandScene} from '../scenes/CommercialBrandScene';
import {ColorField,PortalMask} from '../motion/SceneMasks';
import {fontCss} from '../motion/tokens';
import '../motion.css';

const scenes=[HookScene,UnderstandScene,TargetScene,GuideScene,MeasureScene,CommercialBrandScene];
const cuts=[{from:0,duration:90,rate:1.5},{from:60,duration:90,rate:2},{from:105,duration:90,rate:2},{from:150,duration:120,rate:1.6},{from:225,duration:90,rate:2},{from:270,duration:120,rate:94/89}];
// Retimed local scene clocks stay within the 360-frame composition; action and brand get longer holds.
export function SocialStory() {
  const f=useCurrentFrame();
  const masterFrame=interpolate(f,[0,60,105,150,225,270,359],[0,90,180,270,390,480,574],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return <AbsoluteFill className="motion-film">
    <style>{fontCss(staticFile('fonts/gt-standard-regular.ttf'),staticFile('fonts/gt-standard-semibold.otf'))}</style>
    <ColorField frame={masterFrame}/>
    {cuts.map((cut,i)=>{const Scene=scenes[i];return <Sequence key={cut.from} name={`Social ${i+1}`} from={cut.from} durationInFrames={cut.duration} playbackRate={cut.rate}>
      <PortalMask frame={masterFrame} portal={i===0?undefined:i-1}>{i===0?<HookScene social/>:<Scene/>}</PortalMask>
    </Sequence>;})}
  </AbsoluteFill>;
}
