import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const fixture = (name: string) => path.join(__dirname, "fixtures", name);

// File-scoped actions (New / Add context / Import / Export) now live in the File menu.
const openFileMenu = (page: Page) => page.getByRole("button", { name: "File" }).click();
const addContext = async (page: Page) => {
  await openFileMenu(page);
  await page.getByRole("button", { name: "Add context" }).click();
};
const addEvent = (page: Page) =>
  page.getByRole("button", { name: "Add Event", exact: true }).first().click();
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
  const evBtns = page.getByRole("button", { name: "Add Event", exact: true });
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

  await openFileMenu(page);
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

test("hovering a relation edge reveals a delete control that removes it, keeping its endpoints [us-00025-AC-1.1/2.1]", async ({
  page,
}) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await page.getByRole("button", { name: "Design" }).click(); // show every edge
  const edge = (id: string) => page.locator(`.react-flow__edge[data-id="${id}"]`);
  const node = (id: string) => page.locator(`.react-flow__node[data-id="${id}"]`);
  // Wait for the full edge set before taking the baseline: a bare count() does not
  // retry, so under load it can capture a half-rendered board (issue-00022).
  const before = 6; // model.json at Design
  await expect(edges(page)).toHaveCount(before);
  // No delete control until the edge is hovered (us-00025-AC-2.1).
  await expect(page.getByRole("button", { name: "Delete relation" })).toHaveCount(0);
  await edge("r1").hover({ force: true }); // the "issues" edge a1→c1
  await page.getByRole("button", { name: "Delete relation" }).click(); // us-00025-AC-1.1
  await expect(edge("r1")).toHaveCount(0);
  await expect(edges(page)).toHaveCount(before - 1);
  // both endpoints stay on the board
  await expect(node("a1")).toHaveCount(1);
  await expect(node("c1")).toHaveCount(1);
});

test("deleting the hovered edge leaves no stale isolation behind [issue-00018]", async ({
  page,
}) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await page.getByRole("button", { name: "Design" }).click(); // show every edge
  const edge = (id: string) => page.locator(`.react-flow__edge[data-id="${id}"]`);
  const pathOpacity = (id: string) =>
    edge(id)
      .locator(".react-flow__edge-path")
      .evaluate((el) => getComputedStyle(el).opacity);
  await expect(edge("r3")).toHaveCount(1);
  expect(await pathOpacity("r3")).toBe("1");

  // Delete r1 from its hover-revealed control. The label unmounts without a
  // mouseleave, so the hovered id must be cleared by the removal itself.
  await edge("r1").hover({ force: true });
  await page.getByRole("button", { name: "Delete relation" }).click();
  await expect(edge("r1")).toHaveCount(0);
  await page.mouse.move(5, 5); // pointer off every edge

  // No edge is hovered any more, so nothing isolates: r3 is fully opaque and no
  // edge is emphasised. Before the fix every edge stayed dimmed at 0.12.
  await expect(edge("r3").locator(".react-flow__edge-path")).toHaveCSS("opacity", "1");
  await expect(page.locator(".react-flow__edge.animated")).toHaveCount(0);
});

test("clicking a relation edge highlights it; Delete removes it, keeping endpoints [us-00025-AC-3.1/4.1]", async ({
  page,
}) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await page.getByRole("button", { name: "Design" }).click(); // show every edge
  const edge = (id: string) => page.locator(`.react-flow__edge[data-id="${id}"]`);
  const node = (id: string) => page.locator(`.react-flow__node[data-id="${id}"]`);
  // Wait for the full edge set before taking the baseline: a bare count() does not
  // retry, so under load it can capture a half-rendered board (issue-00022).
  const before = 6; // model.json at Design
  await expect(edges(page)).toHaveCount(before);
  // Click off-centre (near the top of the edge) so the hit lands on the path, not
  // on the hover-revealed delete control that sits at the edge's mid-label.
  const bb = (await edge("r1").boundingBox())!;
  await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height * 0.15);
  await expect(edge("r1")).toHaveClass(/animated/); // selected → emphasised/flows (AC-3.1)
  await page.keyboard.press("Delete"); // AC-4.1
  await expect(edge("r1")).toHaveCount(0);
  await expect(edges(page)).toHaveCount(before - 1);
  await expect(node("a1")).toHaveCount(1);
  await expect(node("c1")).toHaveCount(1);
});

test("a manual link is drawn in the arrow direction: drag source→target creates the edge [issue-00017]", async ({
  page,
}) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("unlinked-command-event.json"));
  const cmd = page.locator(".react-flow__node-command"); // source of `produces`
  const ev = page.locator(".react-flow__node-domainEvent"); // its target
  await expect(cmd).toHaveCount(1);
  await expect(ev).toHaveCount(1);
  await expect(edges(page)).toHaveCount(0);
  const cb = (await cmd.boundingBox())!;
  const eb = (await ev.boundingBox())!;
  // Drag from the Command's bottom (arrow tail) down to the Domain Event's top
  // (arrow head) — the natural, semantics-matching direction.
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height);
  await page.mouse.down();
  await page.mouse.move(eb.x + eb.width / 2, (cb.y + cb.height + eb.y) / 2, { steps: 8 });
  await page.mouse.move(eb.x + eb.width / 2, eb.y, { steps: 8 });
  await page.mouse.up();
  await expect(edges(page)).toHaveCount(1);
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

