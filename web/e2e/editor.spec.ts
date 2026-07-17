import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const fixture = (name: string) => path.join(__dirname, "fixtures", name);

// Create a node by simulating the palette's native HTML5 drop on the canvas.
async function dropElement(page: Page, type: string, x: number, y: number) {
  await page.evaluate(
    ({ type, x, y }) => {
      const pane = document.querySelector(".react-flow__pane") as HTMLElement;
      const r = pane.getBoundingClientRect();
      const dt = new DataTransfer();
      dt.setData("application/es-element", type);
      const clientX = r.left + x;
      const clientY = r.top + y;
      for (const t of ["dragover", "drop"]) {
        pane.dispatchEvent(
          new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX, clientY }),
        );
      }
    },
    { type, x, y },
  );
}

// Drag from a source node's right handle to a target node's left handle.
async function connect(page: Page, sourceSel: string, targetSel: string) {
  const source = page.locator(`${sourceSel} .react-flow__handle-right`);
  const target = page.locator(`${targetSel} .react-flow__handle-left`);
  const s = await source.boundingBox();
  const t = await target.boundingBox();
  if (!s || !t) throw new Error("handle not found");
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.down();
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 10 });
  await page.mouse.up();
}

const normalize = (m: { nodes: { id: string }[]; edges: { id: string }[] }) => ({
  nodes: [...m.nodes].sort((a, b) => a.id.localeCompare(b.id)),
  edges: [...m.edges].sort((a, b) => a.id.localeCompare(b.id)),
});

test("places a typed node by dragging from the palette [us-00001-AC-1.1]", async ({ page }) => {
  await page.goto("/");
  await dropElement(page, "domainEvent", 300, 200);
  await expect(page.locator(".react-flow__node-domainEvent")).toHaveCount(1);
  await expect(page.locator(".react-flow__node-domainEvent")).toContainText("Domain Event");
});

test("connects Actor -> Command with an issues edge [us-00002-AC-1.1]", async ({ page }) => {
  await page.goto("/");
  await dropElement(page, "actor", 200, 220);
  await dropElement(page, "command", 520, 220);
  await connect(page, ".react-flow__node-actor", ".react-flow__node-command");
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await expect(page.locator(".react-flow__edge")).toContainText("issues");
});

test("rejects Actor -> Domain Event [us-00002-AC-2.1]", async ({ page }) => {
  await page.goto("/");
  await dropElement(page, "actor", 200, 220);
  await dropElement(page, "domainEvent", 520, 220);
  await connect(page, ".react-flow__node-actor", ".react-flow__node-domainEvent");
  await expect(page.locator(".react-flow__edge")).toHaveCount(0);
});

test("attaches a hotspot via the property panel [us-00003-AC-1.1]", async ({ page }) => {
  await page.goto("/");
  await dropElement(page, "command", 300, 200);
  await page.locator(".react-flow__node-command").click();
  await page.getByRole("button", { name: "Add hotspot" }).click();
  await expect(page.locator(".react-flow__node-hotspot")).toHaveCount(1);
  await expect(page.locator(".react-flow__edge")).toContainText("annotates");
});

test("import then export round-trips the model [us-00004-AC-3.1]", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("model.json"));
  await expect(page.locator(".react-flow__node")).toHaveCount(4);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export" }).click(),
  ]);
  const exported = JSON.parse(readFileSync(await download.path(), "utf8"));
  const original = JSON.parse(readFileSync(fixture("model.json"), "utf8"));
  expect(normalize(exported)).toEqual(normalize(original));
});

test("shows an error on invalid import and keeps the model [spec-00001-XAC-2.1]", async ({
  page,
}) => {
  await page.goto("/");
  await dropElement(page, "actor", 300, 200);
  await page.setInputFiles("input[type=file]", fixture("invalid.json"));
  await expect(page.getByTestId("import-error")).toBeVisible();
  await expect(page.locator(".react-flow__node")).toHaveCount(1);
});

test("keeps the model local — no request carries it [spec-00001-XAC-1.1]", async ({ page }) => {
  const mutating: string[] = [];
  page.on("request", (req) => {
    if (["POST", "PUT", "PATCH"].includes(req.method())) {
      mutating.push(`${req.method()} ${req.url()}`);
    }
  });
  await page.goto("/");
  await dropElement(page, "actor", 200, 220);
  await dropElement(page, "command", 520, 220);
  await connect(page, ".react-flow__node-actor", ".react-flow__node-command");
  await page.waitForTimeout(700); // allow autosave (local only) to run
  expect(mutating).toEqual([]);
});

test("autosaves and restores on reload [us-00005-AC-1.1]", async ({ page }) => {
  await page.goto("/");
  await dropElement(page, "policy", 300, 200);
  await expect(page.locator(".react-flow__node-policy")).toHaveCount(1);
  await page.waitForTimeout(600); // autosave debounce is 400ms
  await page.reload();
  await expect(page.locator(".react-flow__node-policy")).toHaveCount(1);
});
