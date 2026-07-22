import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const fixture = (name: string) => path.join(__dirname, "fixtures", name);

const addContext = (page: Page) => page.getByRole("button", { name: "Add context" }).click();
const addEvent = (page: Page) => page.getByRole("button", { name: "Event", exact: true }).first().click();
// add a Domain Event (via the context header) and label it, so tests can track it
const addLabeledEvent = async (page: Page, label: string) => {
  await addEvent(page);
  await page.getByLabel("Label", { exact: true }).fill(label);
};
// flow-space left edge of the event whose label matches
const xOf = async (page: Page, label: string) =>
  (await nodes(page, "domainEvent").filter({ hasText: label }).boundingBox())!.x;
const addUngroupedEvent = (page: Page) =>
  page.getByRole("button", { name: "Add Domain Event" }).click();
const palette = (page: Page, label: string) =>
  page.getByRole("button", { name: `Add ${label}` }).click();
const slice = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).click();
const nodes = (page: Page, type: string) => page.locator(`.react-flow__node-${type}`);
const edges = (page: Page) => page.locator(".react-flow__edge");

const normalize = (m: { nodes: { id: string }[]; edges: { id: string }[]; contexts: { id: string }[] }) => ({
  nodes: [...m.nodes].sort((a, b) => a.id.localeCompare(b.id)),
  edges: [...m.edges].sort((a, b) => a.id.localeCompare(b.id)),
  contexts: [...m.contexts].sort((a, b) => a.id.localeCompare(b.id)),
});

test("adds a Domain Event into its band via a context header [us-00001-AC-1.1, us-00006-AC-1.1]", async ({
  page,
}) => {
  await page.goto("/");
  await addContext(page);
  await addEvent(page);
  await expect(nodes(page, "domainEvent")).toHaveCount(1);
  await expect(nodes(page, "domainEvent")).toContainText("Domain Event");
  // conventional colour (orange #F6A623)
  const body = nodes(page, "domainEvent").locator("[data-testid=node-body]");
  expect(await body.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(246, 166, 35)");
});

test("creates ungrouped Domain Events on the timeline — no context bar or tint [issue-00006, issue-00011]", async ({
  page,
}) => {
  await page.goto("/");
  // empty board — no context created first
  await addUngroupedEvent(page);
  await expect(nodes(page, "domainEvent")).toHaveCount(1);
  // decision-00005: no spanning "Ungrouped" group bar; an ungrouped event has no tint
  await expect(page.getByText("Ungrouped", { exact: true })).toHaveCount(0);
  await expect(nodes(page, "domainEvent").locator("[data-testid=node-body]")).not.toHaveAttribute(
    "data-context-tint",
  );

  // deselect (the palette lives in the empty panel) so a second ungrouped event
  // can be added; it takes the next global timeline slot
  await page.locator(".react-flow__pane").click({ position: { x: 10, y: 10 } });
  await addUngroupedEvent(page);
  await expect(nodes(page, "domainEvent")).toHaveCount(2);
  const xs = await nodes(page, "domainEvent").evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().x),
  );
  expect(Math.max(...xs)).toBeGreaterThan(Math.min(...xs)); // distinct global columns
});

test("creates an Actor directly at Big Picture, no Command needed [us-00007-AC-5.1, decision-00003]", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Big Picture" }).click();
  // the empty-panel palette offers Big Picture stickies only (assert before adding,
  // while nothing is selected and the palette is shown)
  await expect(page.getByRole("button", { name: "Add Actor" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Command" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Aggregate" })).toHaveCount(0);
  await palette(page, "Actor");
  await expect(nodes(page, "actor")).toHaveCount(1);
});

