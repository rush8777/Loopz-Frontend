import {spring} from 'remotion';
import {mix,palette,ramp,type Point} from './tokens';

export const GRID=Array.from({length:15},(_,i)=>({x:480+(i%5)*240,y:565+Math.floor(i/5)*140}));
export const MATCHES=[2,5,6,7,8,9,12];
export const actionPoint={x:1160,y:808};
export function AudienceGeometry({frame}:{frame:number}) {
  const converge=ramp(frame,68,89);
  const select=ramp(frame,25,43),connect=ramp(frame,36,56);
  const position=(i:number):Point=>{
    const spread=spring({frame:Math.max(0,frame-i*.45),fps:30,config:{mass:.8,stiffness:115,damping:23},durationInFrames:29});
    const x=mix(960,GRID[i].x,spread),y=mix(710,GRID[i].y,spread);
    return {x:mix(x,actionPoint.x,converge),y:mix(y,actionPoint.y,converge)};
  };
  return <svg className="shape-canvas" viewBox="0 0 1920 1080">
    {MATCHES.filter(i=>i!==7).map(i=>{const p=position(i),c=position(7);return <path key={i} d={`M ${c.x} ${c.y} L ${p.x} ${p.y}`} pathLength="1" stroke="#7692ee" strokeWidth="2" strokeDasharray="1" strokeDashoffset={1-connect} opacity={.55*(1-converge)}/>;})}
    {GRID.map((_,i)=> {
      const p=position(i),chosen=MATCHES.includes(i);
      const opacity=chosen?1:(1-select*.8)*(1-converge);
      return <g key={i} opacity={opacity}>
        {chosen&&<circle cx={p.x} cy={p.y} r={mix(18,32,select)*(1-converge)} stroke="#7d9bff" strokeWidth="1.3" fill="none" opacity={select*.5}/>}
        <circle cx={p.x} cy={p.y} r={mix(18,21,chosen?select:0)} fill={chosen?palette.blueLight:'#64718a'}/>
      </g>;
    })}
  </svg>;
}