test("policy and constraint carry structured rule fields, persisted across export/import [us-00026-AC-1.1/2.1/3.1/4.1, us-00027-AC-1.1/2.1]", async ({
  page,
}) => {
  await page.goto("/"); // Design level → Policy and Constraint both in the palette

  // Policy: condition + execution + a parameter (each control gated to Policy)
  await palette(page, "Policy"); // created and selected
  await page.getByLabel("Condition").fill("retry count < 3");
  await page.getByLabel("Execution").selectOption("manual");
  await page.getByRole("button", { name: "+ Add parameter" }).click();
  await page.getByLabel("Parameter 1 name").fill("retry");
  await page.getByLabel("Parameter 1 value").fill("3");
  await expect(nodes(page, "policy")).toContainText("manual"); // execution shown on the node

  // Constraint: rule, distinct from description
  await page.locator(".react-flow__pane").click({ position: { x: 10, y: 10 } }); // deselect → palette
  await palette(page, "Constraint"); // created and selected
  await page.getByLabel("Description").fill("credit limit check");
  await page.getByLabel("Rule").fill("order.total <= account.creditLimit");

  const exportModel = async () => {
    await openFileMenu(page);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export" }).click(),
    ]);
    const file = await download.path();
    return { file, json: JSON.parse(readFileSync(file, "utf8")) };
  };

  // export → both nodes' rule fields are persisted
  const first = await exportModel();
  const policy = first.json.nodes.find((n: { type: string }) => n.type === "policy");
  const constraint = first.json.nodes.find((n: { type: string }) => n.type === "constraint");
  expect(policy.properties).toMatchObject({
    condition: "retry count < 3",
    execution: "manual",
    parameters: [{ name: "retry", value: "3" }],
  });
  expect(constraint.properties).toMatchObject({
    description: "credit limit check",
    rule: "order.total <= account.creditLimit",
  });

  // re-import that export → the fields survive the round-trip (us-00026-AC-4.1, us-00027-AC-2.1)
  await page.setInputFiles("input[type=file]", first.file);
  await expect(nodes(page, "policy")).toContainText("manual");
  const second = await exportModel();
  expect(normalize(second.json)).toEqual(normalize(first.json));
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

test("discovery mode is Big-Picture only; converge builds structured events [us-00016-AC-1.1, us-00017-AC-1.1]", async ({
  page,
}) => {
  await page.goto("/"); // default Design level
  // unavailable off Big Picture (us-00016-AC-1.1)
  await expect(page.getByTestId("discovery-controls")).toHaveCount(0);

  await page.getByRole("button", { name: "Big Picture" }).click();
  await expect(page.getByTestId("discovery-controls")).toBeVisible();

  // enter discovery → the structured board is replaced by the wall surface
  await page.getByRole("button", { name: "Discover" }).click();
  await expect(page.getByRole("button", { name: "Converge" })).toBeVisible();

  // drop two unordered events via the toolbar (RF pane double-click also works,
  // but is not needed to exercise the flow); they are wall stickies, not model nodes
  await page.getByRole("button", { name: "Add wall event" }).click();
  await page.getByRole("button", { name: "Add wall event" }).click();
  await expect(page.getByTestId("discovery-node")).toHaveCount(2);
  await expect(nodes(page, "domainEvent")).toHaveCount(0); // model untouched while diverging

  // converge → wall clears, mode exits, structured Domain Events appear
  await page.getByRole("button", { name: "Converge" }).click();
  await expect(page.getByRole("button", { name: "Converge" })).toHaveCount(0);
  await expect(page.getByTestId("discovery-node")).toHaveCount(0);
  await expect(nodes(page, "domainEvent")).toHaveCount(2);
});

test("the Converge button is legible: white text on the dark fill [issue-00016]", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Big Picture" }).click();
  await page.getByRole("button", { name: "Discover" }).click();
  const converge = page.getByRole("button", { name: "Converge" });
  await expect(converge).toBeVisible();
  const color = await converge.evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe("rgb(255, 255, 255)");
});

test("renames a wall event inline without spawning extra events [us-00016-AC-2.1/4.1]", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Big Picture" }).click();
  await page.getByRole("button", { name: "Discover" }).click();
  await page.getByRole("button", { name: "Add wall event" }).click();
  await expect(page.getByTestId("discovery-node")).toHaveCount(1);

  // double-clicking the node enters rename mode; the count stays 1 (rename is on
  // the node's own label, not a board-add gesture)
  await page.getByTestId("discovery-node").dblclick();
  await expect(page.getByTestId("discovery-node")).toHaveCount(1);
  await page.getByTestId("discovery-node").getByRole("textbox").fill("Order Placed");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("discovery-node")).toContainText("Order Placed");

  // the delete affordance removes it from the wall
  await page.getByTestId("discovery-node").getByRole("button", { name: "Delete event" }).click();
  await expect(page.getByTestId("discovery-node")).toHaveCount(0);
});

test("the discovery wall survives a reload and stays out of the exported DSL [us-00016-AC-5.1/6.1]", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Big Picture" }).click();
  await page.getByRole("button", { name: "Discover" }).click();
  await page.getByRole("button", { name: "Add wall event" }).click();
  await expect(page.getByTestId("discovery-node")).toHaveCount(1);

  // the wall is never in the model DSL: exporting an otherwise-empty model yields
  // no nodes (us-00016-AC-5.1)
  await openFileMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export" }).click(),
  ]);
  const exported = JSON.parse(readFileSync(await download.path(), "utf8"));
  expect(exported.nodes).toHaveLength(0);

  // reload restores the wall on re-entry (us-00016-AC-6.1)
  await page.waitForTimeout(600); // autosave debounce
  await page.reload();
  await page.getByRole("button", { name: "Big Picture" }).click();
  await page.getByRole("button", { name: "Discover" }).click();
  await expect(page.getByTestId("discovery-node")).toHaveCount(1);
});

test("search highlights matching elements and reports a count [us-00018-AC-1.1]", async ({
  page,
}) => {
  await page.goto("/");
  await addContext(page);
  await addLabeledEvent(page, "Order Placed");
  await page.locator(".react-flow__pane").click({ position: { x: 10, y: 10 } });
  await addLabeledEvent(page, "Payment Taken");

  await page.getByLabel("Search elements").fill("order");
  await expect(page.getByTestId("search-count")).toHaveText("1");
  // the matching node carries the search ring (boxShadow); the other does not
  const ring = (label: string) =>
    nodes(page, "domainEvent")
      .filter({ hasText: label })
      .evaluate((el) => getComputedStyle(el).boxShadow);
  expect(await ring("Order Placed")).not.toBe("none");
  expect(await ring("Payment Taken")).toBe("none");
});

