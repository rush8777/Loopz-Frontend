import {useCurrentFrame} from 'remotion';
import {AudienceGeometry} from '../motion/AudienceGeometry';
import {MotionHeading} from '../motion/MotionHeading';

export function TargetScene() {
  const f=useCurrentFrame();
  return <div className="motion-scene">
    <MotionHeading frame={f} lines={['Find the users','who need help.']} dark exitAt={72}/>
    <AudienceGeometry frame={f}/>
  </div>;
}
