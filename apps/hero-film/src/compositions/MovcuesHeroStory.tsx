import {AbsoluteFill,Freeze,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {SHOTS} from '../timeline';
import {HookScene} from '../scenes/HookScene';
import {UnderstandScene} from '../scenes/UnderstandScene';
import {TargetScene} from '../scenes/TargetScene';
import {GuideScene} from '../scenes/GuideScene';
import {MeasureScene} from '../scenes/MeasureScene';
import {CommercialBrandScene} from '../scenes/CommercialBrandScene';
import {ColorField,PortalMask} from '../motion/SceneMasks';
import {easeInOut,fontCss,palette,ramp} from '../motion/tokens';
import {MobileCommercialPoster} from '../motion/MobileCommercialPoster';
import '../motion.css';

const scenes=[HookScene,UnderstandScene,TargetScene,GuideScene,MeasureScene,CommercialBrandScene];
export function MovcuesHeroStory({mobilePoster=false,socialHook=false}:{mobilePoster?:boolean;socialHook?:boolean}) {
  const frame=useCurrentFrame();
  const fonts=<style>{fontCss(staticFile('fonts/gt-standard-regular.ttf'),staticFile('fonts/gt-standard-semibold.otf'))}</style>;
  if(mobilePoster)return <AbsoluteFill className="motion-film">{fonts}<MobileCommercialPoster/></AbsoluteFill>;
  return <AbsoluteFill className="motion-film">
    {fonts}<ColorField frame={frame}/>
    {SHOTS.map((shot,i)=>{const Scene=scenes[i];return <Sequence name={shot.name} key={shot.name} from={shot.start} durationInFrames={shot.end-shot.start}>
      <PortalMask frame={frame} portal={i===0?undefined:i-1}>{i===0?<HookScene social={socialHook}/>:<Scene/>}</PortalMask>
    </Sequence>;})}
    {frame>=584&&<div className="motion-scene" style={{background:palette.navy,clipPath:`circle(${2500*ramp(frame,584,599,easeInOut)}px at -150px 970px)`}}><Freeze frame={0}><HookScene social={socialHook}/></Freeze></div>}
  </AbsoluteFill>;
}
