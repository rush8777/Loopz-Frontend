import { useCurrentFrame } from "remotion";
import { AcmeWorkspace } from "../components/AcmeWorkspace";
import { ShotLabel } from "../components/MovcuesInterface";
import { SceneTransition } from "../components/SceneTransition";
import { progress } from "../theme";
export function GuidanceScene() {
  const frame = useCurrentFrame();
  const pullback = progress(frame, 0, 24);
  return <SceneTransition duration={156}><ShotLabel number="" title="GUIDE IN CONTEXT" subtitle="Help the right user take the next step." /><div className="acme-camera" style={{ transform: `scale(${1.045 - pullback * .045})`, transformOrigin: "75% 30%" }}><AcmeWorkspace /></div></SceneTransition>;
}
