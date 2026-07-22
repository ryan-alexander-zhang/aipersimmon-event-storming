---
id: analysis-00002-complex-business-analysis-gaps
type: analysis
role: main
status: active
parent: prd-00001-event-storming-tool
---

# 面向复杂业务分析的能力差距分析

> 现有工具(见 [prd-00001](../prd/prd-00001-event-storming-tool.md))作为**设计阶段**
> (Process/Design 级别)的 Event Storming 建模器已接近成品;本分析评估它作为
> **「分析、发现复杂业务」工具**时的结构性差距,为 [prd-00002](../prd/prd-00002-complex-business-analysis.md)
> 提供输入。方法论基准:Alberto Brandolini 的 Event Storming 与 ddd-crew glossary。

## 1. 现状盘点(已具备)

- 全部要素类型:Domain Event / Command / Actor / Aggregate / Constraint / Policy /
  Read Model / External System / Hotspot,Pivotal 为 Domain Event 的标记
  (`web/lib/eventstorming/elements.ts`)。
- **强制文法的语义连线**:`CONNECTION_RULES` 拒绝非法连接
  (`web/lib/eventstorming/relations.ts`)。
- 确定性布局:band × timeline × bounded context,含并发事件
  (`web/lib/layout/layout.ts`)。
- Big Picture ⊂ Process ⊂ Design 层级过滤 + 语义缩放 + Isolate 聚焦
  (`web/lib/eventstorming/levels.ts`)。
- JSON DSL 往返导入导出、localStorage 自动保存
  (`web/lib/dsl/schema.ts`、`web/lib/store/persistence.ts`)。

核心判断:「做出一张整洁的、已设计好的模型」的能力足够;**复杂业务恰恰在「整洁之前」被发现**——工具缺的是发现阶段与运转闭环。

## 2. 差距(按处理决定)

本次纳入 prd-00002 的 7 项:#1、#3、#4、#5、#6、#7、#8。**#2 协作**方法论价值最大但暂缓(仍为 non-goal)。

### #1 缺少发散式的混沌探索阶段
- **现状**:一进入即是强制文法 + 自动整列的结构化看板;`isValidConnection` 在探索期成为枷锁。Big Picture 仅是显示过滤器,非自由摆放模式。
- **对复杂业务的影响**:无法保留「顺序未知 / 重复 / 谁触发未知」的混乱,而复杂性正是在这种混乱中被逼出。
- **方向**:Big Picture 级开放**有界的自由摆放探索模式**(无序 Domain Event、弱文法),收敛时「升格」到结构化看板。
- **冲突**:直接触碰 [decision-00002](../decision/decision-00002-structured-board-not-free-canvas.md)(结构化看板而非自由画布),需由 [decision-00004](../decision/decision-00004-discovery-mode-free-placement.md) 收窄解除。

### #3 Hotspot 只能贴、不运转;缺 Opportunity
- **现状**:Hotspot 可贴,无投票 / 优先级 / 负责人 / 解决状态 / 升格为决策;正向对应物 **Opportunity 未实现**(idea doc 提及未做)。
- **影响**:能可视化复杂性,却无法分诊(triage)与处理。
- **方向**:Hotspot 运转闭环(dot voting、状态机、指派)+ 新增 Opportunity 要素。

### #4 缺少通往战略 DDD 的桥梁
- **现状**:Bounded Context 仅是视觉分列;无子域分类(core/supporting/generic),无上下文间关系(upstream/downstream、ACL、Conformist、Shared Kernel)。
- **影响**:复杂业务的难点在集成边界,当前无法表达与分析。
- **方向**:子域分类 + 上下文关系语义(Context Map 雏形)。

### #5 没有叙事式走查(讲故事验证)
- **现状**:无沿时间线前后步进复述的模式。
- **影响**:复杂流程的遗漏/矛盾常在复述中才暴露。
- **方向**:基于现有 Isolate 机制的「播放/步进」走查模式。

### #6 规模化 / 层级化天花板
- **现状**:无嵌套下钻(不能从 Big Picture 事件潜入其内部 Process 看板);疑似无搜索/过滤/缩略图导航。
- **影响**:单张扁平看板撑不起企业级复杂度,几百节点巡视困难。
- **方向**:搜索/过滤/缩略图 + ~~事件级下钻(层级模型)~~。
  > **已复核(decision-00006)**:"事件级下钻"建立在错误心智模型上——领域事件是一个瞬间事实,不是容纳子流程的容器,ES 也无此原语。规模化改由搜索/过滤/缩略图(FR7)解决;真正的多级分解应以**区域 / Bounded Context**为单位另开 Process 看板(非单个事件),已延后。

### #7 缺少模型「健康度分析」
- **现状**:未利用「结构化模型」优势做校验。
- **影响**:复杂模型质量无自动保障。
- **方向**:检测孤立事件、悬空 Command、职责过载 Aggregate、Policy 环路、未解决 Hotspot 计数等坏味道。**现有资产成本最低、杠杆最高。**

### #8 缺少 as-is / to-be 版本管理
- **现状**:可做文件 diff,但无应用内快照 / 分支 / 对比。
- **影响**:业务重设计场景无法把「现状 vs 改进方案」并排讨论。
- **方向**:模型快照、命名版本、并排对比。

## 3. 性价比与建议顺序

| 项 | 价值 | 改造成本 | 触碰既有决策 | 建议序 |
|---|---|---|---|---|
| #7 模型健康度 | 中高 | 低(纯读现有模型) | 无 | 1 |
| #3 Hotspot 运转 + Opportunity | 高 | 中 | 无(扩要素) | 2 |
| #5 叙事走查 | 中 | 低~中 | 无 | 3 |
| #6 导航 + 下钻 | 高 | 中~高(层级) | 无 | 4 |
| #4 战略层 | 高 | 中~高 | 扩 DSL/关系 | 5 |
| #8 版本管理 | 中 | 中 | 扩持久化 | 6 |
| #1 探索模式 | **最高(转型拐点)** | 高 | **改 decision-00002** | 7(大手术,单列 decision) |

> #1 收益最大但需大手术且触碰核心决策,建议先用低成本高杠杆项(#7/#3/#5)跑通 doc→实现闭环,再攻 #1。最终顺序由 prd-00002 与各 spec 排期确定。

## 4. 未纳入本轮

- **#2 实时协作**:Event Storming 方法论价值最大项(把所有干系人拉进同一房间),但 prd-00001 已列 non-goal,涉及后端/账号/在线状态,单列后续。本轮维持单用户、纯本地。
