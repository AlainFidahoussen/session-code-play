import { expect, type Page } from "@playwright/test";

export async function signUp(page: Page, username: string, password: string): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Need an account? Sign up" }).click();
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText(username, { exact: true })).toBeVisible();
}

export async function logIn(page: Page, username: string, password: string): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText(username, { exact: true })).toBeVisible();
}

export async function selectProblem(page: Page, title: string): Promise<void> {
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: title }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

/** Replaces the CodeMirror editor's full contents in one shot, so its
 * language-aware auto-indent extensions never see per-keystroke input. */
export async function setEditorCode(page: Page, code: string): Promise<void> {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(code);
  await expect(editor).toContainText(code.trim().split("\n")[0] ?? "");
}

export async function runCode(page: Page): Promise<void> {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/run") && res.request().method() === "POST"),
    page.getByRole("button", { name: "Run" }).click(),
  ]);
  expect(response.ok()).toBe(true);
}

export async function submitCode(page: Page): Promise<void> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/submit") && res.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Submit" }).click(),
  ]);
  expect(response.ok()).toBe(true);
}

export function uniqueUsername(label: string): string {
  return `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
