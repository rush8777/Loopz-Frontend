import {Img,staticFile} from 'remotion';
import {KineticLine} from './KineticType';
import {mix,palette,ramp} from './tokens';

export function BrandReveal({frame}:{frame:number}) {
  const arrive=ramp(frame,0,26),logo=ramp(frame,10,38);
  return <div className="motion-scene">
    {frame<38&&<svg className="shape-canvas" viewBox="0 0 1920 1080">
      <circle cx={mix(1450,340,arrive)} cy={mix(620,321,arrive)} r={mix(18,26,arrive)} fill={palette.blue} opacity={1-ramp(frame,25,38)}/>
    </svg>}
    <div className="commercial-logo" style={{clipPath:`inset(0 ${(1-logo)*100}% 0 0)`,transform:`translateX(${(1-logo)*24}px)`}}><Img src={staticFile('movcues-logo.png')}/></div>
    <div className="brand-message">
      <KineticLine text="Turn user behavior" frame={frame} start={26} size={118}/>
      <KineticLine text="into action." frame={frame} start={32} size={118} color={palette.blue}/>
    </div>
    <div className="brand-verbs">
      {['Understand.','Target.','Guide.','Improve.'].map((word,i)=><div key={word} style={{transform:`translateY(${(1-ramp(frame,43+i*3,59+i*3))*45}px)`,clipPath:`inset(${(1-ramp(frame,43+i*3,59+i*3))*100}% 0 0 0)`}}>{word}</div>)}
    </div>
  </div>;
}
