import {useCurrentFrame} from 'remotion';
import {KineticLine} from '../motion/KineticType';
import {ShutterDots} from '../motion/ShapeLayers';
import {VirtualCamera} from '../motion/VirtualCamera';
import {mix,palette,ramp} from '../motion/tokens';

export function HookScene({social=false}:{social?:boolean}) {
  const f=useCurrentFrame();
  const switchOut=ramp(f,31,45),exit=ramp(f,76,85);
  const dolly=ramp(f,0,75)*(1-ramp(f,75,90));
  return <div className="motion-scene">
    <ShutterDots/>
    <VirtualCamera x={-14*dolly} y={-8*dolly} scale={1+.028*dolly}>
      <div className="hook-first" style={{transform:`translateY(${-230*switchOut}px)`,clipPath:`inset(0 0 ${switchOut*100}% 0)`}}>
        <KineticLine text={social?'Signed up.':'Your users'} frame={f} start={-16} size={164} color={palette.paper}/>
        {!social&&<KineticLine text="signed up." frame={f} start={1} size={164} color={palette.paper}/>}
      </div>
      <div className="hook-second" style={{transform:`translateY(${-280*exit}px)`,clipPath:`inset(0 0 ${exit*100}% 0)`}}>
        <KineticLine text={social?'Then':'But'} frame={f} start={32} size={114} color={palette.paper}/>
        <KineticLine text={social?'disappeared.':'never came'} frame={f} start={39} size={168} color={palette.blueLight}/>
        {!social&&<KineticLine text="back." frame={f} start={44} size={168} color={palette.blueLight}/>}
        <div className="emphasis-rule" style={{width:mix(0,325,ramp(f,56,71)),transform:`scaleX(${1-exit})`}}/>
      </div>
    </VirtualCamera>
  </div>;
}
