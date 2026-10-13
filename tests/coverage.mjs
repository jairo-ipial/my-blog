/**
 * SUMMARY: collect Chromium runtime coverage for Home, CV, and the RunPod
 * article at 320px and 390px. Exercise navigation, RSS, CV back-to-top, article
 * tags, and code/table scrolling. Report executed JS functions and used CSS
 * bytes per resource. This is browser asset coverage, not Astro/TypeScript
 * source-line coverage: Astro frontmatter executes outside the browser.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:4321';
const output = new URL('./coverage/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 390]) {
    for (const [name, path] of [['home', '/'], ['cv', '/cv/'], ['article', '/blog/configure-runpod-instance/']]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
      await page.coverage.startCSSCoverage({ resetOnNavigation: false });
      const response = await page.goto(new URL(path, baseURL).href);
      assert.equal(response.status(), 200, `${name}: page must load`);
      await page.evaluate(() => document.fonts.ready);
      if (name === 'cv') {
        await page.getByRole('link', { name: 'Back to top' }).last().click();
        assert.equal(new URL(page.url()).hash, '#top');
      }
      if (name === 'article') {
        await page.locator('pre, table').evaluateAll(blocks => blocks.forEach(block => { block.scrollLeft = 100; }));
        await page.getByRole('navigation', { name: 'Article tags' }).getByRole('link', { name: 'AI', exact: true }).click();
        assert.equal(new URL(page.url()).pathname, '/blog/tags/ai/');
      }
      if (name === 'home') {
        await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Blog', exact: true }).click();
        assert.equal(new URL(page.url()).pathname.replace(/\/$/, ''), '/blog');
      }
      await page.locator('footer').getByRole('link', { name: 'Subscribe via RSS' }).click();
      assert.equal(new URL(page.url()).pathname, '/rss.xml');
      const js = await page.coverage.stopJSCoverage();
      const css = await page.coverage.stopCSSCoverage();
      const summary = {
        name, width,
        javascript: js.map(entry => ({
          url: entry.url,
          functions: entry.functions.length,
          executedFunctions: entry.functions.filter(fn => fn.ranges.some(range => range.count > 0)).length,
        })),
        css: css.map(entry => {
          // Merge overlapping executed ranges to avoid counting bytes twice.
          const ranges = [...entry.ranges].sort((a, b) => a.start - b.start);
          let used = 0, end = 0;
          for (const range of ranges) { used += Math.max(0, range.end - Math.max(end, range.start)); end = Math.max(end, range.end); }
          return { url: entry.url, totalBytes: entry.text.length, usedBytes: used,
            usedPercent: entry.text.length ? +(100 * used / entry.text.length).toFixed(1) : 0 };
        }),
      };
      await writeFile(new URL(`${name}-${width}.json`, output), JSON.stringify({ summary, raw: { js, css } }, null, 2));
      results.push(summary);
      await page.close();
    }
  }
} finally { await browser.close(); }
await writeFile(new URL('summary.json', output), JSON.stringify(results, null, 2));
const lines = ['# Browser coverage', '', 'Per-resource coverage; results are not aggregated across pages.', '', '| Scenario | Resource | Metric |', '| --- | --- | --- |'];
for (const result of results) {
  for (const entry of result.javascript) lines.push(`| ${result.name} ${result.width}px | ${entry.url} | ${entry.executedFunctions}/${entry.functions} JS functions executed |`);
  for (const entry of result.css) lines.push(`| ${result.name} ${result.width}px | ${entry.url} | ${entry.usedPercent}% CSS bytes used |`);
}
lines.push('', 'No pass/fail coverage threshold is imposed. Shared desktop/print styles and development tooling can lower the percentages. Server-side Astro code is not measured.');
await writeFile(new URL('report.md', output), lines.join('\n') + '\n');
console.log(`Collected coverage for ${results.length} scenarios. See tests/coverage/report.md and summary.json.`);
