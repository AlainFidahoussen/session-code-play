import { test, expect } from "@playwright/test";
import { signUp, selectProblem, setEditorCode, runCode, submitCode, uniqueUsername } from "./helpers";

const TWO_SUM_CORRECT = `def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
`;

const TWO_SUM_WRONG = `def two_sum(nums, target):
    return None
`;

test("sign up, run a correct solution, then submit it", async ({ page }) => {
  const username = uniqueUsername("solo");
  await signUp(page, username, "password123");

  await selectProblem(page, "Two Sum");
  await setEditorCode(page, TWO_SUM_CORRECT);

  await runCode(page);
  await expect(page.getByText("2 / 2 passed")).toBeVisible();
  await expect(page.getByText("Test 1")).toBeVisible();
  await expect(page.getByText("Test 2")).toBeVisible();

  await submitCode(page);
  await expect(page.getByText("5 / 5 passed")).toBeVisible();
  // Hidden test indices continue numbering after the 2 visible tests (0, 1),
  // so the 3 hidden tests render as "Hidden test 3/4/5", not "1/2/3".
  await expect(page.getByText(/^Hidden test \d+$/)).toHaveCount(3);
});

test("run an incorrect solution shows failing visible tests", async ({ page }) => {
  const username = uniqueUsername("solo");
  await signUp(page, username, "password123");

  await selectProblem(page, "Two Sum");
  await setEditorCode(page, TWO_SUM_WRONG);

  await runCode(page);
  await expect(page.getByText("0 / 2 passed")).toBeVisible();
});

test("saved code survives a reload", async ({ page }) => {
  const username = uniqueUsername("solo");
  await signUp(page, username, "password123");

  await selectProblem(page, "Two Sum");
  await setEditorCode(page, TWO_SUM_CORRECT);

  // Autosave is debounced 800ms; wait for the PUT to actually land.
  await page.waitForResponse(
    (res) => res.url().includes("/api/answers/two-sum") && res.request().method() === "PUT",
  );

  await page.reload();
  await selectProblem(page, "Two Sum");
  await expect(page.locator(".cm-content")).toContainText("for i in range(len(nums)):");
});