test("type filter hides non-selected types; composes with Level [us-00018-AC-3.1/7.1, spec-00006-XAC-2.1]", async ({
  page,
}) => {
  await page.goto("/"); // Design
  await addUngroupedEvent(page); // a Domain Event, selected
  await slice(page, "+ Command (produces)"); // adds a Command
  await expect(nodes(page, "command")).toHaveCount(1);

  // filter to Domain Events only → the Command is hidden
  await page.getByRole("button", { name: "Filter" }).click();
  await page.getByTestId("filter-popover").getByRole("button", { name: "Domain Event" }).click();
  await expect(nodes(page, "command")).toHaveCount(0);
  await expect(nodes(page, "domainEvent")).toHaveCount(1);

  // Big Picture already hides Commands; selecting Command in the filter can't
  // reveal it (Level still bounds the view) [us-00018-AC-7.1]
  await page.getByTestId("filter-popover").getByRole("button", { name: "Command" }).click();
  await page.getByRole("button", { name: "Big Picture" }).click();
  await expect(nodes(page, "command")).toHaveCount(0);
});

test("search and filter never change the exported model [us-00018-AC-5.1, spec-00006-XAC-1.1]", async ({
  page,
}) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await expect(nodes(page, "domainEvent")).toHaveCount(2);

  const exportNow = async () => {
    await openFileMenu(page);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export" }).click(),
    ]);
    return JSON.parse(readFileSync(await download.path(), "utf8"));
  };
  const before = await exportNow();

  // apply a query + type filter, then export again
  await page.getByLabel("Search elements").fill("order");
  await page.getByRole("button", { name: "Filter" }).click();
  await page.getByTestId("filter-popover").getByRole("button", { name: "Domain Event" }).click();
  const after = await exportNow();

  expect(normalize(after)).toEqual(normalize(before)); // identical model
});

test("classifies a Bounded Context and shows the badge; export carries it [us-00019-AC-1.1/2.1/3.1]", async ({
  page,
}) => {
  await page.goto("/");
  await addContext(page);
  const badge = page.getByText("Core", { exact: true });
  await expect(badge).toHaveCount(0); // unclassified by default

  // classify via the context ⋯ menu, then the badge shows (us-00019-AC-1.1)
  await page.getByRole("button", { name: "Context options" }).click();
  // the menu must actually be on screen (not clipped by the header's scroll
  // container) — a plain toBeVisible passes even when clipped, so assert viewport
  await expect(page.getByRole("button", { name: "Core", exact: true })).toBeInViewport();
  await page.getByRole("button", { name: "Core", exact: true }).click();
  await expect(badge).toBeVisible();

  // export carries the classification (us-00019-AC-3.1)
  await openFileMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export" }).click(),
  ]);
  const exported = JSON.parse(readFileSync(await download.path(), "utf8"));
  expect(exported.version).toBe("4.0");
  expect(exported.contexts[0].classification).toBe("core");

  // re-selecting the same subdomain clears it (us-00019-AC-2.1)
  await page.getByRole("button", { name: "Context options" }).click();
  await page.getByRole("button", { name: "Core", exact: true }).click();
  await expect(badge).toHaveCount(0);
});

test("Context Map renders contexts + a typed relationship; edits and deletes it; leaves the board intact [us-00020-AC-1.1/3.1/4.1/7.1]", async ({
  page,
}) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("context-map.json"));
  await expect(nodes(page, "domainEvent")).toHaveCount(1);

  // export the board before opening the map (for the unchanged check)
  const exportNow = async () => {
    await openFileMenu(page);
    const [d] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export" }).click(),
    ]);
    return JSON.parse(readFileSync(await d.path(), "utf8"));
  };
  const before = await exportNow();

  // open the Context Map → 2 context nodes + 1 relationship edge (us-00020-AC-1.1)
  await page.getByRole("button", { name: "Context Map" }).click();
  await expect(page.getByTestId("context-node")).toHaveCount(2);
  const relLabel = page.getByTestId("context-relation-label");
  await expect(relLabel).toHaveCount(1);
  await expect(relLabel.getByLabel("Relationship type")).toHaveValue("customerSupplier");

  // retype it (us-00020-AC-3.1)
  await relLabel.getByLabel("Relationship type").selectOption("acl");
  await expect(relLabel.getByLabel("Relationship type")).toHaveValue("acl");

  // hover isolation matches the board: the relationship flows and its delete
  // appears only while hovered (design-00003 Tier C)
  await expect(page.getByRole("button", { name: "Delete relationship" })).toHaveCount(0);
  await relLabel.hover();
  await expect(page.locator(".react-flow__edge").first()).toHaveClass(/animated/);

  // delete it (us-00020-AC-4.1)
  await relLabel.getByRole("button", { name: "Delete relationship" }).click();
  await expect(page.getByTestId("context-relation-label")).toHaveCount(0);

  // back to the board; nothing about the elements changed (us-00020-AC-7.1)
  await page.getByRole("button", { name: "Context Map" }).click();
  await expect(nodes(page, "domainEvent")).toHaveCount(1);
  const after = await exportNow();
  expect(after.nodes).toEqual(before.nodes);
  expect(after.edges).toEqual(before.edges);
  expect(after.contexts).toEqual(before.contexts);
});

test("captures a named snapshot, keeps it out of the export, and restores it [us-00021-AC-1.1/2.1/5.1, spec-00008-XAC-1.1]", async ({
  page,
}) => {
  await page.goto("/");
  await addContext(page);
  await addLabeledEvent(page, "Order Placed");
  await expect(nodes(page, "domainEvent")).toHaveCount(1);

  // capture the current model as "as-is" (us-00021-AC-1.1/2.1)
  await page.getByRole("button", { name: "Versions", exact: true }).click();
  page.once("dialog", (d) => d.accept("as-is"));
  await page.getByRole("button", { name: "Capture snapshot" }).click();
  await expect(page.getByTestId("snapshot-row")).toHaveCount(1);
  await expect(page.getByTestId("snapshot-row")).toContainText("as-is");
  // the row also shows the creation time (us-00021-AC-2.1)
  await expect(page.getByTestId("snapshot-time")).toHaveText(/\d/);
  await page.getByRole("button", { name: "Versions", exact: true }).click(); // close the panel

  // the snapshot never appears in the model's export (spec-00008-XAC-1.1)
  await openFileMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export" }).click(),
  ]);
  const exported = JSON.parse(readFileSync(await download.path(), "utf8"));
  expect(exported.snapshots).toBeUndefined();

  // diverge the model, then restore the snapshot (us-00021-AC-5.1)
  await page.locator(".react-flow__pane").click({ position: { x: 10, y: 10 } });
  await addLabeledEvent(page, "Order Shipped");
  await expect(nodes(page, "domainEvent")).toHaveCount(2);

  await page.getByRole("button", { name: "Versions", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Restore as-is" }).click();
  await expect(nodes(page, "domainEvent")).toHaveCount(1);
  await expect(nodes(page, "domainEvent")).toContainText("Order Placed");
});

