# 项目资料目录与专业命名

本目录按设计交付、原始依据和可再生工作素材分开管理。**效果图表达方案意向；建筑、结构、给排水和电气图纸是不同的专业依据。**文件名不能代替图纸核验或现场复尺。

| 目录 | 专业用途 | 命名示例 |
| --- | --- | --- |
| `input/` | 原始建筑、结构、给排水、电气图纸及设计要求 | 保留原文件名与来源 |
| `input/archives/` | 用户提交的各层原始资料包 | 保留原压缩包名与 SHA-256 清单 |
| `work/room-renders/floorN/vNN/` | 已接受的整层效果图及紧邻前版 | `floor2-overall-render-v25.png`、`version.json` |
| `work/circulation-design/` | 各层生活动线分析 HTML 输入 | `floor2-circulation.html` |
| `work/drawing-evidence/` | 施工图核对所需的图纸依据与索引 | `floor2-source-cad-plan.png`、`room-design-index.json` |
| `work/drawing-evidence/source-sheet-extracts/` | 从原始图纸截取的来源页局部 | `floor3-structural-beam-plan-gs07.png` |
| `work/drawing-evidence/review-sheet-extracts/` | 去除标题栏后用于核对说明的图纸裁片 | `floor2-plumbing-plan.webp` |
| `output-html/` | 可打开的设计预览、动线页面与施工图核对页面 | `room.html`、`room-review.html` |
| `output-blender/` | Blender 模型与相关可视化交付 | 保留模型原有版本和外部资源引用 |

## 文件名用语

图像采用 `floorN-<专业或空间>-<图种或视角>-vNN.<ext>`；图纸没有设计版本号时，使用图号或 `source`、`current` 表示来源状态。`floorN` 与固定渲染版本目录一致，不把图纸裁片存入效果图目录。

| 文件名词组 | 对应专业用语 | 使用边界 |
| --- | --- | --- |
| `overall-render` | 整层效果图 | 设计意向，不代表施工图 |
| `previous-scheme-plan` | 前版方案平面图 | 历史方案，不写成现状实测图 |
| `architectural-plan` | 建筑平面图 | 建筑专业图纸 |
| `structural-beam-plan` / `structural-slab-plan` | 结构梁图 / 板图 | 不由效果图推定结构属性 |
| `plumbing-plan` | 给排水平面图 | 供排水专业依据 |
| `electrical-socket-plan` | 电气插座平面图 | 不与弱电或配电系统图混称 |
| `low-voltage-plan` | 弱电平面图 | 信息、通信等弱电点位 |
| `source-cad-plan` | 来源 CAD 平面图导出件 | 保留用户提交图的来源属性 |
| `circulation` | 生活动线分析 | 包含路线、家具与门窗通行关系 |

原始 PDF、压缩包及 `input/image.png` 保留提交时的名称，避免破坏来源追溯。`room.html`、`room-review.html`、`floorN-circulation.html` 是已发布入口；`version.json`、数据字段、图中已有的证据 ID 是生成和核对契约。历史清理记录与一次性脚本记录的是当时的路径，不作为当前更新入口。当前工作流和检查命令见 [output-html/README.md](output-html/README.md)。

## 本次目录检查

2026-10-07 已统一命名 38 个可再生项目文件：6 张整层效果图、3 张 CAD 平面导出图、3 张前版方案图、13 张审图裁片、12 张来源页裁片和 1 份房间设计索引；同时把旧的 `embedded/`、`source-crops/` 明确为审图裁片与来源页裁片目录。6 份效果图版本记录及 13 条图纸来源记录已同步修改路径。所有移动前后的文件 SHA-256 相同。

运行 `python scripts/check-current-project-assets.py` 可核对固定目录、专业文件名、版本与图纸来源记录，以及当前页面实际嵌入的三张整层图。当前项目页面重建后的 SHA-256 与改名前一致，部署暂存目录中的设计页和审图页也与本地逐字节一致。旧版一次性迁移脚本及历史清理清单保留原术语作为历史记录；不要用它们重建当前 V31 页面。
