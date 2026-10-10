import {useCurrentFrame} from 'remotion';
import {MotionHeading} from '../motion/MotionHeading';
import {ActionInteraction} from '../motion/ActionInteraction';

export function GuideScene() {
  const f=useCurrentFrame();
  return <div className="motion-scene">
    <MotionHeading frame={f} lines={['Give them','the next step.']} exitAt={105}/>
    <ActionInteraction frame={f}/>
  </div>;
}