test("compare shows a unified diff — added, removed, summary, read-only, unchanged board [us-00023-AC-1.1/2.1/4.1/5.1/6.1/7.1, spec-00008-XAC-3.1]", async ({
  page,
}) => {
  const exportNow = async () => {
    await openFileMenu(page);
    const [d] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export" }).click(),
    ]);
    return JSON.parse(readFileSync(await d.path(), "utf8"));
  };

  await page.goto("/");
  await addContext(page);
  await addLabeledEvent(page, "Order Placed");

  await page.getByRole("button", { name: "Versions", exact: true }).click();
  page.once("dialog", (d) => d.accept("as-is"));
  await page.getByRole("button", { name: "Capture snapshot" }).click();
  await expect(page.getByTestId("snapshot-row")).toHaveCount(1);
  // Compare needs two snapshots (us-00023-AC-7.1): disabled + side pickers hidden.
  await expect(page.getByTestId("compare-open")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Compare left = as-is" })).toHaveCount(0);
  await page.getByRole("button", { name: "Versions", exact: true }).click();

  await page.locator(".react-flow__pane").click({ position: { x: 10, y: 10 } });
  await addLabeledEvent(page, "Order Shipped");
  await expect(nodes(page, "domainEvent")).toHaveCount(2);
  const before = await exportNow();

  await page.getByRole("button", { name: "Versions", exact: true }).click();
  page.once("dialog", (d) => d.accept("to-be"));
  await page.getByRole("button", { name: "Capture snapshot" }).click();
  await expect(page.getByTestId("snapshot-row")).toHaveCount(2);

  // base = as-is → target = to-be: one Domain Event added (us-00023-AC-1.1)
  await page.getByRole("button", { name: "Compare left = as-is" }).click();
  await page.getByRole("button", { name: "Compare right = to-be" }).click();
  await page.getByTestId("compare-open").click();
  await expect(page.getByTestId("compare-view")).toBeVisible();
  await expect(page.getByTestId("diff-summary")).toContainText("+1 added");
  await expect(page.getByTestId("diff-summary")).toContainText("−0 removed");
  // the diff board is the target, so it shows both events
  const diffEvents = page.getByTestId("diff-board").locator(".react-flow__node-domainEvent");
  await expect(diffEvents).toHaveCount(2);

  // read-only: a delivered double-click opens no editor (us-00023-AC-5.1)
  await diffEvents.first().dblclick({ force: true });
  await expect(page.getByTestId("diff-board").getByRole("textbox")).toHaveCount(0);

  // swap the pair (base = to-be → target = as-is): now one event is removed
  // (us-00023-AC-2.1 / AC-4.1 recompute)
  await page.getByLabel("left snapshot").selectOption({ label: "to-be" });
  await page.getByLabel("right snapshot").selectOption({ label: "as-is" });
  await expect(page.getByTestId("diff-summary")).toContainText("−1 removed");
  await expect(page.getByTestId("diff-removed")).toContainText("Order Shipped");

  // close → unchanged live board (us-00023-AC-6.1, spec-00008-XAC-3.1)
  await page.getByRole("button", { name: "Close compare" }).click();
  await expect(page.getByTestId("compare-view")).toHaveCount(0);
  await expect(nodes(page, "domainEvent")).toHaveCount(2);
  expect(normalize(await exportNow())).toEqual(normalize(before));
});

test("compare boards render with a non-zero height [issue-00014]", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addLabeledEvent(page, "Order Placed");

  const capture = async (name: string) => {
    await page.getByRole("button", { name: "Versions", exact: true }).click();
    page.once("dialog", (d) => d.accept(name));
    await page.getByRole("button", { name: "Capture snapshot" }).click();
    await page.getByRole("button", { name: "Versions", exact: true }).click();
  };
  await capture("as-is");
  await page.locator(".react-flow__pane").click({ position: { x: 10, y: 10 } });
  await addLabeledEvent(page, "Order Shipped");
  await capture("to-be");

  await page.getByRole("button", { name: "Versions", exact: true }).click();
  await page.getByRole("button", { name: "Compare left = as-is" }).click();
  await page.getByRole("button", { name: "Compare right = to-be" }).click();
  await page.getByTestId("compare-open").click();
  await expect(page.getByTestId("compare-view")).toBeVisible();

  // The board slot must actually occupy vertical space — otherwise React Flow
  // renders into a 0-height container and the modeller sees a blank Compare view.
  const box = await page.getByTestId("diff-board").locator(".react-flow").boundingBox();
  expect(box?.height ?? 0).toBeGreaterThan(200);
});

