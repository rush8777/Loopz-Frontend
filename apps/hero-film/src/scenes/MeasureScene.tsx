import {interpolateColors,useCurrentFrame} from 'remotion';
import {MotionHeading} from '../motion/MotionHeading';
import {MorphPath} from '../motion/MorphPath';
import {mix,palette,ramp,type Point} from '../motion/tokens';

const CHECK:[Point,Point,Point]=[{x:1138,y:808},{x:1155,y:826},{x:1185,y:790}];
const PROGRESS:[Point,Point,Point]=[{x:470,y:820},{x:815,y:585},{x:1450,y:620}];
export function MeasureScene() {
  const f=useCurrentFrame(),morph=ramp(f,0,29),leave=ramp(f,75,89);
  const head=ramp(f,26,65),p=PROGRESS;
  const a=head<.4?p[0]:p[1],b=head<.4?p[1]:p[2],t=head<.4?head/.4:(head-.4)/.6;
  const dot={x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)};
  return <div className="motion-scene">
    <MotionHeading frame={f} lines={['See what happens','next.']} dark exitAt={74}/>
    <svg className="shape-canvas" viewBox="0 0 1920 1080">
      <circle cx="1160" cy="808" r={48*(1-morph)} fill={palette.blue}/>
      <MorphPath from={CHECK} to={PROGRESS} progress={morph} color={interpolateColors(morph,[0,1],[palette.paper,palette.blueLight])} width={8}/>
      <circle cx={mix(1160,dot.x,morph)} cy={mix(808,dot.y,morph)} r="18" fill={palette.paper} opacity={ramp(f,14,29)}/>
      <circle cx="1450" cy="620" r={mix(23,46,ramp(f,48,69))} fill="none" stroke="#91a8ff" strokeWidth="2" opacity={ramp(f,45,62)*(1-leave)}/>
    </svg>
    <div className="measure-note" style={{transform:`translateY(${(1-ramp(f,31,47))*40-leave*90}px)`,clipPath:`inset(${(1-ramp(f,31,47))*100}% 0 ${leave*100}% 0)`}}>
      <strong>Completion signal</strong><span>Illustrative journey</span>
    </div>
  </div>;
}
