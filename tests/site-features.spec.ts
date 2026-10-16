import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { SITE_TITLE, SITE_DESCRIPTION } from '../src/consts';

const articlePath = '/blog/configure-runpod-instance/';
const removedSlugs = ['first-post', 'second-post', 'third-post', 'markdown-style-guide', 'using-mdx'];

async function articleMetadata() {
  const source = await readFile(new URL('../src/content/blog/configure-runPod-instance.md', import.meta.url), 'utf8');
  return {
    title: source.match(/^title: "(.+)"$/m)![1],
    description: source.match(/^description: "(.+)"$/m)![1],
  };
}

// SUMMARY: footer subscription is visible and touch-friendly on Home, Blog,
// About, CV, and the article. The feed is valid XML, has the site's configured
// identity, and includes the article's current title, description, and URL.
test('RSS: footer subscription and feed content work', async ({ page, request }) => {
  for (const path of ['/', '/blog/', '/about/', '/cv/', articlePath]) {
    expect((await page.goto(path))?.status()).toBe(200);
    const link = page.locator('footer').getByRole('link', { name: 'Subscribe via RSS' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/rss.xml');
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  const response = await request.get('/rss.xml');
  expect(response.status()).toBe(200);
  const xml = await response.text();
  const feed = await page.evaluate(xml => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return {
      errors: doc.querySelectorAll('parsererror').length,
      title: doc.querySelector('channel > title')?.textContent,
      description: doc.querySelector('channel > description')?.textContent,
      items: [...doc.querySelectorAll('item')].map(item => ({
        title: item.querySelector('title')?.textContent,
        description: item.querySelector('description')?.textContent,
        link: item.querySelector('link')?.textContent,
      })),
    };
  }, xml);
  expect(feed.errors).toBe(0);
  expect(feed.title).toBe(SITE_TITLE);
  expect(feed.description).toBe(SITE_DESCRIPTION);
  const expected = await articleMetadata();
  expect(feed.items).toContainEqual({ ...expected, link: expect.stringContaining(articlePath) });
  for (const slug of removedSlugs) expect(xml).not.toContain(`/blog/${slug}/`);
});

// SUMMARY: an unknown URL returns HTTP 404 and branded recovery content,
// remains within the mobile viewport, is marked noindex, and both recovery
// buttons actually navigate to working Home and Blog pages. Capture its layout.
test('404: missing pages provide working recovery links', async ({ page }, info) => {
  const missingPath = '/test-page-that-does-not-exist/';
  expect((await page.goto(missingPath))?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('That page took a wrong turn.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  const screenshot = info.outputPath('404.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  await info.attach('404', { path: screenshot, contentType: 'image/png' });
  for (const [name, path] of [['Back to Home', '/'], ['Explore the Blog', '/blog/']]) {
    await page.goto(missingPath);
    const link = page.getByRole('link', { name, exact: true });
    await expect(link).toHaveAttribute('href', path);
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await link.click();
    expect(new URL(page.url()).pathname).toBe(path);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  }
});

// SUMMARY: article title/description and Open Graph values match its Markdown
// metadata. Its preview image is the article artwork, not the site fallback,
// and is retrievable as an image. Home has a different, working branded fallback.
// This checks served metadata, not social platforms' cached preview rendering.
test('sharing: article metadata and preview images are correct', async ({ page, request }) => {
  const expected = await articleMetadata();
  expect(expected.description).not.toBe('RunPod instance configuration encounters');
  await page.goto(articlePath);
  await expect(page).toHaveTitle(expected.title);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', expected.description);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', expected.title);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', expected.description);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  const articleImage = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(articleImage).toBeTruthy();
  expect(new URL(articleImage!).pathname).toContain('AIVideoBakeryPipeline');
  // Fetch through the tested server, even when generated metadata uses the public domain.
  let response = await request.get(new URL(articleImage!).pathname);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^image\//);
  await page.goto('/');
  const fallback = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(fallback).toBeTruthy();
  expect(fallback).not.toBe(articleImage);
  expect(new URL(fallback!).pathname).toContain('jairo-ipial-blog-cover');
  response = await request.get(new URL(fallback!).pathname);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^image\//);
});

// SUMMARY: archived starter posts are absent from public listings, tag pages,
// and RSS; removed post URLs and unused tags return 404. The RunPod article
// remains discoverable, while the active Astro tag lists the new Astro articles.
test('content: archived templates stay out of the public blog', async ({ page, request }) => {
  for (const path of ['/', '/blog/', '/blog/tags/ai/']) {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.locator(`main a[href="${articlePath}"]`).first()).toBeVisible();
    for (const slug of removedSlugs) await expect(page.locator(`a[href="/blog/${slug}/"]`)).toHaveCount(0);
  }
  for (const path of [...removedSlugs.map(slug => `/blog/${slug}/`), '/blog/tags/markdown/', '/blog/tags/mdx/']) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  expect((await page.goto('/blog/tags/astro/'))?.status()).toBe(200);
  for (const slug of ['astro-blog-production-seo', 'astro-english-spanish-pages', 'astro-playwright-production-tests']) {
    await expect(page.locator(`main a[href="/blog/${slug}/"]`)).toBeVisible();
  }
  for (const slug of removedSlugs) {
    await expect(page.locator(`a[href="/blog/${slug}/"]`)).toHaveCount(0);
  }
});

// SUMMARY: mobile table columns retain at least 120px of content width and
// enough padding to separate adjacent values. At least one table must overflow
// locally and successfully scroll sideways without widening the document.
test('tables: mobile columns retain readable spacing', async ({ page }) => {
  await page.goto(articlePath);
  const tables = page.locator('table');
  expect(await tables.count()).toBeGreaterThan(0);
  let scrollable = 0;
  for (const table of await tables.all()) {
    const result = await table.evaluate(table => {
      const cells = [...table.querySelectorAll('th, td')].map(cell => {
        const style = getComputedStyle(cell);
        const left = parseFloat(style.paddingLeft), right = parseFloat(style.paddingRight);
        return { contentWidth: cell.getBoundingClientRect().width - left - right,
          left, right, top: parseFloat(style.paddingTop), bottom: parseFloat(style.paddingBottom) };
      });
      const wide = table.scrollWidth > table.clientWidth + 1;
      table.scrollLeft = 100;
      return { cells, wide, scrollLeft: table.scrollLeft };
    });
    for (const cell of result.cells) {
      expect(cell.contentWidth).toBeGreaterThanOrEqual(119);
      expect(cell.left).toBeGreaterThanOrEqual(16);
      expect(cell.right).toBeGreaterThanOrEqual(16);
      expect(cell.top).toBeGreaterThanOrEqual(12);
      expect(cell.bottom).toBeGreaterThanOrEqual(12);
    }
    if (result.wide) { scrollable++; expect(result.scrollLeft).toBeGreaterThan(0); }
  }
  expect(scrollable).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
});

// SUMMARY: publication dates on Home, Blog, tag archives, and the article must
// display the UTC calendar day recorded in their datetime attribute. This
// catches server-timezone shifts such as Oct 12 becoming Oct 11 in Bogotá.
test('dates: publication labels preserve the frontmatter calendar day', async ({ page }) => {
  for (const path of ['/', '/blog/', '/blog/tags/ai/', articlePath]) {
    expect((await page.goto(path))?.status()).toBe(200);
    const dates = page.locator('main time');
    expect(await dates.count()).toBeGreaterThan(0);
    for (const date of await dates.all()) {
      const timestamp = await date.getAttribute('datetime');
      expect(timestamp).toBeTruthy();
      const expected = new Date(timestamp!).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
      });
      await expect(date).toHaveText(expected);
    }
  }
});

// SUMMARY: About uses a personal page presentation, with a clear heading,
// loaded image, CV link, and no publication date or article-tag controls.
// Check narrow-screen overflow and capture the updated layout for review.
test('About: personal layout omits article metadata', async ({ page }, info) => {
  expect((await page.goto('/about/'))?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('About Me');
  await expect(page.locator('main time')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Article tags' })).toHaveCount(0);
  const image = page.locator('main img');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole('link', { name: 'Explore my professional experience' })).toHaveAttribute('href', '/cv/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  const path = info.outputPath('about.png');
  await page.screenshot({ path, fullPage: true });
  await info.attach('about', { path, contentType: 'image/png' });
});