test("a Command produces a Domain Event without an Aggregate [us-00007-AC-1.2, decision-00003]", async ({
  page,
}) => {
  await page.goto("/"); // default Design level
  await addUngroupedEvent(page); // event created and selected
  await slice(page, "+ Command (produces)");
  await expect(nodes(page, "command")).toHaveCount(1);
  await expect(nodes(page, "aggregate")).toHaveCount(0); // no aggregate invented
  await expect(page.getByText("produces", { exact: true })).toBeVisible();
});

test("Constraint and Aggregate are offered only at Design [us-00008-AC-1.2, decision-00003]", async ({ page }) => {
  await page.goto("/"); // Design
  await palette(page, "Command"); // command created and selected
  await expect(page.getByRole("button", { name: "+ Constraint (constrains)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Aggregate (handled by)" })).toBeVisible();
  // drop to Process → the Design-only slice actions disappear (selection kept)
  await page.getByRole("button", { name: "Process", exact: true }).click();
  await expect(page.getByRole("button", { name: "+ Constraint (constrains)" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "+ Aggregate (handled by)" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "+ Actor (issues)" })).toBeVisible(); // Process-level still there
});

test("adds events across two contexts on one global timeline [us-00006-AC-1.1, us-00015-AC-1.1]", async ({
  page,
}) => {
  await page.goto("/");
  await addContext(page);
  await addContext(page);
  const evBtns = page.getByRole("button", { name: "Event", exact: true });
  await evBtns.nth(0).click(); // global order 0
  await evBtns.nth(1).click(); // global order 1 (across contexts, one timeline)
  await expect(nodes(page, "domainEvent")).toHaveCount(2);
  const xs = await nodes(page, "domainEvent").evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().x),
  );
  expect(Math.max(...xs)).toBeGreaterThan(Math.min(...xs)); // sequential global order → distinct columns
});

test("a context'd event shows a context tint stripe [us-00015-AC-3.1]", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addEvent(page);
  const body = nodes(page, "domainEvent").locator("[data-testid=node-body]");
  await expect(body).toHaveAttribute("data-context-tint", /^#[0-9a-f]{6}$/i);
});

test("only timeline elements are drag-enabled; others stay locked [us-00007-AC-4.1]", async ({
  page,
}) => {
  await page.goto("/");
  await addContext(page);
  await addEvent(page); // one event, selected
  await slice(page, "+ Command (produces)");
  // non-timeline elements cannot be dragged at all (no free positioning)
  await expect(nodes(page, "command")).not.toHaveClass(/draggable/);
  // Domain Events are drag-enabled — but only to reorder the timeline; their
  // position is still computed (a drag edits `order`, verified at the store level
  // in store.test.ts and by the layout tests; RF pointer-drag isn't simulable in
  // Playwright, so the drag itself is verified manually per design-00004 §9).
  await expect(nodes(page, "domainEvent")).toHaveClass(/draggable/);
});

test("moves an event to the start with the panel button [us-00010-AC-4.1]", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addLabeledEvent(page, "Alpha");
  await addLabeledEvent(page, "Bravo");
  await addLabeledEvent(page, "Charlie"); // x order: Alpha < Bravo < Charlie
  await nodes(page, "domainEvent").filter({ hasText: "Charlie" }).click();
  await page.getByRole("button", { name: "Move to start" }).click();
  expect(await xOf(page, "Charlie")).toBeLessThan(await xOf(page, "Alpha"));
  expect(await xOf(page, "Alpha")).toBeLessThan(await xOf(page, "Bravo"));
});

test("nudges the selected event one column with the arrow keys [us-00010-AC-5.1]", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addLabeledEvent(page, "Alpha");
  await addLabeledEvent(page, "Bravo");
  await addLabeledEvent(page, "Charlie");
  await nodes(page, "domainEvent").filter({ hasText: "Bravo" }).click();
  await page.keyboard.press("ArrowLeft"); // Bravo moves before Alpha
  expect(await xOf(page, "Bravo")).toBeLessThan(await xOf(page, "Alpha"));
  expect(await xOf(page, "Alpha")).toBeLessThan(await xOf(page, "Charlie"));
});

