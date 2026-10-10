import {useCurrentFrame} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {cubic, easeInOut, mix, palette, ramp} from './tokens';

export const focus={x:1430,y:790};
const curve=[{x:-150,y:970},{x:360,y:640},{x:1100,y:970},focus] as const;
export function HookDots() {
  const f=useCurrentFrame();
  return <svg className="shape-canvas" viewBox="0 0 1920 1080">
    <path d="M -150 970 C 360 640 1100 970 1430 790" fill="none" stroke="#2c3956" strokeWidth="2" strokeDasharray="5 12" opacity={1-ramp(f,64,78)} />
    {Array.from({length:9},(_,i)=> {
      const p=ramp(f,i*3,i*3+47);
      const pos=cubic(p,[...curve]);
      const vanish=i===8?0:ramp(f,29+i*2.2,43+i*2.2);
      const compress=ramp(f,63,77);
      const x=mix(pos.x,focus.x,compress),y=mix(pos.y,focus.y,compress);
      return <g key={i} opacity={(1-vanish)*(i===8?1:1-compress)}>
        <circle cx={x} cy={y} r={i===8?mix(12,20,ramp(f,65,79)):11} fill={i===8?palette.blueLight:'#e4eaff'} />
      </g>;
    })}
    <circle cx={focus.x} cy={focus.y} r={mix(22,62,ramp(f,65,79))} fill="none" stroke={palette.blueLight} strokeWidth="2" opacity={ramp(f,63,70)} />
    <circle cx={focus.x} cy={focus.y} r={mix(22,82,ramp(f,67,81))} fill="none" stroke={palette.blueLight} strokeWidth="1" opacity={ramp(f,67,75)*.24} />
  </svg>;
}
export function ShutterDots() {
  return <CameraMotionBlur shutterAngle={90} samples={5}><HookDots /></CameraMotionBlur>;
}
export function OpeningField({frame}:{frame:number}) {
  const p=ramp(frame,78,103,easeInOut);
  return <svg className="shape-canvas" viewBox="0 0 1920 1080">
    <rect width="1920" height="1080" fill={palette.navy}/>
    {p>0&&<circle cx={focus.x} cy={focus.y} r={2300*p} fill={palette.paper}/>}
  </svg>;
}
export function DrawPath({d,progress,color=palette.blue,width=5}:{d:string;progress:number;color?:string;width?:number}) {
  return <path d={d} pathLength="1" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1-progress}/>;
}
