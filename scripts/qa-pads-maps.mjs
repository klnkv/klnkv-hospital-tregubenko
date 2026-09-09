import { chromium } from "playwright";
const shot = (page, path) => page.screenshot({ path, animations: "disabled", timeout: 8000 });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await phone.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

await page.goto("http://127.0.0.1:8080/", { waitUntil: "load", timeout: 30000 });
await page.getByRole("button", { name: "От ворот к дверям" }).waitFor({ timeout: 20000 });
await shot(page, "/workspace/screenshots/qa-title-phone.png");

await page.getByRole("button", { name: "От ворот к дверям" }).click();
await page.getByRole("button", { name: "Карта" }).waitFor({ timeout: 15000 });
await page.waitForTimeout(1500);
await shot(page, "/workspace/screenshots/qa-pads.png");

const svgs = await page.evaluate(() =>
  [...document.querySelectorAll("svg")].map((e) => ({
    cls: e.getAttribute("class"),
    circles: e.querySelectorAll("circle").length,
    lines: e.querySelectorAll("line").length,
    paths: e.querySelectorAll("path").length,
    vb: e.getAttribute("viewBox"),
  })),
);
console.log("svgs", JSON.stringify(svgs));

await page.touchscreen.tap(70, 770);
await page.waitForTimeout(400);
await shot(page, "/workspace/screenshots/qa-pads-left-gone.png");
console.log(
  "ops",
  await page.evaluate(() => [...document.querySelectorAll("svg g")].map((g) => getComputedStyle(g).opacity)),
);

await page.getByRole("button", { name: "Карта" }).click();
await page.getByRole("button", { name: "Приблизить" }).waitFor({ timeout: 8000 });
await page.waitForTimeout(600);
await shot(page, "/workspace/screenshots/qa-plan-fit.png");
for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Приблизить" }).click();
await page.waitForTimeout(200);
await shot(page, "/workspace/screenshots/qa-plan-zoom.png");
console.log("plan hud", await page.evaluate(() => document.body.innerText.match(/щипок[^\n]*/)?.[0]));
const canvases = await page.evaluate(() =>
  [...document.querySelectorAll("canvas")].map((c) => ({ w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight })),
);
console.log("canvases", JSON.stringify(canvases));
await page.getByRole("button", { name: "Закрыть" }).click();

await page.getByRole("button", { name: "Город" }).click();
await page.getByRole("button", { name: "Приблизить" }).waitFor({ timeout: 8000 });
await page.waitForTimeout(800);
await shot(page, "/workspace/screenshots/qa-town-fit.png");
for (let i = 0; i < 8; i++) await page.getByRole("button", { name: "Приблизить" }).click();
await page.waitForTimeout(200);
await shot(page, "/workspace/screenshots/qa-town-zoom.png");
console.log("town hud", await page.evaluate(() => document.body.innerText.match(/щипок[^\n]*/)?.[0]));

await browser.close();
console.log("done");