test("builds a slice: event triggers a policy and updates a read model [us-00007-AC-1.1/2.1, us-00002-AC-1.1]", async ({
  page,
}) => {
  await page.goto("/");
  await addContext(page);
  await addEvent(page); // event selected
  await slice(page, "+ Policy (triggers)");
  await expect(nodes(page, "policy")).toHaveCount(1);
  await expect(page.getByText("triggers", { exact: true })).toBeVisible();

  await nodes(page, "domainEvent").click(); // reselect the event
  await slice(page, "+ Read Model (updates)");
  await expect(nodes(page, "readModel")).toHaveCount(1);
  await expect(page.getByText("updates", { exact: true })).toBeVisible();
});

test("editing the label updates the node [us-00001-AC-2.1]", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addEvent(page);
  await nodes(page, "domainEvent").click();
  await page.getByLabel("Label", { exact: true }).fill("Order Placed");
  await expect(nodes(page, "domainEvent")).toContainText("Order Placed");
});

test("toggling pivotal shows the marker [us-00001-AC-3.1]", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addEvent(page);
  await nodes(page, "domainEvent").click();
  await page.getByLabel("Pivotal event").check();
  await expect(nodes(page, "domainEvent").locator("[aria-label=pivotal]")).toBeVisible();
});

test("attaches and edits a hotspot [us-00003-AC-1.1/2.1]", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addEvent(page);
  await nodes(page, "domainEvent").click();
  await slice(page, "+ Hotspot");
  await expect(nodes(page, "hotspot")).toHaveCount(1);
  await expect(page.getByText("annotates", { exact: true })).toBeVisible();

  await nodes(page, "hotspot").click();
  await page.getByLabel("Text", { exact: true }).fill("Stock when?");
  await expect(nodes(page, "hotspot")).toContainText("Stock when?");
});

test("deletes a node and its attached edges [us-00001-AC-4.1]", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addEvent(page);
  await slice(page, "+ Policy (triggers)");
  await expect(edges(page)).toHaveCount(1);
  await nodes(page, "domainEvent").click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(nodes(page, "domainEvent")).toHaveCount(0);
  await expect(edges(page)).toHaveCount(0);
});

test("level filter hides types without deleting them [us-00008-AC-1.1]", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await expect(nodes(page, "command")).toHaveCount(2);
  await page.getByRole("button", { name: "Big Picture" }).click();
  // Big Picture hides commands, aggregates, read models…
  await expect(nodes(page, "command")).toHaveCount(0);
  await expect(nodes(page, "aggregate")).toHaveCount(0);
  await expect(nodes(page, "readModel")).toHaveCount(0);
  // …and keeps actors/systems, events, hotspots
  await expect(nodes(page, "actor")).toHaveCount(1);
  await expect(nodes(page, "externalSystem")).toHaveCount(1);
  await expect(nodes(page, "domainEvent")).toHaveCount(2);
  await page.getByRole("button", { name: "Design" }).click();
  await expect(nodes(page, "command")).toHaveCount(2); // restored (never deleted)
  await expect(nodes(page, "aggregate")).toHaveCount(1);
});

test("import then export round-trips the model incl. level [us-00004-AC-3.1, us-00008-AC-2.1]", async ({
  page,
}) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await expect(nodes(page, "domainEvent")).toHaveCount(2);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export" }).click(),
  ]);
  const exported = JSON.parse(readFileSync(await download.path(), "utf8"));
  const original = JSON.parse(readFileSync(fixture("model.json"), "utf8"));
  expect(normalize(exported)).toEqual(normalize(original));
  expect(exported.meta.level).toBe("process");
});

test("shows an error on invalid import and keeps the model [spec-00001-XAC-2.1]", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addEvent(page);
  await page.setInputFiles("input[type=file]", fixture("invalid.json"));
  await expect(page.getByTestId("import-error")).toBeVisible();
  await expect(nodes(page, "domainEvent")).toHaveCount(1);
});

