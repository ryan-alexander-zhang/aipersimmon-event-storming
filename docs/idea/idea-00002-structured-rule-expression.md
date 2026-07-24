---
id: idea-00002-structured-rule-expression
type: idea
role: main
status: active
parent: prd-00001-event-storming-tool
---

# 规则元素的结构化表达（Policy / Constraint）— 构想

> 现状:承载业务规则的两个元素 **Policy** 与 **Constraint** 都只靠一行
> `description` 自由文本表达。复杂规则(带条件、阈值、自动/人工之分)在纯文本里
> 不够**具象**,也无法被模型健康度等能力利用。
> 本构想只主张一件事:给这两个元素补**轻量、可选的结构化字段**。
> 背景差距见 [analysis-00002-complex-business-analysis-gaps](../analysis/analysis-00002-complex-business-analysis-gaps.md)
> §3——该分析明确把 Policy 相关表达列在 prd-00002 范围之外,本构想正好补这个缺口。

## 1. 一句话定位

让 **Policy**(反应式规则)与 **Constraint**(不变量/前置条件)从"一句话描述"升级为
"一句话 + 几个可选结构化字段",在不破坏贴纸轻量感的前提下把规则表达得更具象、可校验。

## 2. 问题陈述

- 全部元素目前的 `properties` 只有 `description`(外加 Domain Event 的 `pivotal`、
  Hotspot 的 `kind/priority/state`),规则语义没有专属承载位。
- **Policy** 是"当 X 发生就做 Y"的反应规则,但复杂 Policy 通常还含:
  - **guard / 条件**——"当司机拒单,**且重试 < 3 次**,才重新匹配";
  - **参数 / 阈值**——retry=3、radius=2km、timeout=30s;
  - **自动 vs 人工**——Event Storming 明确区分 automatic 与 manual policy(后者需人决策)。
  这些现在只能塞进一行文本,读者无法一眼分辨"接线之外的规则细节"。
- **Constraint** 是命令的设计输入(必须成立才能执行),但现在缺**不变量表达式本身**,
  只有一句泛泛的描述。
- 图已经表达了**接线**(`event triggers policy invokes command`、
  `command constrainedBy constraint`),`description` 表达了**意图**,中间的
  "条件 / 参数 / 执行方式 / 不变量"是结构性空白。

## 3. 范围(只做 B)

**纳入**:给 Policy 与 Constraint 增加**可选的**结构化字段(见 §4)。沿用 Hotspot
`kind/priority/state` 已经建立的"`properties` 增量扩展、全部可选、缺省即回退"先例,
对既有模型与导入导出保持向后兼容。

**明确不做(non-goal)**:

- **C. 完整 GWT / 规则编辑器**——把贴纸变成迷你 spec 编辑器,过度设计,违背
  Simplicity First。
- **D. 新增 Process / Saga 元素**——为复杂多步编排引入独立原语,是扩 DSL 的更大议题,
  应单独立项(FTGO 那类 saga 目前用多条 Policy 近似)。
- 规则的**可执行 / 求值**语义——本轮只做"人类可读 + 可轻量校验"的表达,不做规则引擎。

## 4. 提案(字段,概念级)

> 仅表达"该有哪些位置",精确 schema/类型/UI 留给后续 spec。

**Policy** 追加(均可选):

- `condition` — 规则的 guard/前置条件(那个"if"),自由文本。
- `execution` — `automatic | manual`,区分自动反应与需人决策的反应。
- `parameters` — 阈值/参数的轻量承载(如 retry、radius、timeout);形态待 spec 定,
  倾向"结构化但不过度"(而非任意嵌套对象)。

**Constraint** 追加(可选):

- `rule` — 不变量 / 前置条件的表达式或断言句,承载"必须成立"的那条规则本身。

**共同原则**:全部可选、可缺省;缺省时行为与今天完全一致;不改变任何连线文法。

## 5. 早期价值判断

- **可行**:纯 `properties` 增量,已有 Hotspot 扩展先例,成本低。
- **价值**:复杂 Policy/Constraint 变得可分辨、可比较;为后续**模型健康度**留出抓手
  (例如"标了 manual 却无 Actor 决策""Policy 有 parameters 却无 condition"等坏味道)。
- **风险**:字段设计若过度会滑向 C(规则引擎/编辑器);需在 spec 阶段守住"轻量、可选"。
- **边界清晰**:不碰连线文法、不新增元素、不做求值,是一次低风险的表达力增强。

## 6. 与现有能力的关系

- 与 [analysis-00002](../analysis/analysis-00002-complex-business-analysis-gaps.md):
  补其 §3 明确留白的 Policy 表达缺口,与 #3(Hotspot 运转)是同一类"让贴纸更具象/可运转"的思路。
- 与模型健康度(analysis-00002 #7):新字段是健康度规则的潜在输入,但本构想不依赖它先落地。
- 后续若推进 **D(Process/Saga)**,本构想的字段可平滑并入,二者不冲突。
