---
id: analysis-00001-tech-stack-and-tooling
type: analysis
role: main
status: active
parent: idea-00001-visual-event-storming-web-tool
---

# 技术栈与工具分析

> 针对 [idea-00001-visual-event-storming-web-tool](../idea/idea-00001-visual-event-storming-web-tool.md) 的技术选型分析。
> 已确认基调:**Next.js + React Flow + Process Level + 结构化 JSON + 浏览器本地存储**。

## 1. 核心决策:画布引擎

这是整个项目最关键的选型,直接决定架构复杂度和 DSL 导出难度。

| 方案 | 模型 | 授权 | 导出 DSL | 上手/工作量 | 结论 |
|---|---|---|---|---|---|
| **React Flow (@xyflow/react)** | 节点+边(有向图) | **MIT 免费** | ✅ 天然结构化,节点/边即数据 | 中,自定义节点=React 组件 | ✅ **选用** |
| tldraw SDK | 自由白板/图形 | 商用 **$6000/年** | ⚠️ 需从图形反推语义 | 低(体验好) | ❌ 授权+模型不匹配 |
| Excalidraw | 手绘白板 | MIT | ⚠️ 同上,面向绘图 | 低 | ❌ 无结构化语义 |
| 纯自研 Canvas/SVG | 自定义 | 自有 | ✅ 完全可控 | 高(拖拽/缩放/连线/对齐全自造) | ❌ 重复造轮子 |

**为何 React Flow 最合适**:Event Storming 本质是「带语义的有向图」(元素=节点,因果=边),与 React Flow 的数据模型 100% 对齐。节点是普通 React 组件,方便做各色贴纸;`nodes`/`edges` 数组可直接序列化为 DSL,导入/导出近乎零转换成本。MIT 免费无商用风险。

**React Flow 关键能力**(均内置):拖拽、缩放、平移、多选框选、自定义节点/边、连接校验(`isValidConnection`)、`toObject()` 序列化、受控/非受控模式、minimap、背景网格。

## 2. 推荐技术栈总览

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | **Next.js (App Router) + TypeScript** | 用户指定;静态导出即可部署,未来加后端无缝 |
| 画布 | **@xyflow/react (React Flow v12)** | 见上 |
| 状态管理 | **Zustand** | React Flow 官方示例即用 Zustand;轻量,适合画布高频更新 |
| Schema/校验 | **Zod** | 单一事实源:同时产出 TS 类型 + 运行时校验 + 导入校验 |
| 样式 | **Tailwind CSS** | 快速、与 shadcn 配套 |
| UI 组件 | **shadcn/ui** | 属性面板、对话框、下拉等;可复制、无重依赖 |
| 图标 | **lucide-react** | 各元素类型配图标 |
| 本地存储 | **localStorage**(小)/ **IndexedDB via idb / Dexie**(大) | 自动保存;零后端 |
| 唯一 ID | **nanoid** | 节点/边 id 生成 |
| 自动布局(可选) | **dagre** 或 **elkjs** | 时间线从左到右自动排布 |
| 包管理/运行 | **bun**(用户指定 `bun create next-app`) | |

**初始化命令**:

```bash
bun create next-app@latest event-storming-app --yes
cd event-storming-app
bun add @xyflow/react zustand zod nanoid lucide-react
# 可选: bun add dagre  (自动布局)
# shadcn: bunx --bun shadcn@latest init
```

## 3. 状态与数据流架构

```
┌─────────────┐   拖拽/编辑    ┌──────────────┐
│ 元素面板/画布 │ ───────────▶ │ Zustand Store │  (nodes, edges, selection)
└─────────────┘              └──────┬───────┘
                                    │ 派生
                          ┌─────────▼─────────┐
                          │  Zod Schema (DSL) │  ← 单一事实源
                          └─────────┬─────────┘
                    序列化/校验       │       反序列化/校验
              ┌───────────────┐      │      ┌───────────────┐
              │ 导出 JSON 文件 │◀─────┴─────▶│ 导入 JSON 文件 │
              └───────────────┘             └───────────────┘
                          │ 自动保存
                  ┌───────▼────────┐
                  │ localStorage/  │
                  │  IndexedDB     │
                  └────────────────┘
```

- Zustand store 持有画布运行态(含坐标),Zod schema 定义 DSL 与 store 共享的类型。
- 导出 = store → Zod `parse` 校验 → `JSON.stringify`。
- 导入 = `JSON.parse` → Zod `safeParse`(错误友好提示)→ 灌入 store。
- 自动保存 = 订阅 store 变更,防抖写入本地存储。

## 4. 关键技术点与风险

| 点 | 方案 | 备注 |
|---|---|---|
| React Flow SSR | 只在客户端渲染画布(`"use client"` / dynamic import `ssr:false`) | Next.js App Router 需注意 |
| 连线语义校验 | `isValidConnection` + 节点类型规则表 | 防止非法连接(如 Actor→Event) |
| 大图性能 | React Flow `onlyRenderVisibleElements`、memo 化自定义节点 | 首版规模可控 |
| DSL 版本演进 | schema 带 `version` 字段 + 迁移函数 | 保证旧文件可读 |
| 无损往返 | 导出保留 position 等 UI 字段 | import→export 幂等 |
| 颜色/可达性 | 颜色 + 文案标签双重区分,不只靠颜色 | 色盲友好 |

## 5. 参考项目与资料

| 资源 | 用途 |
|---|---|
| [ddd-crew/eventstorming-glossary-cheat-sheet](https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet) | 元素定义与颜色约定(权威参考) |
| [Rotorsoft/esml](https://github.com/Rotorsoft/esml) | Event Storming JSON/DSL 建模思路参考 |
| [lgazo/event-modeling-tools](https://github.com/lgazo/event-modeling-tools) | 文本 DSL → 图 的思路 |
| [mariuszgil/awesome-eventstorming](https://github.com/mariuszgil/awesome-eventstorming) | Event Storming 资料合集 |
| [React Flow / xyflow 文档](https://reactflow.dev/) | 画布 API |
| [asyncapi 讨论 #91](https://github.com/orgs/asyncapi/discussions/91) | 未来 AsyncAPI 导出参考 |

## 6. 建议的落地顺序

1. `bun create next-app` 脚手架 + 装依赖 + Tailwind/shadcn。
2. 定义 Zod DSL schema(元素类型、关系类型、顶层结构)。
3. 集成 React Flow,搭出空画布(缩放/平移/网格/minimap)。
4. 实现各元素自定义节点组件(颜色/图标/可编辑)。
5. 左侧元素面板 + 拖拽生成节点。
6. 语义连线 + `isValidConnection` 校验。
7. 属性面板(编辑选中节点)。
8. 导出/导入 JSON(Zod 校验)。
9. 本地自动保存(防抖 → localStorage/IndexedDB)。
10. Hotspot 标注 + 画布整理/自动布局(可选)。

## 7. 部署

纯前端应用 → `next build` 可静态导出,部署到 Vercel / GitHub Pages / 任意静态托管。无需后端与数据库(与「本地存储、无协作」的定位一致)。
