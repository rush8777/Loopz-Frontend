import {useCurrentFrame} from 'remotion';
import {MotionHeading} from '../motion/MotionHeading';
import {DrawPath,focus} from '../motion/ShapeLayers';
import {mix,palette,ramp} from '../motion/tokens';
import {VirtualCamera} from '../motion/VirtualCamera';

export function UnderstandScene() {
  const f=useCurrentFrame();
  const reveal=ramp(f,3,25),settle=ramp(f,0,24);
  const collapse=ramp(f,65,89);
  const focusX=mix(focus.x,960,settle),focusY=mix(focus.y,710,settle);
  return <div className="motion-scene">
    <MotionHeading frame={f} lines={['Know where','they get stuck.']} exitAt={73}/>
    <VirtualCamera scale={1+.035*ramp(f,24,56)*(1-collapse)} origin="960px 710px">
      <svg className="shape-canvas" viewBox="0 0 1920 1080">
        <g transform={`translate(960 710) scale(${1-collapse}) translate(-960 -710)`}>
        <DrawPath d="M 260 710 C 460 710 490 710 610 710 L 860 710" progress={reveal} color={palette.blue}/>
        <DrawPath d="M 1060 710 L 1350 710 C 1460 710 1500 710 1660 710" progress={reveal} color="#d5dce9" width={3}/>
        {[260,610,1350,1660].map((x,i)=><g key={x} opacity={reveal}>
          <circle cx={x} cy="710" r="21" fill={i<2?palette.blue:palette.paper} stroke={i<2?palette.blue:'#cbd4e5'} strokeWidth="3"/>
        </g>)}
        <circle cx="960" cy="710" r={mix(82,113,ramp(f,13,29))} fill="none" stroke="#c5d0ef" strokeWidth="1.5" opacity={ramp(f,13,21)}/>
        <path d="M 1010 765 L 1047 805" stroke={palette.blue} strokeWidth="9" strokeLinecap="round" opacity={ramp(f,13,25)}/>
        </g>
        <circle cx={focusX} cy={focusY} r={mix(mix(62,72,settle),18,collapse)} fill={palette.paper} stroke={palette.blue} strokeWidth={4*(1-collapse)}/>
        <circle cx={focusX} cy={focusY} r="18" fill={palette.blue}/>
      </svg>
    </VirtualCamera>
  </div>;
}
