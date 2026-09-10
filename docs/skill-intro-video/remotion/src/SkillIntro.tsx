import React from 'react';
import {Video} from '@remotion/media';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type SkillIntroProps = {
  useGeneratedClips: boolean;
};

const colors = {
  paper: '#e9e1d5',
  paperLight: '#f5efe6',
  ink: '#20221f',
  muted: '#716b61',
  accent: '#c45e32',
  dark: '#1c1e1b',
  line: 'rgba(45, 40, 33, 0.2)',
};

const serif = 'Georgia, "Times New Roman", serif';
const sans = '"Microsoft YaHei", "Noto Sans SC", Arial, sans-serif';

const full: React.CSSProperties = {
  width: '100%',
  height: '100%',
};

const PaperTexture = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      opacity: 0.18,
      mixBlendMode: 'multiply',
      backgroundImage:
        'radial-gradient(circle at 10% 20%, rgba(70,55,38,.28) 0 1px, transparent 1.4px), radial-gradient(circle at 75% 60%, rgba(70,55,38,.2) 0 1px, transparent 1.5px)',
      backgroundSize: '31px 29px, 47px 43px',
    }}
  />
);

const FrameLabel = ({index, text}: {index: string; text: string}) => (
  <div
    style={{
      position: 'absolute',
      top: 46,
      left: 54,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      fontFamily: sans,
      fontSize: 18,
      letterSpacing: '0.16em',
      fontWeight: 700,
      color: colors.ink,
    }}
  >
    <span
      style={{
        display: 'grid',
        placeItems: 'center',
        width: 42,
        height: 42,
        border: `1px solid ${colors.ink}`,
        borderRadius: '50%',
        color: colors.accent,
      }}
    >
      {index}
    </span>
    {text}
  </div>
);

const PhotoBackground = ({
  src,
  darken = 0,
  zoom = 1.035,
  panX = 0,
  panY = 0,
}: {
  src: string;
  darken?: number;
  zoom?: number;
  panX?: number;
  panY?: number;
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1, zoom], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const x = interpolate(frame, [0, durationInFrames], [0, panX], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [0, durationInFrames], [0, panY], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: colors.paper}}>
      <Img
        src={staticFile(src)}
        style={{
          ...full,
          objectFit: 'cover',
          transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
          transformOrigin: 'center',
        }}
      />
      {darken > 0 ? <AbsoluteFill style={{background: `rgba(22,21,18,${darken})`}} /> : null}
      <PaperTexture />
    </AbsoluteFill>
  );
};

const IntroScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleY = interpolate(frame, [0.4 * fps, 1.4 * fps], [38, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleOpacity = interpolate(frame, [0.35 * fps, 1.2 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill>
      <PhotoBackground src="opening-inputs.png" darken={0.08} zoom={1.045} panX={-16} panY={8} />
      <div
        style={{
          position: 'absolute',
          left: 700,
          top: 330,
          width: 1020,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div style={{font: `700 18px ${sans}`, letterSpacing: '0.2em', color: colors.accent}}>
          INTERIOR RENOVATION HTML
        </div>
        <h1 style={{font: `500 78px/1.12 ${serif}`, color: colors.ink, margin: '22px 0 24px'}}>
          不是从一张效果图开始
        </h1>
        <p style={{font: `400 27px/1.75 ${sans}`, color: colors.muted, margin: 0}}>
          先把输入摆上桌面，再让每一个判断有据可查。
        </p>
      </div>
    </AbsoluteFill>
  );
};

const inputCallouts = [
  {n: '01', title: '分层图纸', detail: 'CAD / PDF · 楼层标签', x: 56, y: 180, w: 480, h: 770},
  {n: '02', title: '尺寸依据', detail: '比例尺 · 现场复尺', x: 486, y: 60, w: 190, h: 445},
  {n: '03', title: '生活需求 QA', detail: '每层 · 每房间 · 每件家具', x: 675, y: 45, w: 350, h: 300},
  {n: '04', title: '风格与材料', detail: '只控制氛围，不控制户型', x: 1015, y: 40, w: 820, h: 300},
];

const InputsScene = ({useGeneratedClips}: SkillIntroProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cameraFrames = [0, 0.8 * fps, 2.05 * fps, 3.3 * fps, 4.55 * fps, 7.4 * fps, 9 * fps];
  const focusX = interpolate(frame, cameraFrames, [960, 296, 581, 850, 1425, 1425, 960], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const focusY = interpolate(frame, cameraFrames, [540, 565, 283, 195, 190, 190, 540], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const focusRadiusX = interpolate(frame, cameraFrames, [520, 330, 210, 275, 500, 500, 620], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const focusRadiusY = interpolate(frame, cameraFrames, [390, 450, 320, 245, 245, 245, 430], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cameraScale = interpolate(frame, cameraFrames, [1.01, 1.045, 1.065, 1.055, 1.04, 1.055, 1.025], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cameraX = (960 - focusX) * 0.075;
  const cameraY = (540 - focusY) * 0.075;
  const screenFocusX = (focusX - 960) * cameraScale + 960 + cameraX;
  const screenFocusY = (focusY - 540) * cameraScale + 540 + cameraY;
  const shadeOpacity = interpolate(frame, [0.55 * fps, 1.15 * fps], [0, 0.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{background: colors.paper, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          transform: `translate3d(${cameraX}px, ${cameraY}px, 0) scale(${cameraScale})`,
          transformOrigin: 'center',
        }}
      >
        {useGeneratedClips ? (
          <Video src={staticFile('clips/01-inputs-to-evidence.mp4')} muted style={{...full, objectFit: 'cover'}} />
        ) : (
          <Img src={staticFile('opening-inputs.png')} style={{...full, objectFit: 'cover'}} />
        )}
      </AbsoluteFill>
      <PaperTexture />
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background: `radial-gradient(ellipse ${focusRadiusX}px ${focusRadiusY}px at ${screenFocusX}px ${screenFocusY}px, rgba(20,18,15,0) 0%, rgba(20,18,15,.025) 48%, rgba(20,18,15,${shadeOpacity}) 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          opacity: shadeOpacity * 1.65,
          mixBlendMode: 'screen',
          background: `radial-gradient(ellipse ${focusRadiusX * 0.78}px ${focusRadiusY * 0.78}px at ${screenFocusX}px ${screenFocusY}px, rgba(255,250,237,.2) 0%, rgba(255,248,232,.08) 48%, rgba(255,248,232,0) 100%)`,
        }}
      />
      <FrameLabel index="01" text="输入不是附件，是设计依据" />
      {inputCallouts.map((item, i) => {
        const enter = spring({frame: frame - (0.8 + i * 1.25) * fps, fps, config: {damping: 18, stiffness: 120}});
        const nextStart = i === inputCallouts.length - 1 ? 7.45 * fps : (0.8 + (i + 1) * 1.25) * fps;
        const exit = interpolate(frame, [nextStart - 0.18 * fps, nextStart + 0.18 * fps], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const labelX = (item.x - 960) * cameraScale + 960 + cameraX;
        const labelY = (item.y + item.h - 94 - 540) * cameraScale + 540 + cameraY;
        return (
          <div
            key={item.n}
            style={{
              position: 'absolute',
              left: Math.max(76, Math.min(labelX + 22, 1480)),
              top: Math.max(145, Math.min(labelY, 886)),
              padding: '15px 19px 15px 17px',
              borderRadius: 14,
              background: 'rgba(28,30,27,.9)',
              color: colors.paperLight,
              fontFamily: sans,
              opacity: enter * exit,
              transform: `translateY(${16 * (1 - enter)}px)`,
              boxShadow: '0 18px 46px rgba(20,18,15,.3), 0 0 34px rgba(255,245,224,.12)',
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <span style={{width: 8, height: 8, borderRadius: '50%', background: '#f5efe6', boxShadow: '0 0 18px rgba(255,248,232,.8)'}} />
              <strong style={{fontSize: 21}}>{item.n} · {item.title}</strong>
            </div>
            <div style={{marginTop: 6, marginLeft: 18, color: '#c9c1b5', fontSize: 15}}>{item.detail}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const processSteps = [
  {n: '01', title: '图纸事实', body: '轮廓、尺寸、楼梯、门窗与湿区'},
  {n: '02', title: '逐房间说明', body: '用途、邻接、家具、未知项与追问'},
  {n: '03', title: '独立楼层基线', body: '一层、二层、三层分别重建'},
  {n: '04', title: '3D / Imagen', body: '同一底图、同一房间、同一版本'},
];

const renderStories = [
  {
    floor: '一层',
    whole: 'selected-renders/floor-1-whole.png',
    detail: 'selected-renders/floor-1-public-axis.png',
    wholeLabel: '整层 3D · 公共轴贯通',
    detailLabel: '客厅 · 餐厅 · 玻璃厨房',
  },
  {
    floor: '二层',
    whole: 'selected-renders/floor-2-whole.webp',
    detail: 'selected-renders/floor-2-lounge.png',
    wholeLabel: '整层 3D · 独立空间骨架',
    detailLabel: '家庭厅 · 楼梯与阳台采光',
  },
  {
    floor: '三层',
    whole: 'selected-renders/floor-3-whole.png',
    detail: 'selected-renders/floor-3-bath.webp',
    wholeLabel: '整层 3D · 精修俯视',
    detailLabel: '主卫 · 干湿分离与材料',
  },
];

const showcaseFloors = [
  {floor: '01', name: '一层', src: '3d-showcase/interactive-floor-1.png', accent: '#c49b68'},
  {floor: '02', name: '二层', src: '3d-showcase/interactive-floor-2.png', accent: '#a88e6d'},
  {floor: '03', name: '三层', src: '3d-showcase/interactive-floor-3.png', accent: '#8b846f'},
];

const Keynote3DScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({
    frame: frame - 0.25 * fps,
    fps,
    config: {damping: 200},
    durationInFrames: 1.8 * fps,
  });
  const separate = interpolate(frame, [2.15 * fps, 4.25 * fps], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const orbit = interpolate(frame, [4.1 * fps, 7.15 * fps], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const browserReveal = interpolate(frame, [7.1 * fps, 8.55 * fps], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleOne = interpolate(frame, [1.8 * fps, 2.5 * fps], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleTwoIn = interpolate(frame, [2.25 * fps, 2.95 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleTwoOut = interpolate(frame, [6.55 * fps, 7.2 * fps], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleThree = interpolate(frame, [7.15 * fps, 8 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cameraX = interpolate(orbit, [0, 1], [0, -94]);
  const cameraY = interpolate(orbit, [0, 1], [0, 32]);
  const cameraRotate = interpolate(orbit, [0, 1], [-3.5, 2.5]);
  const cameraScale = interpolate(browserReveal, [0, 1], [1, 0.58]);
  const cameraDockX = interpolate(browserReveal, [0, 1], [0, -420]);
  const lightX = interpolate(frame, [0, 10 * fps], [360, 1560], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#050605', color: '#f6f2ea'}}>
      <AbsoluteFill
        style={{
          opacity: 0.78,
          background: `radial-gradient(circle 540px at ${lightX}px 390px, rgba(235,214,179,.2), rgba(18,19,17,.06) 52%, rgba(5,6,5,0) 75%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.58,
          background: 'linear-gradient(120deg, rgba(255,255,255,.035), transparent 34%, rgba(206,174,126,.05) 68%, transparent)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 86,
          zIndex: 10,
          font: `700 15px ${sans}`,
          letterSpacing: '0.22em',
          color: '#d9b982',
          opacity: reveal,
        }}
      >
        INTERACTIVE 3D · FLOOR BY FLOOR
      </div>

      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 155,
          width: 620,
          zIndex: 10,
          opacity: reveal * titleOne,
          transform: `translateY(${28 * (1 - reveal)}px)`,
        }}
      >
        <h2 style={{margin: 0, font: `500 68px/1.08 ${serif}`, letterSpacing: '-0.035em'}}>
          一层一层，
          <br />
          拆开来看。
        </h2>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 155,
          width: 690,
          zIndex: 10,
          opacity: titleTwoIn * titleTwoOut,
          transform: `translateY(${20 * (1 - titleTwoIn)}px)`,
        }}
      >
        <h2 style={{margin: 0, font: `500 62px/1.1 ${serif}`, letterSpacing: '-0.03em'}}>
          三层空间，
          <br />
          三套独立骨架。
        </h2>
        <p style={{margin: '24px 0 0', font: `400 21px/1.7 ${sans}`, color: '#aaa79f'}}>
          同一机位核对轮廓，也能自由切层查看关系。
        </p>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 155,
          width: 600,
          zIndex: 12,
          opacity: titleThree,
          transform: `translateY(${18 * (1 - titleThree)}px)`,
        }}
      >
        <h2 style={{margin: 0, font: `500 59px/1.12 ${serif}`, letterSpacing: '-0.03em'}}>
          旋转、切层、定位。
          <br />
          直接进入讨论。
        </h2>
        <p style={{margin: '24px 0 0', font: `400 21px/1.7 ${sans}`, color: '#aaa79f'}}>
          3D 是交付物的主模块，不是被效果图替代的附件。
        </p>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 560,
          top: 185,
          width: 1110,
          height: 745,
          perspective: 1500,
          transform: `translate3d(${cameraX + cameraDockX}px, ${cameraY}px, 0) scale(${cameraScale}) rotate(${cameraRotate}deg)`,
          transformOrigin: 'center',
          opacity: reveal * (1 - browserReveal * 0.22),
        }}
      >
        {showcaseFloors.map((item, index) => {
          const layer = index - 1;
          const spreadX = interpolate(separate, [0, 1], [0, layer * 172]);
          const spreadY = interpolate(separate, [0, 1], [0, layer * 132]);
          const layerScale = interpolate(separate, [0, 1], [1, 0.87]);
          const layerOpacity = index === 0 ? 1 : interpolate(separate, [0, 0.28, 1], [0, 0.42, 0.96]);
          const tiltX = interpolate(separate, [0, 1], [7, 48]);
          const orbitX = layer * interpolate(orbit, [0, 1], [0, 38]);
          const orbitY = layer * interpolate(orbit, [0, 1], [0, -22]);
          const materialReveal = spring({
            frame: frame - (0.45 + index * 0.28) * fps,
            fps,
            config: {damping: 200},
            durationInFrames: 1.35 * fps,
          });
          const lightSweep = interpolate(frame, [(0.55 + index * 0.28) * fps, (3.4 + index * 0.35) * fps], [18, 78], {
            easing: Easing.inOut(Easing.sin),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={item.floor}
              style={{
                position: 'absolute',
                left: 160,
                top: 80,
                width: 790,
                height: 527,
                overflow: 'visible',
                opacity: layerOpacity,
                transform: `translate3d(${spreadX + orbitX}px, ${spreadY + orbitY}px, ${layer * 28}px) rotateX(${tiltX}deg) scale(${layerScale})`,
                transformOrigin: 'center',
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 34,
                  right: -22,
                  top: 46,
                  bottom: -46,
                  zIndex: -3,
                  borderRadius: '38%',
                  background: 'rgba(0,0,0,.72)',
                  filter: 'blur(30px)',
                  transform: 'translate3d(0, 28px, -52px)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 10,
                  right: -10,
                  top: 15,
                  bottom: -18,
                  zIndex: -2,
                  borderRadius: 24,
                  background: `linear-gradient(145deg, ${item.accent}, #34322b 56%, #151612)`,
                  border: '1px solid rgba(255,255,255,.18)',
                  boxShadow: `0 ${34 + index * 9}px ${82 + index * 16}px rgba(0,0,0,.62)`,
                  transform: 'translate3d(0, 8px, -12px)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                  borderRadius: 22,
                  background: '#262620',
                  border: `1px solid ${item.accent}`,
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.11)',
                }}
              >
                <Img
                  src={staticFile(item.src)}
                  style={{
                    position: 'absolute',
                    left: '-20%',
                    top: '-31%',
                    width: '140%',
                    height: '148%',
                    objectFit: 'cover',
                    filter: `saturate(${0.68 + materialReveal * 0.42}) contrast(${1.06 + materialReveal * 0.1}) brightness(${0.86 + materialReveal * 0.22})`,
                    transform: `scale(${1.02 + materialReveal * 0.025})`,
                  }}
                />
                <AbsoluteFill
                  style={{
                    background: `linear-gradient(180deg, #262620 0, rgba(38,38,32,.94) 34px, transparent 88px), radial-gradient(circle 430px at ${lightSweep}% 24%, rgba(255,231,190,.2), transparent 58%), linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.22))`,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 16,
                    background: `linear-gradient(90deg, #171815, ${item.accent}, #24241f)`,
                    boxShadow: '0 -1px 0 rgba(255,255,255,.24)',
                  }}
                />
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: 24,
                  bottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 14px',
                  borderRadius: 999,
                  background: 'rgba(12,13,12,.74)',
                  backdropFilter: 'blur(12px)',
                  font: `700 16px ${sans}`,
                  letterSpacing: '0.08em',
                }}
              >
                <span style={{color: '#d9b982'}}>{item.floor}</span>
                <span>{item.name}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 92,
          top: 250,
          width: 950,
          height: 594,
          zIndex: 8,
          overflow: 'hidden',
          borderRadius: 30,
          border: '1px solid rgba(255,255,255,.18)',
          background: '#161713',
          boxShadow: '0 44px 130px rgba(0,0,0,.68)',
          opacity: browserReveal,
          transform: `translateY(${68 * (1 - browserReveal)}px) scale(${0.88 + browserReveal * 0.12})`,
        }}
      >
        <div style={{height: 42, display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 18, background: '#24251f'}}>
          {['#ff685f', '#f2bd45', '#5acb64'].map((color) => (
            <span key={color} style={{width: 10, height: 10, borderRadius: '50%', background: color}} />
          ))}
          <div style={{marginLeft: 18, color: '#8d8c84', font: `500 12px ${sans}`}}>yj-home · 3D / 效果图</div>
        </div>
        <div style={{position: 'relative', width: '100%', height: 552, overflow: 'hidden', background: '#292822'}}>
          <Img
            src={staticFile('3d-showcase/interactive-floor-1.png')}
            style={{position: 'absolute', left: '-20%', top: '-34%', width: '141%', height: '150%', objectFit: 'cover', filter: 'brightness(1.08) contrast(1.08) saturate(.94)'}}
          />
          <AbsoluteFill style={{background: 'linear-gradient(180deg, #292822 0, rgba(41,40,34,.94) 36px, transparent 92px), radial-gradient(circle at 68% 38%, rgba(255,227,184,.14), transparent 42%)'}} />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 112,
          bottom: 70,
          zIndex: 14,
          display: 'flex',
          gap: 12,
          opacity: browserReveal,
        }}
      >
        {['拖动旋转', '逐层切换', '锚点留言'].map((label, index) => {
          const chip = spring({frame: frame - (7.55 + index * 0.16) * fps, fps, config: {damping: 200}});
          return (
            <span
              key={label}
              style={{
                padding: '11px 17px',
                borderRadius: 999,
                color: index === 1 ? '#151612' : '#e9e4db',
                background: index === 1 ? '#e8d2a8' : 'rgba(255,255,255,.08)',
                border: '1px solid rgba(255,255,255,.13)',
                font: `700 15px ${sans}`,
                opacity: chip,
                transform: `translateY(${14 * (1 - chip)}px)`,
              }}
            >
              {label}
            </span>
          );
        })}
      </div>

      <div style={{position: 'absolute', left: 110, bottom: 70, color: '#777971', font: `500 14px ${sans}`, letterSpacing: '0.12em'}}>
        02 / 04 · FLOOR-BY-FLOOR 3D
      </div>
    </AbsoluteFill>
  );
};

const ThreeDOpeningScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({
    frame: frame - 0.35 * fps,
    fps,
    config: {damping: 200},
    durationInFrames: 1.7 * fps,
  });
  const camera = interpolate(frame, [0, 6 * fps], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const clipInset = interpolate(frame, [0.45 * fps, 2.4 * fps], [48, 0], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lightX = interpolate(camera, [0, 1], [650, 1440]);
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#050605', color: '#f6f2ea'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle 560px at ${lightX}px 470px, rgba(236,215,180,.23), rgba(30,30,26,.06) 52%, rgba(5,6,5,0) 76%)`,
        }}
      />
      <div style={{position: 'absolute', left: 106, top: 88, color: '#d9b982', font: `700 15px ${sans}`, letterSpacing: '0.22em', opacity: reveal}}>
        INTERIOR 3D PREVIEW
      </div>
      <div
        style={{
          position: 'absolute',
          left: 106,
          top: 250,
          width: 700,
          zIndex: 5,
          opacity: reveal,
          transform: `translateY(${32 * (1 - reveal)}px)`,
        }}
      >
        <h1 style={{margin: 0, font: `500 76px/1.08 ${serif}`, letterSpacing: '-0.04em'}}>
          把图纸，变成
          <br />
          可以接近的空间。
        </h1>
        <p style={{margin: '30px 0 0', color: '#9e9f98', font: `400 22px/1.7 ${sans}`}}>
          先核对关系，再进入设计。
        </p>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 770,
          top: 175,
          width: 980,
          height: 654,
          overflow: 'hidden',
          borderRadius: 28,
          clipPath: `inset(${clipInset}% 0 ${clipInset}% 0 round 28px)`,
          border: '1px solid rgba(255,255,255,.22)',
          background: '#d8d2c7',
          boxShadow: '0 48px 150px rgba(0,0,0,.6)',
          transform: `translate3d(${38 - camera * 34}px, ${46 - camera * 28}px, 0) scale(${0.92 + camera * 0.06}) rotateX(${18 - camera * 11}deg) rotateZ(${-5 + camera * 2}deg)`,
          transformOrigin: 'center',
          opacity: reveal,
        }}
      >
        <Img
          src={staticFile('3d-showcase/interactive-floor-1.png')}
          style={{position: 'absolute', left: '-20%', top: '-34%', width: '141%', height: '150%', objectFit: 'cover', filter: 'brightness(1.1) contrast(1.08) saturate(.96)'}}
        />
        <AbsoluteFill style={{background: 'linear-gradient(180deg, #292822 0, rgba(41,40,34,.94) 38px, transparent 96px), radial-gradient(circle at 64% 36%, rgba(255,232,194,.16), transparent 42%), linear-gradient(135deg, rgba(255,255,255,.1), transparent 34%, rgba(0,0,0,.16))'}} />
      </div>
      <div style={{position: 'absolute', left: 106, bottom: 74, color: '#777971', font: `500 14px ${sans}`, letterSpacing: '0.12em'}}>
        01 / 04 · FROM PLAN TO SPACE
      </div>
    </AbsoluteFill>
  );
};

