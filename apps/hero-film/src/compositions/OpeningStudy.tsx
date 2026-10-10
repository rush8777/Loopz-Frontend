import {AbsoluteFill,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {OpeningField} from '../motion/ShapeLayers';
import {easeInOut,fontCss,ramp} from '../motion/tokens';
import {HookScene} from '../scenes/HookScene';
import {UnderstandScene} from '../scenes/UnderstandScene';
import '../motion.css';

export function OpeningStudy() {
  const f=useCurrentFrame();
  return <AbsoluteFill className="motion-film">
    <style>{fontCss(staticFile('fonts/gt-standard-regular.ttf'),staticFile('fonts/gt-standard-semibold.otf'))}</style>
    <OpeningField frame={f}/>
    <Sequence name="Hook" from={0} durationInFrames={90}><HookScene/></Sequence>
    <Sequence name="Understand entrance" from={90} durationInFrames={30}><div className="motion-scene" style={{clipPath:`circle(${2300*ramp(f,78,103,easeInOut)}px at 1430px 790px)`}}><UnderstandScene/></div></Sequence>
  </AbsoluteFill>;
}
