import {mix,palette,ramp} from './tokens';
import {DrawPath} from './ShapeLayers';

export function ActionInteraction({frame}:{frame:number}) {
  const morph=ramp(frame,0,19),show=ramp(frame,9,27),click=ramp(frame,72,78),success=ramp(frame,78,96);
  const exit=ramp(frame,104,117),tooltipExit=ramp(frame,74,86);
  const width=mix(mix(42,430,morph),96,success),height=mix(mix(42,100,morph),96,success);
  const cursorX=mix(1580,1170,ramp(frame,34,66)),cursorY=mix(965,807,ramp(frame,34,66));
  const check=ramp(frame,86,101);
  return <div className="motion-scene">
    <svg className="shape-canvas" viewBox="0 0 1920 1080">
      <rect x={1160-width/2} y={808-height/2} width={width} height={height} rx={mix(21,14,morph)*(1-success)+48*success} fill={palette.blue} transform={`translate(1160 808) scale(${1-.035*Math.sin(click*Math.PI)}) translate(-1160 -808)`}/>
      <DrawPath d="M 1138 808 L 1155 826 L 1185 790" progress={check} color={palette.paper} width={8}/>
      {frame>=72&&frame<90&&<circle cx="1160" cy="808" r={mix(25,95,ramp(frame,72,90))} stroke={palette.blue} strokeWidth="2" fill="none" opacity={1-ramp(frame,76,90)}/>}
    </svg>
    <div className="action-label" style={{opacity:ramp(frame,12,23)*(1-success),transform:`translateY(${-28*success}px)`}}>Create project <span>↗</span></div>
    <div className="context-tooltip" style={{transform:`translateY(${(1-show)*28+tooltipExit*24}px) scale(${mix(.96,1,show)})`,clipPath:`inset(calc(${(1-show)*100}% - 10px) -30px calc(${tooltipExit*100}% + ${tooltipExit*80-40}px) -30px)`}}>
      <span className="tooltip-pointer"/>
      <h3>Create your first project</h3>
      <p>One place for your team’s work.</p>
    </div>
    <div className="success-label" style={{transform:`translateY(${(1-success)*28-exit*65}px)`,clipPath:`inset(${(1-success)*100}% 0 ${exit*100}% 0)`}}>Project created.</div>
    {frame>=32&&frame<94&&<svg className="commercial-cursor" width="52" height="62" viewBox="0 0 52 62" style={{left:cursorX+mix(0,150,ramp(frame,79,94)),top:cursorY+mix(0,190,ramp(frame,79,94)),opacity:ramp(frame,32,38)*(1-ramp(frame,84,94)),transform:`scale(${1-.11*Math.sin(click*Math.PI)})`}}>
      <path d="M 4 3 L 6 47 L 17 37 L 25 55 L 34 51 L 26 34 L 42 33 Z" fill={palette.navy} stroke="white" strokeWidth="3" strokeLinejoin="round"/>
    </svg>}
  </div>;
}
