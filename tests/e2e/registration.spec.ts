import { test, expect, devices } from "@playwright/test";

test("iPhone country control uses a native selector with flags and submits the selected country", async ({ browser }) => {
  const { defaultBrowserType: _browserType, ...iphone } = devices["iPhone 13"];
  const context = await browser.newContext(iphone);
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:3001/");
    const selector = page.getByRole("combobox", { name: "Country", exact: true });
    await expect(selector).toBeVisible();
    await expect(selector.locator('option[value="PK"]')).toHaveText("🇵🇰 Pakistan");
    await selector.selectOption("PK");
    await expect(page.locator(".country-native img")).toHaveAttribute("src", "/flags/pk.svg");
    await expect(page.locator('input[name="country"]')).toHaveValue("PK");
    const bounds = await selector.boundingBox();
    expect(bounds!.width).toBeGreaterThan(200);expect(bounds!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: "screenshots/registration-iphone-native.png" });
    await page.getByLabel("Name", { exact: true }).fill("iPhone Registration");
    const [response] = await Promise.all([page.waitForResponse(r => r.url().endsWith("/api/runs") && r.request().method() === "POST"), page.getByRole("button", { name: "Play", exact: true }).click()]);
    expect(response.status()).toBe(201);expect((await response.json()).run.country).toBe("PK");
    await expect(page.getByRole("dialog", { name: "How to play", exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test("blank country starts successfully and duplicate names show an error without consuming a play", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator(".country-trigger [data-blank-flag]")).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Blank Country Player");
  const [created] = await Promise.all([page.waitForResponse(r => r.url().endsWith("/api/runs") && r.request().method() === "POST"), page.getByRole("button", { name: "Play", exact: true }).click()]);
  expect(created.status()).toBe(201);expect((await created.json()).run.country).toBe("");
  await page.goto("/");await page.getByLabel("Name", { exact: true }).fill("blank  COUNTRY player");
  const [duplicate] = await Promise.all([page.waitForResponse(r => r.url().endsWith("/api/runs") && r.request().method() === "POST"), page.getByRole("button", { name: "Play", exact: true }).click()]);
  expect(duplicate.status()).toBe(409);await expect(page.getByRole("form", { name: "Enter the game" }).getByRole("alert")).toHaveText(/already taken/);
  expect((await (await page.request.get("/api/attempts")).json()).used).toBe(1);
  const results = await Promise.all(Array.from({ length: 3 }, () => request.post("/api/runs", { data: { nickname: "Concurrent Name", consent: true } })));
  expect(results.filter(r => r.status() === 201)).toHaveLength(1);expect(results.filter(r => r.status() === 409)).toHaveLength(2);
  const invalid = await request.post("/api/runs", { data: { nickname: "Invalid Country", country: "ZZ", consent: true } });
  expect(invalid.status()).toBe(400);
});
