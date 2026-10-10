import {KineticLine} from './KineticType';
import {palette,ramp} from './tokens';

export function MotionHeading({frame,lines,dark=false,exitAt=75,size=122}:{frame:number;lines:[string,string];dark?:boolean;exitAt?:number;size?:number}) {
  const leave=ramp(frame,exitAt,exitAt+12);
  return <div className="scene-headline" style={{transform:`translateY(${-180*leave}px)`,clipPath:`inset(0 0 ${leave*100}% 0)`}}>
    <KineticLine text={lines[0]} frame={frame} start={3} size={size} color={dark?palette.paper:palette.ink}/>
    <KineticLine text={lines[1]} frame={frame} start={8} size={size} color={dark?palette.blueLight:palette.blue}/>
  </div>;
}
