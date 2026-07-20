import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const fixture = (name: string) => path.join(__dirname, "fixtures", name);

const addContext = (page: Page) => page.getByRole("button", { name: "Add context" }).click();
const addEvent = (page: Page) => page.getByRole("button", { name: "Event", exact: true }).first().click();
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

test("a second context adds a column group after the first [us-00006-AC-1.1]", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addContext(page);
  const evBtns = page.getByRole("button", { name: "Event", exact: true });
  await evBtns.nth(0).click();
  await evBtns.nth(1).click();
  await expect(nodes(page, "domainEvent")).toHaveCount(2);
  const xs = await nodes(page, "domainEvent").evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().x),
  );
  expect(Math.max(...xs)).toBeGreaterThan(Math.min(...xs)); // second context to the right
});

test("elements are not free-draggable [us-00007-AC-4.1]", async ({ page }) => {
  await page.goto("/");
  await addContext(page);
  await addEvent(page);
  await expect(nodes(page, "domainEvent")).not.toHaveClass(/draggable/);
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