test("keeps the model local — no request carries it [spec-00001-XAC-1.1]", async ({ page }) => {
  const mutating: string[] = [];
  page.on("request", (req) => {
    if (["POST", "PUT", "PATCH"].includes(req.method())) mutating.push(req.url());
  });
  await page.goto("/");
  await addContext(page);
  await addEvent(page);
  await slice(page, "+ Policy (triggers)");
  await page.waitForTimeout(700);
  expect(mutating).toEqual([]);
});

test("autosaves and restores on reload [us-00005-AC-1.1]", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addEvent(page);
  await expect(nodes(page, "domainEvent")).toHaveCount(1);
  await page.waitForTimeout(600); // autosave debounce is 400ms
  await page.reload();
  await expect(nodes(page, "domainEvent")).toHaveCount(1);
});

test("relation labels appear only for the focused node [design-00003]", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await expect(nodes(page, "domainEvent")).toHaveCount(2);
  // Nothing focused → the un-focused board carries no relation labels.
  await expect(page.getByText("emits", { exact: true })).toHaveCount(0);
  await expect(page.getByText("updates", { exact: true })).toHaveCount(0);
  // Focusing a node reveals the labels of its incident edges only.
  await nodes(page, "readModel").click(); // rm1 ← "updates" from the event
  await expect(page.getByText("updates", { exact: true })).toBeVisible();
  await expect(page.getByText("emits", { exact: true })).toHaveCount(0); // not incident to rm1
});

test("focusing a node dims the rest of the board [design-00003]", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await expect(nodes(page, "readModel")).toHaveCount(1);
  await nodes(page, "readModel").click(); // focus rm1
  const opacity = (loc: ReturnType<typeof nodes>) =>
    loc.evaluate((el) => Number(getComputedStyle(el).opacity));
  // The focused node stays fully opaque; an unrelated node (Payment Gateway) dims.
  expect(await opacity(nodes(page, "readModel"))).toBe(1);
  expect(await opacity(nodes(page, "externalSystem"))).toBeLessThan(1);
});

test("focused edges flow (animated); the rest stay static [design-00003]", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await expect(nodes(page, "readModel")).toHaveCount(1);
  // Nothing focused → no edge flows.
  await expect(page.locator(".react-flow__edge.animated")).toHaveCount(0);
  // Focusing rm1 flows its single incident edge (the "updates" from the event).
  await nodes(page, "readModel").click();
  await expect(page.locator(".react-flow__edge.animated")).toHaveCount(1);
});

test("isolate keeps only the selected node's neighbourhood [design-00003]", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await expect(nodes(page, "domainEvent")).toHaveCount(2);
  await nodes(page, "domainEvent").filter({ hasText: "Order Placed" }).click();
  await page.getByRole("button", { name: "Off", exact: true }).click(); // toggle Isolate on
  await page.getByRole("button", { name: "Downstream" }).click();
  // downstream of "Order Placed" is just its Read Model; the rest is hidden
  await expect(nodes(page, "domainEvent")).toHaveCount(1); // Payment Authorized hidden
  await expect(nodes(page, "readModel")).toHaveCount(1);
  await expect(nodes(page, "command")).toHaveCount(0); // upstream hidden
  // upstream shows the producers instead of the read model
  await page.getByRole("button", { name: "Upstream" }).click();
  await expect(nodes(page, "command")).toHaveCount(1);
  await expect(nodes(page, "readModel")).toHaveCount(0);
  // toggling off restores the whole board
  await page.getByRole("button", { name: "On", exact: true }).click();
  await expect(nodes(page, "domainEvent")).toHaveCount(2);
});

