import { test, expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Mobile checks at 320×844 and 390×844 using Chromium with touch emulation.
 * Each test has an explicit summary below. Screenshots are for human review;
 * these tests do not claim to measure visual aesthetics or compare pixel baselines.
 */
const articlePath = '/blog/configure-runpod-instance/';

async function openPage(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), `HTTP status for ${path}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

async function capture(page: Page, info: TestInfo, name: string, fullPage = false) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage });
  await info.attach(name, { path, contentType: 'image/png' });
}

for (const [name, path] of [['homepage', '/'], ['CV', '/cv/'], ['RunPod article', articlePath]]) {
  // SUMMARY (three tests): the selected page responds with HTTP 200, displays
  // its heading and all four header links, has no horizontal document overflow,
  // and raises no uncaught JavaScript errors. Header links fit the viewport and
  // have a minimum 44px height. Save a full-page image to review content visually.
  test(`${name}: loads, navigation fits, no horizontal overflow or JS errors`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await openPage(page, path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const navigation = page.getByRole('navigation', { name: 'Main navigation' });
    for (const label of ['Home', 'Blog', 'About', 'CV']) {
      const link = navigation.getByRole('link', { name: label, exact: true });
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await capture(page, info, name.toLowerCase().replaceAll(' ', '-'), true);
    expect(errors).toEqual([]);
  });
}

// SUMMARY: capture the lower CV sections for visual review, then click every
// Back to top link and verify the #top target reaches the viewport's top.
// #top is the main element below the header, so scrollY need not equal zero.
test('CV: lower sections and all back-to-top links work', async ({ page }, info) => {
  await openPage(page, '/cv/');
  for (const id of ['skills-title', 'education-title', 'languages-title']) {
    const heading = page.locator(`#${id}`);
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
    await capture(page, info, id);
  }
  const links = page.getByRole('link', { name: 'Back to top' });
  expect(await links.count()).toBe(4);
  for (const link of await links.all()) {
    await link.click();
    await expect(page).toHaveURL(/\/cv\/#top$/);
    await expect.poll(() => page.locator('#top').evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThanOrEqual(2);
  }
});

// SUMMARY: all four article tags are visible and have 44px-high touch targets.
// Follow the AI tag to its archive and verify that archive links to the article.
test('article: tags lead to related posts', async ({ page }) => {
  await openPage(page, articlePath);
  const tags = page.getByRole('navigation', { name: 'Article tags' });
  for (const label of ['AI', 'RunPod', 'Python', 'DevOps']) {
    const link = tags.getByRole('link', { name: label, exact: true });
    await expect(link).toBeVisible();
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await tags.getByRole('link', { name: 'AI', exact: true }).click();
  await expect(page).toHaveURL(/\/blog\/tags\/ai\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AI');
  await expect(page.locator(`a[href="${articlePath}"]`)).toBeVisible();
});

// SUMMARY: every article table and code block fits inside the viewport.
// Wide blocks must allow horizontal scrolling and actually change scrollLeft.
// Capture all tables and one wide code block to inspect readability and padding.
// Require a wide code block so scrolling coverage cannot silently disappear.
test('article: tables and code blocks contain overflow and scroll', async ({ page }, info) => {
  await openPage(page, articlePath);
  const blocks = page.locator('pre, table');
  expect(await blocks.count()).toBeGreaterThan(0);
  let tableIndex = 0;
  let capturedCode = false;
  for (const block of await blocks.all()) {
    const result = await block.evaluate(el => {
      const box = el.getBoundingClientRect();
      const wide = el.scrollWidth > el.clientWidth + 1;
      const overflow = getComputedStyle(el).overflowX;
      el.scrollLeft = wide ? 100 : 0;
      return { tag: el.tagName, left: box.left, right: box.right, wide, overflow, scrollLeft: el.scrollLeft };
    });
    expect(result.left).toBeGreaterThanOrEqual(0);
    expect(result.right).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    if (result.wide) {
      expect(['auto', 'scroll']).toContain(result.overflow);
      expect(result.scrollLeft).toBeGreaterThan(0);
    }
    if (result.tag === 'TABLE' || (result.wide && !capturedCode)) {
      await block.scrollIntoViewIfNeeded();
      await capture(page, info, result.tag === 'TABLE' ? `table-${++tableIndex}` : 'wide-code');
      if (result.tag === 'PRE') capturedCode = true;
    }
  }
  expect(tableIndex).toBeGreaterThan(0);
  expect(capturedCode).toBe(true);
});
