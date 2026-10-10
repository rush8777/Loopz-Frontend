import {mix,type Point} from './tokens';
/** Equal-topology interpolation: the successful action literally becomes the progress path. */
export function MorphPath({from,to,progress,color,width=8}:{from:[Point,Point,Point];to:[Point,Point,Point];progress:number;color:string;width?:number}) {
  const pts=from.map((p,i)=>({x:mix(p.x,to[i].x,progress),y:mix(p.y,to[i].y,progress)}));
  return <path d={`M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y} L ${pts[2].x} ${pts[2].y}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"/>;
}