test("semantic zoom drops detail when zoomed out [design-00003]", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await page.getByRole("button", { name: "Design" }).click(); // model.json loads at Process
  await expect(nodes(page, "aggregate")).toHaveCount(1); // Design detail at fit zoom
  const zoomOut = page.locator(".react-flow__controls-zoomout");
  for (let i = 0; i < 4; i++) await zoomOut.click();
  // zoomed out past the Design threshold → aggregates drop, backbone stays
  await expect(nodes(page, "aggregate")).toHaveCount(0);
  await expect(nodes(page, "domainEvent")).toHaveCount(2);
});

test("hovering an edge isolates it and dims the rest [design-00003]", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await page.getByRole("button", { name: "Design" }).click(); // show every edge
  await expect(nodes(page, "domainEvent")).toHaveCount(2);
  const edge = (id: string) => page.locator(`.react-flow__edge[data-id="${id}"]`);
  const nodeOpacity = (id: string) =>
    page.locator(`.react-flow__node[data-id="${id}"]`).evaluate((el) => getComputedStyle(el).opacity);
  await edge("r1").hover({ force: true }); // the "issues" edge a1→c1
  await expect(edge("r1")).toHaveClass(/animated/); // hovered edge flows/emphasised
  await expect(edge("r3").locator(".react-flow__edge-path")).toHaveCSS("opacity", "0.12"); // another edge dims
  // its two endpoints (a1, c1) stay bright; an unrelated node (e1) dims
  expect(await nodeOpacity("a1")).toBe("1");
  expect(Number(await nodeOpacity("e1"))).toBeLessThan(1);
  // leaving restores the board
  await page.mouse.move(5, 5);
  await expect(edge("r1")).not.toHaveClass(/animated/);
  expect(await nodeOpacity("e1")).toBe("1");
});

test("model health lists a smell, focuses its element, and never blocks editing [us-00011-AC-1.1/3.1/5.1]", async ({
  page,
}) => {
  await page.goto("/");
  await addContext(page);
  // a Domain Event with no producing Command is an orphan-event smell
  await addLabeledEvent(page, "Order Placed");
  // deselect so the property panel closes (proves the finding-click re-selects it)
  await page.locator(".react-flow__pane").click({ position: { x: 10, y: 10 } });

  await page.getByRole("button", { name: "Health" }).click();
  const panel = page.getByTestId("health-panel");
  await expect(panel).toBeVisible();
  const finding = panel.getByTestId("health-finding").filter({ hasText: "Order Placed" });
  await expect(finding).toBeVisible();

  // selecting the finding focuses the event → its Label field reappears
  await finding.click();
  await expect(page.getByLabel("Label", { exact: true })).toHaveValue("Order Placed");

  // findings are advisory: editing stays enabled while the panel is open
  await expect(panel).toBeVisible();
  await page.getByLabel("Label", { exact: true }).fill("Order Confirmed");
  await expect(nodes(page, "domainEvent")).toContainText("Order Confirmed");
});

test("model health shows a healthy empty state when the model has no smells [us-00011-AC-4.1]", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Health" }).click();
  const panel = page.getByTestId("health-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId("health-empty")).toBeVisible();
  await expect(panel.getByTestId("health-empty")).toContainText("No issues found");
  await expect(panel.getByTestId("health-finding")).toHaveCount(0);
});