test("compare diff lays out all bands so level-hidden types don't overlap [issue-00015]", async ({
  page,
}) => {
  await page.goto("/"); // Design
  await addUngroupedEvent(page); // a Domain Event, selected
  await slice(page, "+ Command (produces)"); // Command is hidden (collapsed) at Big Picture
  await expect(nodes(page, "command")).toHaveCount(1);

  // Capture at Big Picture, where the Command band is hidden on the live board.
  await page.getByRole("button", { name: "Big Picture" }).click();
  const capture = async (name: string) => {
    await page.getByRole("button", { name: "Versions", exact: true }).click();
    page.once("dialog", (d) => d.accept(name));
    await page.getByRole("button", { name: "Capture snapshot" }).click();
    await page.getByRole("button", { name: "Versions", exact: true }).click();
  };
  await capture("v1");
  await capture("v2");

  await page.getByRole("button", { name: "Versions", exact: true }).click();
  await page.getByRole("button", { name: "Compare left = v1" }).click();
  await page.getByRole("button", { name: "Compare right = v2" }).click();
  await page.getByTestId("compare-open").click();
  await expect(page.getByTestId("compare-view")).toBeVisible();

  // The diff renders every element, so it must lay out in full bands: the Command
  // sits in its own band above the Domain Event, not collapsed on top of it.
  const cmd = await page.getByTestId("diff-board").locator(".react-flow__node-command").boundingBox();
  const evt = await page
    .getByTestId("diff-board")
    .locator(".react-flow__node-domainEvent")
    .boundingBox();
  expect(cmd && evt).toBeTruthy();
  expect(cmd!.y + cmd!.height).toBeLessThanOrEqual(evt!.y + 2); // Command fully above the event
});

test("compare diff shows what changed: struck old label, direction chip, hover detail [us-00023-AC-8.1/8.2/9.1]", async ({
  page,
}) => {
  await page.goto("/"); // Design
  await addContext(page);
  await addLabeledEvent(page, "测试3"); // event A
  await page.locator(".react-flow__pane").click({ position: { x: 10, y: 10 } });
  await addLabeledEvent(page, "E2"); // event B (A before B on the timeline)

  const capture = async (name: string) => {
    await page.getByRole("button", { name: "Versions", exact: true }).click();
    page.once("dialog", (d) => d.accept(name));
    await page.getByRole("button", { name: "Capture snapshot" }).click();
    await page.getByRole("button", { name: "Versions", exact: true }).click();
  };
  await capture("v1");

  // Change A: rename it and move it later on the timeline.
  await nodes(page, "domainEvent").filter({ hasText: "测试3" }).click();
  await page.getByLabel("Label", { exact: true }).fill("测试3改");
  await page.getByRole("button", { name: "Move later" }).click();
  await capture("v2");

  await page.getByRole("button", { name: "Versions", exact: true }).click();
  await page.getByRole("button", { name: "Compare left = v1" }).click();
  await page.getByRole("button", { name: "Compare right = v2" }).click();
  await page.getByTestId("compare-open").click();
  await expect(page.getByTestId("compare-view")).toBeVisible();

  const changed = page
    .getByTestId("diff-board")
    .locator(".react-flow__node-domainEvent")
    .filter({ hasText: "测试3改" });
  // AC-8.1: previous label struck-through on the element
  await expect(changed.getByTestId("diff-renamed-from")).toHaveText("测试3");
  // AC-8.2: order shown as a direction chip, not a slot number
  await expect(changed.getByTestId("diff-chips")).toContainText("later");
  await expect(changed.getByTestId("diff-chips")).not.toContainText(/\d/);
  // AC-9.1: full field-level detail on hover (native title)
  const detail = await changed.locator("[title]").first().getAttribute("title");
  expect(detail).toContain("label: 测试3 → 测试3改");
});

test("New clears the model and does not restore it on reload", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addEvent(page);
  await expect(nodes(page, "domainEvent")).toHaveCount(1);
  await page.waitForTimeout(600); // let autosave persist the current model

  page.once("dialog", (d) => d.accept());
  await openFileMenu(page);
  await page.getByRole("button", { name: "New" }).click();
  await expect(nodes(page, "domainEvent")).toHaveCount(0);

  await page.waitForTimeout(600);
  await page.reload();
  await expect(nodes(page, "domainEvent")).toHaveCount(0);
});

// spec-00010: Bounded Context Focus + compact header
const DIM = "0.15"; // NODE_DIM_OPACITY

test("focuses a context: its slice stays vivid while other contexts dim, and clears [us-00024-AC-1.1/2.1/3.1]", async ({
  page,
}) => {
  await page.goto("/");
  await addContext(page); // Context 1
  await addContext(page); // Context 2
  const addBtns = page.getByRole("button", { name: "Add Event", exact: true });
  await addBtns.nth(0).click(); // event in Context 1 (selected on add)
  await page.getByLabel("Label", { exact: true }).fill("Alpha");
  await addBtns.nth(1).click(); // event in Context 2
  await page.getByLabel("Label", { exact: true }).fill("Bravo");
  // deselect the just-added event so selection-dimming doesn't confound the
  // baseline — focus assertions below then isolate Bounded Context Focus.
  await page.locator(".react-flow__pane").click({ position: { x: 20, y: 20 } });

  const alpha = nodes(page, "domainEvent").filter({ hasText: "Alpha" });
  const bravo = nodes(page, "domainEvent").filter({ hasText: "Bravo" });
  const focus = (n: number) =>
    page.getByRole("button", { name: `Context ${n}`, exact: true }).click();

  // focus Context 1 → Alpha vivid, Bravo dimmed (AC-1.1)
  await focus(1);
  await expect(alpha).toHaveCSS("opacity", "1");
  await expect(bravo).toHaveCSS("opacity", DIM);

  // focus Context 2 → single-select swaps the emphasis (AC-2.1)
  await focus(2);
  await expect(alpha).toHaveCSS("opacity", DIM);
  await expect(bravo).toHaveCSS("opacity", "1");

  // re-clicking the focused context clears (toggle) (AC-3.1)
  await focus(2);
  await expect(alpha).toHaveCSS("opacity", "1");
  await expect(bravo).toHaveCSS("opacity", "1");

  // Esc also clears focus (AC-3.1)
  await focus(1);
  await expect(bravo).toHaveCSS("opacity", DIM);
  await page.keyboard.press("Escape");
  await expect(bravo).toHaveCSS("opacity", "1");
});

