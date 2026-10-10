import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { SHOTS } from "../timeline";
import { ProblemScene } from "../scenes/ProblemScene";
import { AnalyticsScene } from "../scenes/AnalyticsScene";
import { AudienceScene } from "../scenes/AudienceScene";
import { GuidanceScene } from "../scenes/GuidanceScene";
import { ResultsScene } from "../scenes/ResultsScene";
import { BrandScene } from "../scenes/BrandScene";
import { MobileGuidancePoster } from "../components/MobileGuidancePoster";
import "../film.css";
const scenes = [ProblemScene, AnalyticsScene, AudienceScene, GuidanceScene, ResultsScene, BrandScene];
export function MovcuesHeroStory({ mobilePoster = false }: { mobilePoster?: boolean }) {
  const fonts = <style>{`@font-face{font-family:GT;src:url('${staticFile("fonts/gt-standard-regular.ttf")}') format('truetype');font-weight:400;font-display:block}@font-face{font-family:GT;src:url('${staticFile("fonts/gt-standard-semibold.otf")}') format('opentype');font-weight:600 900;font-display:block}`}</style>;
  if (mobilePoster) return <AbsoluteFill className="film">{fonts}<MobileGuidancePoster /></AbsoluteFill>;
  return <AbsoluteFill className="film">
    {fonts}
    {SHOTS.map((shot, index) => { const Scene = scenes[index]; return <Sequence key={shot.name} name={shot.name} from={shot.start} durationInFrames={shot.end - shot.start}><Scene /></Sequence>; })}
    <div className="film-disclaimer">Illustrative product walkthrough · Sample data</div>
  </AbsoluteFill>;
}
