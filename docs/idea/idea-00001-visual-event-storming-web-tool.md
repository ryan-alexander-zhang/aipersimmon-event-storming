---
id: idea-00001-visual-event-storming-web-tool
type: idea
role: main
status: active
---

# Event Storming 可视化 Web 工具 — 产品构想

> 一个在浏览器里做 Event Storming、并能一键导出为结构化 DSL(JSON) 的可视化工具。
> 首版聚焦 **Process Level(流程级)** 建模,单人使用,无协作。
> 技术选型见 [analysis-00001-tech-stack-and-tooling](../analysis/analysis-00001-tech-stack-and-tooling.md)。

## 1. 一句话定位

用节点画布重现 Event Storming 工作坊的贴纸墙,让用户拖拽出「Actor → Command → Aggregate → Domain Event → Policy → …」的业务流程,并把这张图导出为机器可读、可校验的 JSON DSL,供后续架构设计 / 代码生成 / 文档使用。

## 2. 问题陈述

- Event Storming 目前多在物理墙 / Miro 等通用白板上做,产出是**图片或自由贴纸**,不可机器解析、不可版本化、难以进入工程流水线。
- 通用白板缺少领域**语义**(元素类型、颜色约定、连线因果规则),事后无法可靠还原为结构化模型。
- 需要一个**轻量、单人、零后端**的工具,既保留贴纸墙的直觉,又能导出**结构化、可校验、可 diff** 的 DSL。

## 3. 目标用户与场景

- **DDD / 架构师**:整理限界上下文与事件流,产出可版本化的模型。
- **产品 / 技术负责人**:在设计阶段梳理业务流程、发现 Hotspot(冲突/风险)。
- **个人学习者**:按 ddd-crew 规范练习 Event Storming。

典型流程:新建画布 → 从元素面板拖出贴纸 → 连线表达因果 → 标注 Hotspot → 导出 JSON / 导入继续编辑。

## 4. 领域元素模型(Process Level)

参考 [ddd-crew/eventstorming-glossary-cheat-sheet](https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet) 与通用颜色约定:

| 元素 | 颜色 | 含义 | 备注 |
|---|---|---|---|
| **Domain Event** | 橙 | 领域内已发生的事(过去时) | 时间线主干 |
| **Command** | 蓝 | 意图/动作/决策(现在时) | 触发 Event |
| **Actor / Agent** | 小黄 | 发起 Command 的人/角色 | |
| **Aggregate** | 大黄 | 一致性边界,处理 Command 发出 Event | Design 层演进为边界 |
| **Policy** | 淡紫 | "当 X 发生就做 Y" 的自动/人工反应 | 连接 Event→Command |
| **Read Model / Query** | 绿 | Actor 决策所需信息 | |
| **External System** | 粉 | 交互的外部系统(黑盒) | |
| **Hotspot** | 荧光粉 | 冲突/疑问/风险 | 可挂在任意元素旁 |
| **Pivotal Event** | 橙+竖线 | 最关键的少数事件 | Domain Event 的标记态 |
| **Opportunity** | 绿(小) | 正向机会点 | 可选 |

**语法(连线规则)**:

```
Actor ──issues──▶ Command ──handledBy──▶ Aggregate ──emits──▶ Domain Event
Domain Event ──triggers──▶ Policy ──invokes──▶ Command
Read Model ──informs──▶ Actor
External System ──emits/receives──▶ Domain Event / Command
Hotspot ──annotates──▶ (任意元素)
```

连线在导出时带 **语义类型**(issues / handledBy / emits / triggers / invokes / informs / annotates),而非仅几何连接。

## 5. 核心功能(首版 MVP)

1. **无限画布**:拖拽、缩放、平移、框选。
2. **元素面板**:左侧按颜色分类的贴纸,拖拽到画布生成对应类型节点。
3. **自定义节点**:每种元素一个组件,含颜色、图标、可编辑标题/描述。
4. **语义连线**:连线时选择/自动推断关系类型;非法连接给出提示(如 Actor 不能直接连 Event)。
5. **Hotspot 标注**:随时给任意节点挂 Hotspot。
6. **属性面板**:选中节点后编辑名称、描述、标签、额外字段。
7. **导出 JSON DSL**:符合自定义 schema、经校验;同一 JSON 即保存/加载载体。
8. **导入 JSON**:回读继续编辑。
9. **本地持久化**:localStorage/IndexedDB 自动保存,防丢失。
10. **画布整理**:对齐、吸附、可选自动布局(时间线从左到右)。

**首版明确不做**:实时协作、多人光标、账号系统、后端数据库、PNG/PlantUML 导出(列入路线图)。

## 6. DSL 设计原则

- **结构化 + 可校验**:schema 是唯一事实源,前端类型与导出格式共用。
- **语义优先**:保留元素类型与关系类型,不只是坐标图形。
- **无损往返**:导出的 JSON 能完整还原画布(含布局坐标),import→export 幂等。
- **人类可读**:字段命名清晰,便于手改与 diff。
- 参考 [ESML](https://github.com/Rotorsoft/esml) 的元素/关系建模思路,但采用自有、更贴合 UI 的 schema。

DSL 顶层草案:

```jsonc
{
  "version": "1.0",
  "meta": { "name": "订单流程", "level": "process", "createdAt": "..." },
  "nodes": [
    { "id": "e1", "type": "domainEvent", "label": "订单已创建",
      "position": { "x": 200, "y": 120 }, "properties": { "description": "..." } }
  ],
  "edges": [
    { "id": "r1", "source": "c1", "target": "a1", "relation": "handledBy" }
  ],
  "hotspots": [
    { "id": "h1", "attachedTo": "e1", "text": "库存扣减时机?" }
  ]
}
```

## 7. 早期价值判断

- **可行**:核心是「带语义的有向图」+ 序列化,成熟前端库即可覆盖,无后端。
- **差异化**:相比通用白板,产出**结构化可校验 DSL**;相比纯文本 DSL 工具,保留**可视化直觉**。
- **风险**:语义连线的约束规则设计、DSL 版本演进的兼容性。
- **首版边界清晰**:单人 + 本地 + JSON,能快速落地验证价值。

## 8. 路线图(首版之后)

- v1.1:导出 PlantUML / Mermaid;PNG/SVG 快照。
- v1.2:Big Picture 与 Software Design 层级切换;泳道 / 限界上下文分组。
- v1.3:File System Access API 直接读写本地 `.json` 项目文件。
- v2.0:AsyncAPI / 事件契约导出;(可选)引入协作后端。
