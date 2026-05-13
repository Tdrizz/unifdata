import React from "react";
import { Composition, Sequence, AbsoluteFill } from "remotion";
import { Intro } from "./scenes/Intro";
import { Problem } from "./scenes/Problem";
import { CoreFlow } from "./scenes/CoreFlow";
import { IndustryAware } from "./scenes/IndustryAware";
import { Dashboard } from "./scenes/Dashboard";
import { CRMView } from "./scenes/CRMView";
import { ImportEngine } from "./scenes/ImportEngine";
import { AIFeatures } from "./scenes/AIFeatures";
import { DataHub } from "./scenes/DataHub";
import { Closing } from "./scenes/Closing";
import { SceneFadeWrapper } from "./scenes/SceneTransition";

const FPS = 30;

const SCENES = {
  intro: 3.5 * FPS,
  problem: 5 * FPS,
  coreFlow: 6.5 * FPS,
  industry: 6 * FPS,
  dashboard: 7 * FPS,
  crm: 6.5 * FPS,
  imports: 6.5 * FPS,
  ai: 7 * FPS,
  dataHub: 6 * FPS,
  closing: 7 * FPS,
};

const TOTAL_FRAMES = Object.values(SCENES).reduce((a, b) => a + b, 0);

const Walkthrough: React.FC = () => {
  let offset = 0;
  const scenes: Array<{ from: number; duration: number; component: React.FC }> = [];

  const entries: [string, number][] = [
    ["intro", SCENES.intro],
    ["problem", SCENES.problem],
    ["coreFlow", SCENES.coreFlow],
    ["industry", SCENES.industry],
    ["dashboard", SCENES.dashboard],
    ["crm", SCENES.crm],
    ["imports", SCENES.imports],
    ["ai", SCENES.ai],
    ["dataHub", SCENES.dataHub],
    ["closing", SCENES.closing],
  ];

  const componentMap: Record<string, React.FC> = {
    intro: Intro,
    problem: Problem,
    coreFlow: CoreFlow,
    industry: IndustryAware,
    dashboard: Dashboard,
    crm: CRMView,
    imports: ImportEngine,
    ai: AIFeatures,
    dataHub: DataHub,
    closing: Closing,
  };

  for (const [key, duration] of entries) {
    scenes.push({ from: offset, duration, component: componentMap[key] });
    offset += duration;
  }

  return (
    <AbsoluteFill style={{ background: "#0a0f1e" }}>
      {scenes.map(({ from, duration, component: Scene }, i) => (
        <Sequence key={i} from={from} durationInFrames={duration}>
          <SceneFadeWrapper durationInFrames={duration}>
            <Scene />
          </SceneFadeWrapper>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="FrontierOpsWalkthrough"
      component={Walkthrough}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