test("the Context Map reads like the board: clicking a context focuses it, dims the unrelated ones, and clears [design-00003, spec-00010]", async ({
  page,
}) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("context-map-focus.json"));
  await expect(nodes(page, "domainEvent")).toHaveCount(1);
  await page.getByRole("button", { name: "Context Map" }).click();
  await expect(page.getByTestId("context-node")).toHaveCount(3);

  // opacity lives on the React Flow node wrapper, not the context card
  const ctx = (name: string) => page.locator(".react-flow__node").filter({ hasText: name });
  const ordering = ctx("Ordering");
  const shipping = ctx("Shipping"); // no relationship — never in Ordering's neighbourhood
  const payment = ctx("Payment");
  const flowing = page.locator(".react-flow__edge.animated");
  const pane = page.locator(".react-flow__pane");

  // neutral: nothing dims, nothing flows
  await expect(shipping).toHaveCSS("opacity", "1");
  await expect(flowing).toHaveCount(0);

  // click Ordering → it and its one-relationship-away neighbour stay vivid, the
  // unrelated context dims, and the relationship flows
  await ordering.click();
  await expect(ordering).toHaveCSS("opacity", "1");
  await expect(payment).toHaveCSS("opacity", "1");
  await expect(shipping).toHaveCSS("opacity", DIM);
  await expect(flowing).toHaveCount(1);

  // the committed focus is sticky: hovering another context does not steal it
  await shipping.hover();
  await expect(shipping).toHaveCSS("opacity", DIM);

  // re-clicking the focused context clears (toggle); with the pointer moved off
  // the node, nothing is emphasised any more (clearing returns to hover preview)
  await ordering.click();
  await pane.hover({ position: { x: 20, y: 20 } });
  await expect(shipping).toHaveCSS("opacity", "1");
  await expect(flowing).toHaveCount(0);

  // with nothing committed, a hover previews that context's neighbourhood
  await shipping.hover();
  await expect(shipping).toHaveCSS("opacity", "1");
  await expect(ordering).toHaveCSS("opacity", DIM);

  // empty-canvas click clears a committed focus
  await ordering.click();
  await expect(shipping).toHaveCSS("opacity", DIM);
  await pane.click({ position: { x: 20, y: 20 } });
  await expect(shipping).toHaveCSS("opacity", "1");
});

test("the context header stays one fixed-height row as contexts scale [us-00024-AC-5.1]", async ({
  page,
}) => {
  await page.goto("/");
  await addContext(page);
  const legend = page.getByTestId("context-legend");
  const oneRow = (await legend.boundingBox())!.height;

  for (let i = 0; i < 11; i++) await addContext(page); // 12 contexts total
  await expect(page.getByRole("button", { name: /^Context \d+$/ })).toHaveCount(12);

  const manyRows = (await legend.boundingBox())!.height;
  expect(Math.abs(manyRows - oneRow)).toBeLessThan(4); // no vertical growth
});

test("a committed scope is sticky vs node hover; only in-scope lines trace [design-00003]", async ({
  page,
}) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await page.getByRole("button", { name: "Design" }).click(); // show every node/edge
  await expect(nodes(page, "domainEvent")).toHaveCount(2);
  const nodeOpacity = (id: string) =>
    page.locator(`.react-flow__node[data-id="${id}"]`).evaluate((el) => getComputedStyle(el).opacity);
  const edge = (id: string) => page.locator(`.react-flow__edge[data-id="${id}"]`);

  // commit a scope: select rm1 → chain {rm1, e1} bright, an unrelated node dims
  await nodes(page, "readModel").click();
  expect(await nodeOpacity("rm1")).toBe("1");
  expect(Number(await nodeOpacity("ex1"))).toBeLessThan(1);

  // hovering another NODE must NOT steal the committed highlight
  await nodes(page, "externalSystem").hover({ force: true });
  expect(await nodeOpacity("rm1")).toBe("1"); // still bright
  expect(Number(await nodeOpacity("ex1"))).toBeLessThan(1); // hover ignored, still dim

  // hovering an OUT-OF-SCOPE line (r1: a1→c1) does nothing while committed
  await edge("r1").hover({ force: true });
  await expect(edge("r1")).not.toHaveClass(/animated/);
  expect(await nodeOpacity("rm1")).toBe("1"); // committed scope unchanged
  expect(Number(await nodeOpacity("a1"))).toBeLessThan(1); // out-of-scope endpoint stays dim

  // hovering an IN-SCOPE line (r4: e1→rm1) still traces it
  await edge("r4").hover({ force: true });
  await expect(edge("r4")).toHaveClass(/animated/);
  expect(await nodeOpacity("rm1")).toBe("1"); // endpoint bright
});

// ---------------------------------------------------------------------------
// Canvas re-render guards (issue-00019). View-only interactions must not cost
// work proportional to the whole board. Thresholds count DOM elements touched,
// not milliseconds, so the guards stay deterministic on any machine.
// ---------------------------------------------------------------------------

/** A board of `times` copies of model.json (8 nodes / 6 edges each), as an upload
 *  buffer — big enough that a whole-board re-render is unmistakable. */
// Frame clock: the wasted re-render work during a zoom produces *identical* DOM,
// so mutation counts cannot see it — the observable cost is frame length.
const FRAME_CLOCK = `
window.__f = { on: false, last: 0, frames: [] };
const tick = () => {
  const t = performance.now();
  if (window.__f.on) window.__f.frames.push(t - window.__f.last);
  window.__f.last = t;
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
window.__frameStart = () => { window.__f.frames = []; window.__f.last = performance.now(); window.__f.on = true; };
window.__frameStop = () => {
  window.__f.on = false;
  // The *second* worst frame, not the worst: the regression this measures stalls every
  // frame of the gesture, so the second worst proves it just as well — and unlike the
  // worst it cannot be set by a single GC/scheduling stall (issue-00020).
  const f = [...window.__f.frames].sort((a, b) => b - a);
  return { count: f.length, second: Math.round(f[1] ?? 0) };
};
`;