const interactiveFloors = [
  {floor: '一层', src: '3d-showcase/interactive-floor-1.png'},
  {floor: '二层', src: '3d-showcase/interactive-floor-2.png'},
  {floor: '三层', src: '3d-showcase/interactive-floor-3.png'},
];

const ThreeDInteractionScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const floorWeights = [
    interpolate(frame, [0, 1.8 * fps, 2.45 * fps], [1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    interpolate(frame, [1.8 * fps, 2.45 * fps, 4.25 * fps, 4.9 * fps], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    interpolate(frame, [4.25 * fps, 4.9 * fps, 8 * fps], [0, 1, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  ];
  const activeFloor = frame < 2.2 * fps ? 0 : frame < 4.6 * fps ? 1 : 2;
  const camera = interpolate(frame, [0, 8 * fps], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const title = spring({frame: frame - 0.25 * fps, fps, config: {damping: 200}});
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#0c0d0b', color: '#f6f2ea'}}>
      {interactiveFloors.map((item, index) => (
        <Img
          key={item.floor}
          src={staticFile(item.src)}
          style={{
            ...full,
            position: 'absolute',
            objectFit: 'cover',
            opacity: floorWeights[index],
            transform: `translate3d(${260 + (index - 1) * 18 + camera * 16}px, ${camera * -10}px, 0) scale(${1.025 + camera * 0.035})`,
            transformOrigin: '60% 50%',
          }}
        />
      ))}
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(5,6,5,1) 0%, rgba(5,6,5,1) 28%, rgba(5,6,5,.94) 34%, rgba(5,6,5,.25) 47%, rgba(5,6,5,.05) 60%, rgba(5,6,5,.14) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(5,6,5,.88) 0%, rgba(5,6,5,.34) 12%, transparent 27%)'}} />
      <div
        style={{
          position: 'absolute',
          left: 108,
          top: 94,
          color: '#d9b982',
          font: `700 15px ${sans}`,
          letterSpacing: '0.22em',
          opacity: title,
        }}
      >
        TRUE FLOOR SWITCHING
      </div>
      <div style={{position: 'absolute', left: 108, top: 222, width: 660, opacity: title, transform: `translateY(${24 * (1 - title)}px)`}}>
        <h2 style={{margin: 0, font: `500 66px/1.1 ${serif}`, letterSpacing: '-0.035em'}}>
          切换楼层，
          <br />
          空间也随之改变。
        </h2>
        <p style={{margin: '26px 0 0', color: '#aaa79f', font: `400 21px/1.75 ${sans}`}}>
          墙体、楼梯、阳台与房间关系，全部来自各层自己的模型。
        </p>
      </div>
      <div style={{position: 'absolute', left: 108, bottom: 116, display: 'flex', gap: 12}}>
        {interactiveFloors.map((item, index) => (
          <div
            key={item.floor}
            style={{
              minWidth: 76,
              padding: '12px 18px',
              borderRadius: 999,
              textAlign: 'center',
              color: activeFloor === index ? '#151612' : '#c9c6be',
              background: activeFloor === index ? '#e8d2a8' : 'rgba(255,255,255,.08)',
              border: '1px solid rgba(255,255,255,.13)',
              font: `700 16px ${sans}`,
            }}
          >
            {item.floor}
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 108, bottom: 66, color: '#777971', font: `500 14px ${sans}`, letterSpacing: '0.12em'}}>
        03 / 04 · INDEPENDENT FLOORS
      </div>
    </AbsoluteFill>
  );
};

const ThreeDClosingScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({frame: frame - 0.3 * fps, fps, config: {damping: 200}});
  const camera = interpolate(frame, [0, 7.5 * fps], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const line = interpolate(frame, [1.2 * fps, 4.8 * fps], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scrollY = interpolate(frame, [0, 1.8 * fps, 6.6 * fps, 7.5 * fps], [118, 118, 2580, 2760], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scrollThumbY = interpolate(scrollY, [118, 2760], [18, 392], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scrollHint = interpolate(frame, [1.2 * fps, 1.7 * fps, 6.5 * fps, 7.1 * fps], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const modelOverlay = interpolate(frame, [0, 1.15 * fps, 1.75 * fps], [1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const modelCamera = interpolate(frame, [0, 1.75 * fps], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#050605', color: '#f6f2ea'}}>
      <AbsoluteFill style={{background: 'radial-gradient(circle at 62% 47%, rgba(230,203,160,.16), transparent 42%)'}} />
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 178,
          width: 1070,
          height: 670,
          overflow: 'hidden',
          borderRadius: 30,
          border: '1px solid rgba(255,255,255,.18)',
          background: '#161713',
          boxShadow: '0 52px 150px rgba(0,0,0,.65)',
          opacity: reveal,
          transform: `translate3d(${-28 + camera * 18}px, ${38 - camera * 24}px, 0) scale(${0.92 + camera * 0.045})`,
        }}
      >
        <div style={{height: 46, display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 20, background: '#24251f'}}>
          {['#ff685f', '#f2bd45', '#5acb64'].map((color) => <span key={color} style={{width: 11, height: 11, borderRadius: '50%', background: color}} />)}
          <span style={{marginLeft: 20, color: '#8d8c84', font: `500 12px ${sans}`}}>yj-home · interactive 3D</span>
        </div>
        <div style={{position: 'relative', height: 624, overflow: 'hidden', background: '#120b07'}}>
          <Img
            src={staticFile('3d-showcase/interactive-3d-html-scroll.png')}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              transform: `translate3d(0, ${-scrollY}px, 0)`,
              willChange: 'transform',
            }}
          />
          <AbsoluteFill style={{overflow: 'hidden', background: '#292822', opacity: modelOverlay}}>
            <Img
              src={staticFile('3d-showcase/interactive-floor-1.png')}
              style={{
                position: 'absolute',
                left: '-20%',
                top: '-34%',
                width: '141%',
                height: '150%',
                objectFit: 'cover',
                filter: 'brightness(1.08) contrast(1.08) saturate(.94)',
                transform: `translate3d(${modelCamera * 16}px, ${modelCamera * -8}px, 0) scale(${1 + modelCamera * 0.025})`,
              }}
            />
            <AbsoluteFill style={{background: 'linear-gradient(180deg, #292822 0, rgba(41,40,34,.94) 34px, transparent 88px), radial-gradient(circle at 68% 38%, rgba(255,227,184,.14), transparent 42%)'}} />
          </AbsoluteFill>
          <div style={{position: 'absolute', top: 14, right: 10, bottom: 14, width: 5, borderRadius: 999, background: 'rgba(255,255,255,.13)'}}>
            <div style={{position: 'absolute', top: scrollThumbY, left: 0, width: 5, height: 94, borderRadius: 999, background: '#d9b982'}} />
          </div>
          <div
            style={{
              position: 'absolute',
              right: 26,
              bottom: 22,
              padding: '8px 12px',
              borderRadius: 999,
              color: '#f2e6d2',
              background: 'rgba(12,8,5,.72)',
              border: '1px solid rgba(217,185,130,.35)',
              font: `600 11px ${sans}`,
              letterSpacing: '0.12em',
              opacity: scrollHint,
            }}
          >
            SCROLL · 浏览完整方案
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 96,
          top: 184,
          width: 600,
          opacity: reveal,
          transform: `translateY(${34 * (1 - reveal)}px)`,
        }}
      >
        <div style={{color: '#d9b982', font: `700 15px ${sans}`, letterSpacing: '0.22em'}}>ONE HTML · LIVE 3D</div>
        <h2 style={{margin: '34px 0 0', font: `500 64px/1.1 ${serif}`, letterSpacing: '-0.035em'}}>
          看空间。
          <br />
          聊设计。
          <br />
          继续改。
        </h2>
        <div style={{marginTop: 42, width: `${line * 100}%`, maxWidth: 410, height: 1, background: '#d9b982'}} />
        <p style={{margin: '28px 0 0', color: '#aaa79f', font: `400 20px/1.7 ${sans}`}}>
          拖动旋转 · 向下浏览 · 定位留言
        </p>
      </div>
      <div style={{position: 'absolute', right: 98, bottom: 72, color: '#777971', font: `500 14px ${sans}`, letterSpacing: '0.12em'}}>
        04 / 04 · INTERIOR-RENOVATION-HTML
      </div>
    </AbsoluteFill>
  );
};

const ProcessScene = ({useGeneratedClips}: SkillIntroProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const line = interpolate(frame, [0.8 * fps, 7.8 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{background: colors.paperLight, color: colors.ink}}>
      {useGeneratedClips ? (
        <Video src={staticFile('clips/02-floor-by-floor.mp4')} muted style={{...full, objectFit: 'cover', opacity: 0.28}} />
      ) : null}
      <PaperTexture />
      <FrameLabel index="02" text="处理：把审美判断拆成可验证规则" />
      <div style={{position: 'absolute', left: 130, right: 130, top: 230, height: 540}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 256, height: 2, background: colors.line}} />
        <div style={{position: 'absolute', left: 0, top: 256, height: 3, width: `${line * 100}%`, background: colors.accent}} />
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 30}}>
          {processSteps.map((step, i) => {
            const reveal = spring({frame: frame - (0.8 + i * 1.45) * fps, fps, config: {damping: 20, stiffness: 105}});
            return (
              <div
                key={step.n}
                style={{
                  minHeight: 360,
                  padding: '34px 30px',
                  border: `1px solid ${colors.line}`,
                  borderRadius: 24,
                  background: i === 2 ? colors.dark : 'rgba(255,252,246,.88)',
                  color: i === 2 ? colors.paperLight : colors.ink,
                  opacity: reveal,
                  transform: `translateY(${52 * (1 - reveal)}px)`,
                  boxShadow: '0 24px 70px rgba(46,38,30,.08)',
                }}
              >
                <div style={{font: `700 15px ${sans}`, letterSpacing: '0.14em', color: colors.accent}}>{step.n}</div>
                <h2 style={{font: `500 37px/1.25 ${serif}`, margin: '42px 0 20px'}}>{step.title}</h2>
                <p style={{font: `400 20px/1.7 ${sans}`, margin: 0, color: i === 2 ? '#c7c0b4' : colors.muted}}>{step.body}</p>
                <div style={{marginTop: 54, width: 14, height: 14, borderRadius: '50%', background: colors.accent}} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{position: 'absolute', left: 130, bottom: 90, font: `500 39px/1.3 ${serif}`}}>
        每一层，都从自己的图纸重建。
      </div>
    </AbsoluteFill>
  );
};

const FloorStoryCard = ({
  story,
  index,
}: {
  story: (typeof renderStories)[number];
  index: number;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({
    frame: frame - (0.45 + index * 0.34) * fps,
    fps,
    config: {damping: 200},
    durationInFrames: 1.1 * fps,
  });
  const detail = interpolate(frame, [2.7 * fps, 3.75 * fps], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const wholeScale = interpolate(frame, [0, 6.8 * fps], [1.015, 1.055], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const detailScale = interpolate(frame, [2.7 * fps, 6.8 * fps], [1.075, 1.025], {
    easing: Easing.out(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        minWidth: 0,
        overflow: 'hidden',
        borderRadius: 26,
        background: 'rgba(250,247,241,.92)',
        boxShadow: '0 30px 75px rgba(37,31,25,.14)',
        opacity: reveal,
        transform: `translateY(${44 * (1 - reveal)}px)`,
      }}
    >
      <div style={{position: 'relative', height: 500, overflow: 'hidden', background: '#e8e3db'}}>
        <Img
          src={staticFile(story.whole)}
          style={{
            ...full,
            position: 'absolute',
            objectFit: 'contain',
            opacity: 1 - detail,
            transform: `scale(${wholeScale})`,
          }}
        />
        <Img
          src={staticFile(story.detail)}
          style={{
            ...full,
            position: 'absolute',
            objectFit: 'cover',
            opacity: detail,
            transform: `scale(${detailScale}) translateX(${(index - 1) * 6}px)`,
          }}
        />
        <AbsoluteFill
          style={{
            background: 'linear-gradient(180deg, rgba(24,22,19,.03), rgba(24,22,19,0) 52%, rgba(24,22,19,.38))',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 24,
            bottom: 22,
            color: '#fffaf2',
            font: `700 16px ${sans}`,
            letterSpacing: '0.04em',
            textShadow: '0 2px 14px rgba(0,0,0,.36)',
          }}
        >
          {detail < 0.5 ? story.wholeLabel : story.detailLabel}
        </div>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '23px 25px 25px'}}>
        <strong style={{font: `500 31px ${serif}`, color: colors.ink}}>{story.floor}</strong>
        <span style={{font: `700 13px ${sans}`, letterSpacing: '0.13em', color: colors.accent}}>
          {detail < 0.5 ? 'WHOLE FLOOR' : 'ROOM DETAIL'}
        </span>
      </div>
    </div>
  );
};

const OutputsScene = ({useGeneratedClips}: SkillIntroProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const galleryOpacity = interpolate(frame, [6.3 * fps, 7.05 * fps], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outputOpacity = interpolate(frame, [6.55 * fps, 7.2 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const galleryScale = interpolate(frame, [0, 7 * fps], [1, 1.022], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const galleryX = interpolate(frame, [0, 7 * fps], [10, -18], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const items = [
    {title: '独立楼层 3D', x: 650, y: 515},
    {title: '完整单文件 HTML', x: 1190, y: 780},
    {title: '手机公开预览', x: 1575, y: 660},
    {title: '定位留言与历史导出', x: 1550, y: 465},
  ];
  return (
    <AbsoluteFill style={{background: colors.paperLight, overflow: 'hidden'}}>
      <AbsoluteFill style={{opacity: galleryOpacity}}>
        <AbsoluteFill
          style={{
            background: 'radial-gradient(circle at 50% 45%, #fbf7ef 0%, #e8dfd2 74%, #d7c9b7 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 82,
            right: 82,
            top: 170,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 28,
            transform: `translateX(${galleryX}px) scale(${galleryScale})`,
            transformOrigin: 'center',
          }}
        >
          {renderStories.map((story, index) => <FloorStoryCard key={story.floor} story={story} index={index} />)}
        </div>
        <div style={{position: 'absolute', left: 88, bottom: 52, color: colors.muted, font: `500 18px ${sans}`}}>
          每层一套空间骨架，每个重点房间回到同一张底图。
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: outputOpacity}}>
        {useGeneratedClips ? (
          <Video src={staticFile('clips/03-output-html.mp4')} muted style={{...full, objectFit: 'cover'}} />
        ) : (
          <PhotoBackground src="closing-output.png" zoom={1.055} panX={-24} panY={-10} />
        )}
      </AbsoluteFill>
      <div style={{opacity: galleryOpacity}}><FrameLabel index="03" text="输出：每层都有自己的整体与房间" /></div>
      <div style={{opacity: outputOpacity}}><FrameLabel index="03" text="输出：一个可以继续讨论的完整结果" /></div>
      {items.map((item, i) => {
        const reveal = spring({frame: frame - (7 + i * 0.55) * fps, fps, config: {damping: 18, stiffness: 110}});
        return (
          <div
            key={item.title}
            style={{
              position: 'absolute',
              left: item.x,
              top: item.y,
              padding: '13px 18px',
              borderRadius: 999,
              background: colors.dark,
              color: colors.paperLight,
              font: `700 17px ${sans}`,
              border: `2px solid ${colors.accent}`,
              opacity: reveal * outputOpacity,
              transform: `translate(-50%, -50%) scale(${0.85 + reveal * 0.15})`,
              boxShadow: '0 12px 34px rgba(22,20,17,.25)',
            }}
          >
            {item.title}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const OutroScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({frame: frame - 0.45 * fps, fps, config: {damping: 20, stiffness: 95}});
  const orbPulse = 1 + Math.sin((frame / fps) * Math.PI * 2) * 0.05;
  return (
    <AbsoluteFill>
      <PhotoBackground src="closing-output.png" darken={0.63} zoom={1.045} panX={18} panY={-8} />
      <div style={{position: 'absolute', left: 125, bottom: 118, width: 1280, opacity: reveal, transform: `translateY(${34 * (1 - reveal)}px)`}}>
        <div style={{font: `700 17px ${sans}`, letterSpacing: '0.19em', color: '#e28a5f'}}>
          FLOORPLAN → RENOVATION → PREVIEW
        </div>
        <h1 style={{font: `500 72px/1.08 ${serif}`, color: '#fff8ee', margin: '22px 0 24px'}}>
          一份 HTML
          <br />
          可以看 · 可以聊 · 可以继续改
        </h1>
        <p style={{font: `400 24px/1.6 ${sans}`, color: '#cfc7bc', margin: 0}}>
          图纸、逐房间说明、交互式 3D、效果图、材料预算与设计留言。
        </p>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 155,
          bottom: 142,
          width: 86,
          height: 86,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '50%',
          background: colors.accent,
          color: '#fff8ee',
          font: `700 24px ${sans}`,
          transform: `scale(${orbPulse})`,
          boxShadow: '0 0 0 16px rgba(196,94,50,.18), 0 18px 50px rgba(0,0,0,.35)',
        }}
      >
        +
      </div>
      <div style={{position: 'absolute', right: 135, bottom: 88, color: '#cfc7bc', font: `500 15px ${sans}`}}>
        interior-renovation-html
      </div>
    </AbsoluteFill>
  );
};

export const SkillIntro2D: React.FC<SkillIntroProps> = ({useGeneratedClips}) => {
  const transition = linearTiming({durationInFrames: 15});
  return (
    <AbsoluteFill style={{background: colors.paper}}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={150}>
          <IntroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={270}>
          <InputsScene useGeneratedClips={useGeneratedClips} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={300}>
          <ProcessScene useGeneratedClips={useGeneratedClips} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={300}>
          <OutputsScene useGeneratedClips={useGeneratedClips} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={240}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export const SkillIntro3D = () => {
  const transition = linearTiming({durationInFrames: 15});
  return (
    <AbsoluteFill style={{background: '#050605'}}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={180}>
          <ThreeDOpeningScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={300}>
          <Keynote3DScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={240}>
          <ThreeDInteractionScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transition} />
        <TransitionSeries.Sequence durationInFrames={225}>
          <ThreeDClosingScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export const SkillIntroPoster = () => (
  <AbsoluteFill>
    <Img src={staticFile('closing-output.png')} style={{...full, objectFit: 'cover'}} />
    <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(24,23,20,.82), rgba(24,23,20,.12) 72%)'}} />
    <div style={{position: 'absolute', left: 110, bottom: 105, width: 930}}>
      <div style={{font: `700 18px ${sans}`, letterSpacing: '0.19em', color: '#e28a5f'}}>SKILL INTRO</div>
      <h1 style={{font: `500 68px/1.1 ${serif}`, color: '#fff8ee', margin: '20px 0'}}>
        从户型图
        <br />
        到完整装修预览
      </h1>
      <p style={{font: `400 23px/1.6 ${sans}`, color: '#d0c8bc', margin: 0}}>输入有依据，楼层各自重建，输出可以继续讨论。</p>
    </div>
  </AbsoluteFill>
);

export const SkillIntro3DPoster = () => (
  <AbsoluteFill style={{overflow: 'hidden', background: '#050605', color: '#f6f2ea'}}>
    <AbsoluteFill style={{background: 'radial-gradient(circle at 70% 45%, rgba(229,203,163,.2), transparent 42%)'}} />
    <div style={{position: 'absolute', left: 106, top: 92, color: '#d9b982', font: `700 16px ${sans}`, letterSpacing: '0.22em'}}>
      INTERIOR 3D PREVIEW
    </div>
    <div style={{position: 'absolute', left: 106, top: 270, zIndex: 3}}>
      <h1 style={{margin: 0, font: `500 78px/1.08 ${serif}`, letterSpacing: '-0.04em'}}>
        把图纸，变成
        <br />
        可以接近的空间。
      </h1>
      <p style={{margin: '28px 0 0', color: '#aaa79f', font: `400 22px/1.7 ${sans}`}}>旋转 · 切层 · 定位 · 讨论</p>
    </div>
    <div style={{position: 'absolute', right: 96, top: 178, width: 920, height: 614, overflow: 'hidden', borderRadius: 28, border: '1px solid rgba(255,255,255,.22)', boxShadow: '0 48px 150px rgba(0,0,0,.62)', transform: 'rotateX(12deg) rotateZ(-4deg)'}}>
      <Img src={staticFile('3d-showcase/interactive-floor-1.png')} style={{position: 'absolute', left: '-20%', top: '-34%', width: '141%', height: '150%', objectFit: 'cover', filter: 'brightness(1.1) contrast(1.08) saturate(.96)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, #292822 0, rgba(41,40,34,.94) 38px, transparent 96px), radial-gradient(circle at 66% 38%, rgba(255,228,186,.15), transparent 44%)'}} />
    </div>
  </AbsoluteFill>
);
