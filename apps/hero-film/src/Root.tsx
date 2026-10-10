import { Composition } from "remotion";
import { MovcuesHeroStory } from "./compositions/MovcuesHeroStory";
import { VIDEO } from "./timeline";
import {OpeningStudy} from './compositions/OpeningStudy';
import {SocialStory} from './compositions/SocialStory';
export function Root() {
  return <><Composition id="MovcuesHeroStory" component={MovcuesHeroStory} width={VIDEO.width} height={VIDEO.height} fps={VIDEO.fps} durationInFrames={VIDEO.frames} /><Composition id="OpeningStudy" component={OpeningStudy} width={1920} height={1080} fps={30} durationInFrames={120}/><Composition id="MovcuesSocial" component={SocialStory} width={1920} height={1080} fps={30} durationInFrames={360}/></>;
}
