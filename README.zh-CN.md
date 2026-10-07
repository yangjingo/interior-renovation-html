# 从户型图到装修预览

<p align="center">
  <a href="docs/skill-intro-slides.html">
    <img src="docs/skill-intro-video/output/2d/floorplan-to-renovation-preview-2d-poster.png" alt="从图纸证据到装修预览" width="100%" />
  </a>
</p>

<p align="center"><strong>分层图纸 + DESIGN QA + 风格参考 → 可核对的 3D、逐房间效果图与单文件 HTML</strong></p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="SKILL.md">Skill 说明</a> ·
  <a href="docs/skill-intro-slides.html">交互式 Slides</a> ·
  <a href="example/output-html/room.html">仓库示例</a> ·
  <a href="templates/DESIGN.template.md">填写 DESIGN QA</a>
</p>

## 它解决什么问题

这个 Skill 把 CAD 导出的住宅图纸、生活需求和风格参考，整理成一份可讨论、可追溯的装修概念方案。它不会把多层住宅当成同一套模型换标签：每一层都必须经过自己的图纸事实、房间台账、空间基线、3D 检查和效果图生成。

## 使用边界

输出用于空间讨论和概念决策，不代替现场测量、结构计算、消防与报建文件、机电设计、施工图或承包商报价。涉及承重墙、外窗、楼梯、厨卫移位、防水和燃气时，必须保留条件说明并交由当地专业人员复核。

公开仓库中的整屋页面是可复用示例，不代表最新的私人项目版本。当前本地项目将设计效果预览、施工图核对和逐层生活动线分析分开交付；只有经过核对和隐私检查的页面才暂存到 Vercel。新增的原始图纸、施工图审查报告和效果图工作文件留在本地；收到修订结构或水电图时，先按[图纸变更审查流程](references/drawing-change-review.md)对图，再更新客户交付物。
[脱敏版修订说明](docs/anonymized-design-revision.md)记录了近期方案变化，不附原始图纸。
[三层动线与生活场景摘要](docs/anonymized-circulation-scenarios.md)逐层列出到家、餐厨、卫浴、工作、清洁和夜间通行的设计检查点，不附私人图纸与渲染图。

| 输入物件 | 决定什么 | 推荐文件 |
| --- | --- | --- |
| 分层图纸 | 墙体、门窗、楼梯、尺寸与房间关系 | `input/plan.pdf` |
| 生活问答 | 用途、家具尺寸、预算、禁忌与待确认项 | `input/DESIGN.md` |
| 风格参考 | 色调、材料、灯光与家具语言 | `input/style-reference.png` |

## 从证据到交付

流程分为四步：读取分层图纸与 QA，建立每层独立空间基线，生成对应的 3D 与逐房间效果图，最后校验并交付响应式 HTML。

<table>
  <tr>
    <td width="50%">
      <a href="docs/skill-intro-video/output/2d/floorplan-to-renovation-preview-2d-web.mp4">
        <img src="docs/skill-intro-video/output/2d/floorplan-to-renovation-preview-2d-readme.gif" alt="自动播放的 2D 工作流预览；点击打开 MP4" width="100%" />
      </a>
      <br /><strong>01 · 读图与建立分层基线</strong><br />逐页核对事实、需求、推断与待确认项。
    </td>
    <td width="50%">
      <a href="docs/skill-intro-video/output/3d/floorplan-to-renovation-preview-3d-web.mp4">
        <img src="docs/skill-intro-video/output/3d/floorplan-to-renovation-preview-3d-readme.gif" alt="自动播放的逐层 3D 预览；点击打开 MP4" width="100%" />
      </a>
      <br /><strong>02 · 独立建模与网页交付</strong><br />输出可编辑 Blender、Web GLB、房间渲染和最终 HTML。
    </td>
  </tr>
</table>

GitHub 中的 GIF 会自动播放；点击即可打开清晰度更高的 MP4。交互式 [Slides](docs/skill-intro-slides.html) 仍保留原生内嵌播放器。

单文件校验器需要 `sharp` 才能完整解码嵌入图片；请在当前 Node 环境安装，或通过 `CODEX_PRIMARY_RUNTIME_NODE_MODULES` 提供。下面的 V31 命令还需要私有资料包与本机 `yj-home` 的 Vercel 项目绑定，只有公开仓库副本时无法直接运行。

## 快速开始

1. 将已有的建筑、结构、给排水、电气图纸、风格参考和填写后的 [`DESIGN.md`](templates/DESIGN.template.md) 放入同一个 `input/` 目录。模板记录图纸版本、逐层生活动线、门窗及家具净空、拟议机电调整与效果图核对。
2. 调用 `$interior-renovation-html`，说明是否需要 3D、逐房间效果图、预算或公开预览。
3. 在浏览器检查楼层切换、图纸、3D、图片、留言定位和移动端布局。

```powershell
# 校验真实交付
node scripts/validate-renovation-html.mjs path/to/result.html

# 按单文件交付合约校验公开回归样例
node scripts/validate-renovation-html.mjs --allow-golden-example assets/example-third-floor/output/example-third-floor-renovation.html

# 私有三层项目的来源文件齐备后，校验当前分页面交付
# 导入新图前，先在导入脚本中设置实际接受的版本号。
python scripts/import-preview-packages.py
node scripts/build-packaged-preview.mjs
python scripts/check-current-project-assets.py
node scripts/stage-yj-home.mjs

# 本地查看 Blender 配套网页模型
python -m http.server 8767 --directory example/output-blender/yj-home-blender-v9-stair-rebuild
```

## 仓库导航

- [`SKILL.md`](SKILL.md)：主流程、硬约束和阅读顺序。
- [`references/`](references/)：输入、数据、3D、材料、安全与输出合约。
- [`scripts/`](scripts/)：嵌图、校验、Blender 与发布辅助脚本。
- [`example/README.md`](example/README.md)：项目专业术语、目录用途和保留原名的例外。
- `example/work/room-renders/floorN/vNN/`：已接受的整层效果图及版本记录；效果图工作区的一级目录固定为三层。
- `example/work/circulation-design/`：逐层生活动线分析源文件；`example/work/drawing-evidence/`：CAD 平面、来源页裁片和审图裁片。这些私有工作目录不进入公开仓库。
- [`example/output-html/room.html`](example/output-html/room.html)：仓库中的设计预览快照。本地当前交付另有施工图核对页及三层动线页面；私有页面不发布到 GitHub。
- [`example/output-blender/`](example/output-blender/)：可编辑 `.blend`、GLB 和逐层检查图。
- [`docs/`](docs/)：Slides、2D/3D 视频、分镜和传播素材。
