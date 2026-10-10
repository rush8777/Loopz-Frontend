import { Composition } from "remotion";
import { MovcuesHeroStory } from "./compositions/MovcuesHeroStory";
import { VIDEO } from "./timeline";
export function Root() {
  return <Composition id="MovcuesHeroStory" component={MovcuesHeroStory} width={VIDEO.width} height={VIDEO.height} fps={VIDEO.fps} durationInFrames={VIDEO.frames} />;
}
