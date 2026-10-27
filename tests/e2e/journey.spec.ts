import { expect, test } from "@playwright/test";

const stamp = Date.now().toString(36);

test("signed-out visitors are redirected away from protected pages", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/);
});

test("sign up → onboarding → dashboard → create a project → open a role", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Find your team" }).first().click();
  await expect(page).toHaveURL(/sign-up/);

  await page.getByLabel("Your name").fill("E2E Tester");
  await page.getByLabel("Email").fill(`e2e-${stamp}@example.com`);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Create account" }).click();

  // Step 1: basics
  await expect(page.getByRole("heading", { name: "Let's start with the basics" })).toBeVisible();
  await page.getByLabel("Username").fill(`e2e${stamp}`);
  await page.getByRole("button", { name: "Save and continue" }).click();
  // Step 2: about
  await expect(page.getByRole("heading", { name: "Tell people what drives you" })).toBeVisible();
  await page.getByLabel("Bio").fill("I build small robots and I want to find people to make something useful for my community.");
  await page.getByRole("button", { name: "Save and continue" }).click();
  // Step 3: skills
  await expect(page.getByRole("heading", { name: "What can you bring to a team?" })).toBeVisible();
  await page.locator("#skills").click();
  await page.getByLabel("Search skills").fill("Python");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save and continue" }).click();
  // Step 4 and 5
  await expect(page.getByRole("heading", { name: "What do you want to work on?" })).toBeVisible();
  await page.getByRole("button", { name: "Robotics & hardware" }).click();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByRole("heading", { name: "Availability, links and privacy" })).toBeVisible();
  await page.getByRole("button", { name: "Finish and go to dashboard" }).click();

  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText("Glad you're here, E2E.")).toBeVisible();

  // Create a project
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill(`E2E Rover ${stamp}`);
  await page.getByLabel("One-line pitch").fill("A tiny rover that maps air quality around our school");
  await page.getByLabel("Description").fill("We want to build a small rover that drives around the school grounds and measures air quality, so students can see where pollution concentrates.");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `E2E Rover ${stamp}` })).toBeVisible();
  await expect(page.getByText("Your project is live.")).toBeVisible();

  // Open a role from the edit page
  await page.getByRole("link", { name: "Manage roles" }).click();
  await page.getByRole("button", { name: "Open a role" }).first().click();
  await page.getByLabel("Role title").fill("Hardware engineer");
  await page.getByRole("button", { name: "Open role" }).click();
  await expect(page.getByText("Role opened")).toBeVisible();
});

test("public profile and leaderboard render for signed-out visitors @mobile", async ({ page }) => {
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
  await page.goto("/projects/airwatch");
  await expect(page.getByRole("heading", { level: 1, name: "AirWatch" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Join to apply" })).toBeVisible();
});
