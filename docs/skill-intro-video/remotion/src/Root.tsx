import {Composition, Still} from 'remotion';
import {SkillIntro2D, SkillIntro3D, SkillIntro3DPoster, SkillIntroPoster} from './SkillIntro';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="SkillIntro2D"
        component={SkillIntro2D}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={1200}
        defaultProps={{useGeneratedClips: false}}
      />
      <Composition
        id="SkillIntro3D"
        component={SkillIntro3D}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={900}
      />
      <Still
        id="SkillIntro2DPoster"
        component={SkillIntroPoster}
        width={1920}
        height={1080}
      />
      <Still
        id="SkillIntro3DPoster"
        component={SkillIntro3DPoster}
        width={1920}
        height={1080}
      />
    </>
  );
};
