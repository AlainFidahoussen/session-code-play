import { test, expect, type Browser } from "@playwright/test";
import { signUp, selectProblem, setEditorCode, runCode, uniqueUsername } from "./helpers";

async function newUserPage(browser: Browser, label: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const username = uniqueUsername(label);
  await signUp(page, username, "password123");
  return { context, page, username };
}

test("saved code is isolated per user, even for the same problem", async ({ browser }) => {
  const alice = await newUserPage(browser, "alice");
  const bob = await newUserPage(browser, "bob");

  try {
    await selectProblem(alice.page, "Two Sum");
    await setEditorCode(alice.page, "def two_sum(nums, target):\n    # alice-was-here\n    pass\n");
    await alice.page.waitForResponse(
      (res) => res.url().includes("/api/answers/two-sum") && res.request().method() === "PUT",
    );

    // Bob has never touched this problem — he must see the starter code, not Alice's.
    await selectProblem(bob.page, "Two Sum");
    await expect(bob.page.locator(".cm-content")).not.toContainText("alice-was-here");
    await expect(bob.page.locator(".cm-content")).toContainText("def two_sum(nums, target):");

    await setEditorCode(bob.page, "def two_sum(nums, target):\n    # bob-was-here\n    pass\n");
    await bob.page.waitForResponse(
      (res) => res.url().includes("/api/answers/two-sum") && res.request().method() === "PUT",
    );

    // Reloading each user's session must still show only their own saved code.
    await alice.page.reload();
    await selectProblem(alice.page, "Two Sum");
    await expect(alice.page.locator(".cm-content")).toContainText("alice-was-here");
    await expect(alice.page.locator(".cm-content")).not.toContainText("bob-was-here");

    await bob.page.reload();
    await selectProblem(bob.page, "Two Sum");
    await expect(bob.page.locator(".cm-content")).toContainText("bob-was-here");
    await expect(bob.page.locator(".cm-content")).not.toContainText("alice-was-here");
  } finally {
    await alice.context.close();
    await bob.context.close();
  }
});

test("concurrent users can run and submit at the same time without cross-talk", async ({
  browser,
}) => {
  const users = await Promise.all([
    newUserPage(browser, "carol"),
    newUserPage(browser, "dave"),
    newUserPage(browser, "erin"),
  ]);

  try {
    await Promise.all(
      users.map(async ({ page }) => {
        await selectProblem(page, "Contains Duplicate");
        await setEditorCode(
          page,
          "def contains_duplicate(nums):\n    return len(nums) != len(set(nums))\n",
        );
        await runCode(page);
        await expect(page.getByText("2 / 2 passed")).toBeVisible();
      }),
    );
  } finally {
    await Promise.all(users.map((u) => u.context.close()));
  }
});
