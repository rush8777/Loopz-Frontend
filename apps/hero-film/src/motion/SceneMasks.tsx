import type {ReactNode} from 'react';
import {easeInOut,palette,ramp,type Point} from './tokens';

export const PORTALS: {start:number;end:number;center:Point;color:string}[] = [
  {start:78,end:103,center:{x:1430,y:790},color:palette.paper},
  {start:170,end:192,center:{x:960,y:710},color:palette.navy},
  {start:258,end:282,center:{x:1160,y:808},color:palette.paper},
  {start:378,end:402,center:{x:1160,y:808},color:palette.navy},
  {start:468,end:494,center:{x:1450,y:620},color:palette.paper},
];
export function ColorField({frame}:{frame:number}) {
  let base:string=palette.navy;
  let active:typeof PORTALS[number]|undefined;
  for(const p of PORTALS){if(frame>=p.end)base=p.color;else if(frame>=p.start)active=p;}
  return <svg className="shape-canvas" viewBox="0 0 1920 1080">
    <rect width="1920" height="1080" fill={base}/>
    {active&&<circle cx={active.center.x} cy={active.center.y} r={2300*ramp(frame,active.start,active.end,easeInOut)} fill={active.color}/>}
  </svg>;
}
export function PortalMask({frame,portal,children}:{frame:number;portal?:number;children:ReactNode}) {
  const p=portal===undefined?undefined:PORTALS[portal];
  const clipPath=p&&frame<p.end?`circle(${2300*ramp(frame,p.start,p.end,easeInOut)}px at ${p.center.x}px ${p.center.y}px)`:undefined;
  return <div className="motion-scene" style={{clipPath}}>{children}</div>;
}