test("hotspot workflow: resolving mutes it and drops it from model health [us-00012-AC-1.1/3.1]", async ({
  page,
}) => {
  await page.goto("/");
  await addContext(page);
  await addLabeledEvent(page, "Order Placed");
  // attach a hotspot to the selected event, then open model health
  await slice(page, "+ Hotspot");
  await expect(nodes(page, "hotspot")).toHaveCount(1);
  // classify + prioritise the hotspot (us-00012-AC-2.1): both are shown on the node
  await page.getByLabel("Kind").selectOption("question");
  await page.getByLabel("Priority").selectOption("high");
  await expect(nodes(page, "hotspot")).toContainText("question");
  await expect(nodes(page, "hotspot")).toContainText("high");
  await page.getByRole("button", { name: "Health" }).click();
  const panel = page.getByTestId("health-panel");
  const hotspotFinding = panel.getByTestId("health-finding").filter({ hasText: "unresolved hotspot" });
  await expect(hotspotFinding).toBeVisible();

  // resolve it (the new hotspot is selected) → muted, and dropped from health
  await page.getByLabel("Resolved").check();
  await expect(nodes(page, "hotspot").locator("[data-testid=node-body]")).toHaveAttribute(
    "data-resolved",
    "true",
  );
  await expect(hotspotFinding).toHaveCount(0);

  // reopening un-mutes it (us-00012-AC-1.1 reopen clause)
  await page.getByLabel("Resolved").uncheck();
  await expect(nodes(page, "hotspot").locator("[data-testid=node-body]")).not.toHaveAttribute(
    "data-resolved",
    "true",
  );
});

test("opportunity: attach to an element, distinct from a hotspot, visible at Big Picture [us-00013-AC-1.1/3.1]", async ({
  page,
}) => {
  await page.goto("/");
  await addContext(page);
  await addLabeledEvent(page, "Order Placed");
  await slice(page, "+ Opportunity");
  const opp = nodes(page, "opportunity");
  await expect(opp).toHaveCount(1);
  await expect(edges(page)).toHaveCount(1); // the highlights edge
  // edit its text (us-00013-AC-2.1): the new text shows and is held in the model
  await page.getByLabel("Text", { exact: true }).fill("bundle upsell");
  await expect(opp).toContainText("bundle upsell");
  // conventional colour (#00C853), distinct from the hotspot pink
  const body = opp.locator("[data-testid=node-body]");
  expect(await body.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(0, 200, 83)");
  // annotations are visible at Big Picture too
  await page.getByRole("button", { name: "Big Picture" }).click();
  await expect(opp).toHaveCount(1);
});

test("narrative walkthrough steps the timeline, clamps, stays read-only, and exits [us-00014-AC-1.1/2.1/3.1/4.1/5.1]", async ({
  page,
}) => {
  await page.goto("/");
  await addContext(page);
  await addLabeledEvent(page, "Order Placed"); // order 0
  await addLabeledEvent(page, "Payment Taken"); // order 1

  // start → first event framed (us-00014-AC-1.1)
  await page.getByRole("button", { name: "Walk" }).click();
  const wt = page.getByTestId("walkthrough");
  await expect(wt).toBeVisible();
  await expect(wt).toContainText("1 / 2");
  await expect(page.getByTestId("walkthrough-label")).toHaveText("Order Placed");

  // forward → second (last) event; Next then disables = clamped at the end (us-00014-AC-3.1)
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(wt).toContainText("2 / 2");
  await expect(page.getByTestId("walkthrough-label")).toHaveText("Payment Taken");
  await expect(page.getByRole("button", { name: "Next event" })).toBeDisabled();

  // read-only: a timeline arrow key does not reorder (us-00014-AC-4.1) — the label
  // would flip to the other event if the nudge were not suppressed
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("walkthrough-label")).toHaveText("Payment Taken");

  // backward → first event again (us-00014-AC-2.1)
  await page.getByRole("button", { name: "Previous event" }).click();
  await expect(page.getByTestId("walkthrough-label")).toHaveText("Order Placed");

  // exit → overlay gone (us-00014-AC-5.1)
  await page.getByRole("button", { name: "Exit walkthrough" }).click();
  await expect(wt).toHaveCount(0);
});

test("New clears the model and does not restore it on reload", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addEvent(page);
  await expect(nodes(page, "domainEvent")).toHaveCount(1);
  await page.waitForTimeout(600); // let autosave persist the current model

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "New" }).click();
  await expect(nodes(page, "domainEvent")).toHaveCount(0);

  await page.waitForTimeout(600);
  await page.reload();
  await expect(nodes(page, "domainEvent")).toHaveCount(0);
});