const largeBoard = (times: number) => {
  const base = JSON.parse(readFileSync(fixture("model.json"), "utf8"));
  const out = { ...base, contexts: [], contextRelationships: [], nodes: [], edges: [] } as {
    contexts: { id: string; name: string; order: number }[];
    contextRelationships: unknown[];
    nodes: { id: string; context?: string; order?: number }[];
    edges: { id: string; source: string; target: string }[];
  };
  for (let k = 0; k < times; k++) {
    const sfx = `-${k}`;
    for (const c of base.contexts)
      out.contexts.push({ ...c, id: c.id + sfx, name: `${c.name} ${k}`, order: c.order + 10 * k });
    for (const n of base.nodes)
      out.nodes.push({
        ...n,
        id: n.id + sfx,
        ...(n.context ? { context: n.context + sfx } : {}),
        ...(n.order !== undefined ? { order: n.order + 100 * k } : {}),
      });
    for (const e of base.edges)
      out.edges.push({ ...e, id: e.id + sfx, source: e.source + sfx, target: e.target + sfx });
  }
  return { name: "large.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(out)) };
};

// Count how many *node* and *edge* elements a single interaction mutates.
const COUNTER = `
window.__c = { node: 0, edge: 0 };
const layer = (n) => {
  let el = n instanceof Element ? n : n.parentElement;
  while (el) {
    const c = el.className, s = typeof c === "string" ? c : "";
    if (s.includes("react-flow__node")) return "node";
    if (s.includes("react-flow__edge")) return "edge";
    el = el.parentElement;
  }
  return null;
};
window.__obs = new MutationObserver((recs) => {
  for (const r of recs) { const k = layer(r.target); if (k) window.__c[k]++; }
});
window.__obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
window.__reset = () => { window.__c = { node: 0, edge: 0 }; };
`;

async function openLargeBoard(page: Page, times = 20) {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", largeBoard(times));
  await page.getByRole("button", { name: "Design" }).click();
  // Zoom in past the semantic-zoom thresholds so every band renders.
  const zoomIn = page.locator(".react-flow__controls-zoomin");
  for (let i = 0; i < 6; i++) {
    await zoomIn.click();
    await page.waitForTimeout(120);
  }
  const rendered = await page.locator(".react-flow__node").count();
  expect(rendered).toBeGreaterThan(100); // the guard is meaningless on a small board
  await page.evaluate(COUNTER);
  return rendered;
}

const touched = (page: Page) => page.evaluate("({...window.__c})") as Promise<{ node: number; edge: number }>;

/** Centre of the first node that is fully inside the viewport — a mouse.move to a
 *  node scrolled out of view would silently hover nothing. */
async function onscreenNode(page: Page, rendered: number) {
  const all = page.locator(".react-flow__node");
  for (let i = 0; i < Math.min(rendered, 250); i++) {
    const bb = await all.nth(i).boundingBox();
    if (bb && bb.x > 80 && bb.y > 140 && bb.x + bb.width < 1200 && bb.y + bb.height < 820 && bb.width > 20)
      return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
  }
  throw new Error("no node inside the viewport");
}

test("hovering one element does not re-render every node on the board [issue-00019]", async ({
  page,
}) => {
  const rendered = await openLargeBoard(page);
  const target = await onscreenNode(page, rendered);

  await page.evaluate("window.__reset()");
  await page.mouse.move(target.x, target.y, { steps: 2 });
  await page.waitForTimeout(400);

  const { node } = await touched(page);
  // Dimming the board on hover is intended (design-00003 Tier A) — doing it by
  // rebuilding every node's props is not. Before the fix this equalled `rendered`.
  expect(node).toBeLessThan(rendered / 4);
});

// Isolate on "Order Placed" (e1), both directions, depth 2 → e1 + ag1 + rm1 + c1.
// The anchor's own edges are r3 (ag1→e1) and r4 (e1→rm1); r2 (c1→ag1) is two hops
// out, inside the view but not incident to the anchor.
const isolateAroundOrderPlaced = async (page: Page) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await page.getByRole("button", { name: "Design" }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(8);
  await nodes(page, "domainEvent").filter({ hasText: "Order Placed" }).click();
  await page.getByRole("button", { name: "Off", exact: true }).click(); // Isolate on
  await page.getByRole("button", { name: "Both" }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(4);
  await page.waitForTimeout(450); // let the isolate refit (300ms) settle before hit-testing
};

test("isolates a whole Bounded Context from its menu, keeping the far side of a seam [design-00003]", async ({
  page,
}) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await page.getByRole("button", { name: "Design" }).click();
  const all = page.locator(".react-flow__node");
  await expect(all).toHaveCount(8); // ord: a1 c1 ag1 e1 rm1 · pay: ex1 c2 e2

  // a seam: Ordering's Actor issues Payment's Command (manual cross-context link)
  const ab = (await page.locator('.react-flow__node[data-id="a1"]').boundingBox())!;
  const cb = (await page.locator('.react-flow__node[data-id="c2"]').boundingBox())!;
  await page.mouse.move(ab.x + ab.width / 2, ab.y + ab.height);
  await page.mouse.down();
  await page.mouse.move(cb.x + cb.width / 2, (ab.y + ab.height + cb.y) / 2, { steps: 8 });
  await page.mouse.move(cb.x + cb.width / 2, cb.y, { steps: 8 });
  await page.mouse.up();
  await expect(edges(page)).toHaveCount(7);

  await page.locator(".react-flow__pane").click({ position: { x: 20, y: 300 } });
  await page.getByRole("button", { name: "Context options" }).first().click(); // Ordering
  await page.getByRole("button", { name: "Isolate this context" }).click();
  await page.waitForTimeout(500);

  // Ordering's five members plus c2 — the element on the far side of the seam, so
  // the cross-context relation still reads as a relation
  await expect(all).toHaveCount(6);
  await expect(page.locator('.react-flow__node[data-id="c2"]')).toHaveCount(1);
  await expect(page.locator('.react-flow__node[data-id="e2"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Exit Isolate" })).toBeVisible();

  // Esc leaves it and the whole board comes back
  await page.keyboard.press("Escape");
  await expect(all).toHaveCount(8);
});

test("Isolate stays visible with nothing selected and exits with Esc [design-00003]", async ({
  page,
}) => {
  const all = page.locator(".react-flow__node");
  const chip = page.getByRole("button", { name: "Exit Isolate" });
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await expect(chip).toHaveCount(0); // nothing isolated → no chip
  await isolateAroundOrderPlaced(page);
  await expect(chip).toBeVisible();

  // Selecting an edge clears the node selection, so the panel's On/Off control goes
  // out of view — the chip is what keeps the mode visible and exitable.
  const bb = (await page.locator('.react-flow__edge[data-id="r3"]').boundingBox())!;
  await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height * 0.15);
  await expect(all).toHaveCount(4); // the pinned anchor still frames the view
  await expect(chip).toBeVisible();

  // Esc leaves the mode and the whole board comes back.
  await page.keyboard.press("Escape");
  await expect(chip).toHaveCount(0);
  await expect(all).toHaveCount(8);
});

test("inside Isolate every edge of the neighbourhood traces on hover [issue-00023]", async ({
  page,
}) => {
  await isolateAroundOrderPlaced(page);
  const edge = (id: string) => page.locator(`.react-flow__edge[data-id="${id}"]`);

  // r2 is in the view but not incident to the anchor. Before the fix the committed
  // scope was the anchor's own edges, so hovering it did nothing.
  await edge("r2").hover({ force: true });
  await expect(edge("r2")).toHaveClass(/animated/);
  await expect(edge("r3").locator(".react-flow__edge-path")).toHaveCSS("opacity", "0.12");

  await page.mouse.move(5, 5);
  await expect(edge("r2")).not.toHaveClass(/animated/);
  await expect(edge("r3").locator(".react-flow__edge-path")).toHaveCSS("opacity", "1");
});

test("the Isolate anchor is pinned: selecting another element does not re-frame it [issue-00024]", async ({
  page,
}) => {
  await isolateAroundOrderPlaced(page);
  const all = page.locator(".react-flow__node");
  const node = (id: string) => page.locator(`.react-flow__node[data-id="${id}"]`);

  // Order View (rm1) is a leaf: re-anchoring on it would drop the command (c1) and
  // leave three nodes. Pinned, the view is unchanged and only the selection moves.
  await node("rm1").click();
  await expect(all).toHaveCount(4);
  await expect(node("c1")).toHaveCount(1);
  await expect(page.getByLabel("Label", { exact: true })).toHaveValue("Order View");

  // Re-anchoring stays possible, but only explicitly: Off then On with rm1 selected.
  await page.getByRole("button", { name: "On", exact: true }).click();
  await expect(all).toHaveCount(8);
  await page.getByRole("button", { name: "Off", exact: true }).click();
  await expect(all).toHaveCount(3);
});

test("leaving Isolate lands on the element last read inside the view [issue-00025]", async ({
  page,
}) => {
  await isolateAroundOrderPlaced(page); // anchor: Order Placed (e1); view also holds rm1
  const pane = page.locator(".react-flow__pane");
  const pb = (await pane.boundingBox())!;
  const centre = { x: pb.x + pb.width / 2, y: pb.y + pb.height / 2 };
  const offCentre = async (id: string) => {
    const b = (await page.locator(`.react-flow__node[data-id="${id}"]`).boundingBox())!;
    return Math.hypot(b.x + b.width / 2 - centre.x, b.y + b.height / 2 - centre.y);
  };

  // read another element inside the view, then leave
  await page.locator('.react-flow__node[data-id="rm1"]').click();
  await pane.click({ position: { x: 20, y: pb.height / 2 } });
  await page.waitForTimeout(600);
  await expect(page.locator(".react-flow__node")).toHaveCount(8);

  // the camera holds what was being read, not the anchor it was framed on
  expect(await offCentre("rm1")).toBeLessThan(60);
  expect(await offCentre("e1")).toBeGreaterThan(60);
});

test("leaving Isolate keeps the camera on the anchor, not on the whole board [issue-00021]", async ({
  page,
}) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", largeBoard(10));
  const events = nodes(page, "domainEvent");
  await expect(events).toHaveCount(20);

  // a mid-board event, tracked by id (the repeated copies share labels)
  const id = await events.nth(10).getAttribute("data-id");
  const anchor = page.locator(`.react-flow__node[data-id="${id}"]`);
  const fitted = (await anchor.boundingBox())!; // tiny: the whole board is fitted

  await anchor.click();
  await page.getByRole("button", { name: "Off", exact: true }).click(); // Isolate on
  await page.waitForTimeout(600);
  expect((await anchor.boundingBox())!.width).toBeGreaterThan(fitted.width * 2);

  // clear the selection on empty canvas — the board comes back, but the camera
  // should stay where the modeller was looking
  const pane = page.locator(".react-flow__pane");
  const pb = (await pane.boundingBox())!;
  await pane.click({ position: { x: 40, y: pb.height / 2 } });
  await page.waitForTimeout(600);
  await expect(events).toHaveCount(20);

  const after = (await anchor.boundingBox())!;
  // Before the fix this refitted all ten copies, shrinking the anchor back to
  // `fitted` somewhere off screen; now it stays readable and centred.
  expect(after.width).toBeGreaterThan(fitted.width * 2);
  expect(Math.abs(after.x + after.width / 2 - (pb.x + pb.width / 2))).toBeLessThan(pb.width * 0.2);
});

test("a zoom gesture inside one semantic band does not stall a frame [issue-00019]", async ({
  page,
}) => {
  const rendered = await openLargeBoard(page);
  await page.evaluate(FRAME_CLOCK);

  await page.mouse.move(700, 480);
  await page.evaluate("window.__frameStart()");
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, -60); // small ticks: stay inside the current band
    await page.waitForTimeout(60);
  }
  const frames = (await page.evaluate("window.__frameStop()")) as {
    count: number;
    second: number;
  };
  // Same band → the same elements are visible, so nothing about them needs to change.
  expect(await page.locator(".react-flow__node").count()).toBe(rendered);
  expect(frames.count).toBeGreaterThan(10); // the clock actually sampled the gesture
  // Re-rendering the whole board stalls *every* tick frame of the gesture (2nd worst
  // 68-73ms here, all of the top five ≥65ms); a healthy in-band tick costs ~26ms and
  // holds there even under load, where the worst frame alone can hit 68ms from one
  // scheduling stall. So the guard reads the second worst, at 50ms (issue-00020).
  expect(frames.second).toBeLessThan(50);
});
