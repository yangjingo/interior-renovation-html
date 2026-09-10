# Skill Intro Video

两支彼此独立的 16:9 `interior-renovation-html` 介绍片：2D 版保留原来的 40 秒工作流叙事；3D 版是全新 30 秒功能视频，不再嵌进 2D 时间线。

## 输入与输出

- 输入：分层 CAD/PDF 图纸、尺寸与楼层标签、生活需求 QA、风格参考、材料偏好。
- 处理：逐层事实核对、逐房间说明、独立空间基线、3D 与效果图对应、交付前校验。
- 输出：单文件响应式 HTML，包含底图、房间说明、交互式 3D、效果图、材料预算、手机预览和定位留言。

## 渲染

```powershell
cd remotion
npm install
npm run render:2d
npm run render:2d:web
npm run render:3d
npm run render:3d:web
```

只更新网页分享版时，先运行对应的 `npm run render:2d` 或 `npm run render:3d` 生成母版，再运行对应的 `render:2d:web` 或 `render:3d:web`；分享版会缩放为 1280 × 720、移除空音轨并写入 fast-start 元数据。

成片输出包含：

- `output/2d/`：2D 1080p 母版、Web 分享版、海报和 `subtitles/`。
- `output/3d/`：3D 1080p 母版、Web 分享版、海报和 `subtitles/`。
- `output/release-manifest.json`：当前 2D / 3D 发布文件及哈希。

视频中使用的六张楼层与房间效果图记录在 [`selected-renders.md`](selected-renders.md)。Remotion 使用的稳定副本位于 `remotion/public/selected-renders/`。

分镜与动效节拍记录：

- [2D 逐镜分镜](storyboard-2d.md)
- [3D 逐镜分镜](storyboard-3d.md)
- [2D / 3D 合并制作记录](storyboard-2d-3d.md)

默认版本使用生成的首尾关键帧和 Remotion 动画，不依赖网络，也不含旁白或音乐。

若已配置 `OPENAI_API_KEY` 与 Sora 权限，可按 `prompts/` 生成三个 8 秒片段，放入 `remotion/public/clips/`，再将 `Root.tsx` 中的 `useGeneratedClips` 改为 `true` 后重新渲染。

## 视觉原则

- 画面保持 65–75% 呼吸空间，避免功能堆叠。
- 视觉锚点集中在输入物件、三层模型和最终 HTML 三处。
- 全片只使用铁锈橙作为强调色。
- 输入物件以柔和光影和外围压暗聚焦，禁止使用土黄色或橙色描边矩形框选。
- 静态底图必须有逐帧驱动的轻微推近与平移，形成连续镜头感；不使用 CSS transition / animation。
- 字幕短、疏、可在手机端阅读。
- 保留纸张、模型、印刷与扫描颗粒，不做蓝紫霓虹科技风。
- 3D 版从第一帧起使用深色舞台、移动光影、模型分层和镜头俯仰变化；不复用 2D 工作台场景。
- 三张楼层模型必须来自三个独立楼层，不允许用同一模型换标签制造分层动画。
