import { test, expect } from '@playwright/test';

// Astro dev/preview do not implement Cloudflare's _headers rules.
// Opt in only against Wrangler's local runtime or a deployed Cloudflare site.
test('Cloudflare serves security headers on public pages and static files', async ({ request }) => {
  test.skip(process.env.TEST_CLOUDFLARE !== '1', 'Set TEST_CLOUDFLARE=1 against Wrangler or the deployed site.');
  const expected = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  };
  for (const path of ['/', '/es/', '/cv/', '/blog/', '/robots.txt', '/sitemap-index.xml', '/google9c4402f6e089b1fd.html']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    for (const [name, value] of Object.entries(expected)) {
      expect(response.headers()[name], `${path}: ${name}`).toBe(value);
    }
  }
});

test('Cloudflare serves Google verification directly and preserves page routing', async ({ request }) => {
  test.skip(process.env.TEST_CLOUDFLARE !== '1', 'Set TEST_CLOUDFLARE=1 against Wrangler or the deployed site.');
  const verification = await request.get('/google9c4402f6e089b1fd.html', { maxRedirects: 0 });
  expect(verification.status()).toBe(200);
  expect(verification.headers()['location']).toBeUndefined();
  expect((await verification.text()).trim()).toBe('google-site-verification: google9c4402f6e089b1fd.html');
  for (const path of ['/blog', '/es/about']) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(response.status());
    expect(new URL(response.headers()['location'], response.url()).pathname).toBe(`${path}/`);
  }
  expect((await request.get('/nonexistent-security-check/')).status()).toBe(404);
});

test('Google verification supports HEAD and Googlebot requests at the exact URL', async ({ request }) => {
  test.skip(process.env.TEST_CLOUDFLARE !== '1', 'Set TEST_CLOUDFLARE=1 against Wrangler or the deployed site.');
  const path = '/google9c4402f6e089b1fd.html';
  const head = await request.head(path, { maxRedirects: 0 });
  expect(head.status()).toBe(200);
  expect(head.headers()['location']).toBeUndefined();
  expect(head.headers()['x-content-type-options']).toBe('nosniff');
  const bot = await request.get(path, { maxRedirects: 0, headers: { 'User-Agent': 'Googlebot' } });
  expect(bot.status()).toBe(200);
  expect(bot.headers()['location']).toBeUndefined();
  expect((await bot.text()).trim()).toBe('google-site-verification: google9c4402f6e089b1fd.html');
});

test('security headers preserve page scripts, language switching, and styled assets', async ({ page, request }) => {
  test.skip(process.env.TEST_CLOUDFLARE !== '1', 'Set TEST_CLOUDFLARE=1 against Wrangler or the deployed site.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('link', { name: 'Español', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  const selected = page.getByRole('link', { name: 'Español', exact: true });
  await expect(selected).toHaveAttribute('aria-current', 'true');
  await expect(selected).toHaveCSS('text-decoration-line', 'underline');
  const stylesheet = await page.locator('link[rel="stylesheet"]').first().getAttribute('href');
  expect(stylesheet).toBeTruthy();
  const css = await request.get(new URL(stylesheet!, page.url()).href);
  expect(css.status()).toBe(200);
  expect(css.headers()['content-type']).toContain('text/css');
  expect(css.headers()['x-content-type-options']).toBe('nosniff');
  expect(errors).toEqual([]);
});

test('security rules preserve sitemap XML and missing-page recovery', async ({ request }) => {
  test.skip(process.env.TEST_CLOUDFLARE !== '1', 'Set TEST_CLOUDFLARE=1 against Wrangler or the deployed site.');
  const sitemap = await request.get('/sitemap-0.xml', { maxRedirects: 0 });
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()['content-type']).toContain('xml');
  expect(await sitemap.text()).toContain('<urlset');
  const missing = await request.get('/nonexistent-security-check/', { maxRedirects: 0 });
  expect(missing.status()).toBe(404);
  expect(missing.headers()['x-frame-options']).toBe('DENY');
  expect(missing.headers()['x-content-type-options']).toBe('nosniff');
  expect(await missing.text()).toContain('That page took a wrong turn.');
});
