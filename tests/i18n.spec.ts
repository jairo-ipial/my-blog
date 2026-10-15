import { test, expect } from '@playwright/test';

for (const [path, heading] of [['/', 'Notas de ingeniería desde la práctica'], ['/about/', 'Sobre mí'], ['/cv/', 'Jairo Ipial']]) {
  test(`Spanish translation, navigation, and SEO: ${path}`, async ({ page }) => {
    expect((await page.goto(`/es${path}`))?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/es${path}$`));
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', new RegExp(`(?<!/es)${path}$`));
    await expect(page.locator('link[hreflang="es"]')).toHaveAttribute('href', new RegExp(`/es${path}$`));
    await expect(page.locator('header').getByRole('link', { name: 'Sobre mí', exact: true })).toHaveAttribute('href', '/es/about/');
    await expect(page.locator('header').getByRole('link', { name: 'Blog', exact: true })).toHaveAttribute('href', '/blog/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await page.getByRole('link', { name: 'English', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.getByRole('link', { name: 'Español', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/es${path}$`));
    if (path === '/cv/') {
      await expect(page.getByRole('heading', { name: 'Experiencia profesional' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Imprimir / guardar como PDF' })).toBeVisible();
      await expect(page.locator('.job').first()).toContainText('Lidero el equipo de soporte');
    }
  });
}

test('Blog stays in English without Spanish alternates', async ({ page, request }) => {
  for (const path of ['/blog/', '/blog/configure-runpod-instance/', '/blog/tags/ai/']) {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('link[hreflang="es"]')).toHaveCount(0);
  }
  expect((await request.get('/es/blog/')).status()).toBe(404);
  const sitemap = await request.get('/sitemap-0.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const path of ['/es/', '/es/about/', '/es/cv/']) expect(xml).toContain(path);
  expect(xml).not.toContain('/es/blog/');
});

test('language preference survives visiting blog pages and can change there', async ({ page }) => {
  await page.goto('/es/');
  await page.locator('header').getByRole('link', { name: 'Blog', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const spanish = page.locator('header').getByRole('link', { name: 'Español', exact: true });
  await expect(spanish).toBeVisible();
  await expect(spanish).toHaveAttribute('aria-current', 'true');
  await expect(spanish).toHaveCSS('font-weight', '700');
  await expect(spanish).toHaveCSS('text-decoration-line', 'underline');
  await expect(page.locator('header').getByRole('link', { name: 'Sobre mí', exact: true })).toHaveAttribute('href', '/es/about/');
  await page.locator('main a[href="/blog/configure-runpod-instance/"]').click();
  await expect(spanish).toHaveAttribute('aria-current', 'true');
  await page.locator('header').getByRole('link', { name: 'CV', exact: true }).click();
  await expect(page).toHaveURL(/\/es\/cv\/$/);
  await page.locator('header').getByRole('link', { name: 'Blog', exact: true }).click();
  await page.locator('header').getByRole('link', { name: 'English', exact: true }).click();
  await expect(page).toHaveURL(/\/blog\/$/);
  await page.reload();
  await expect(page.locator('header').getByRole('link', { name: 'English', exact: true })).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('header').getByRole('link', { name: 'English', exact: true })).toHaveCSS('text-decoration-line', 'underline');
  await expect(spanish).not.toHaveAttribute('aria-current', 'true');
  await page.locator('header').getByRole('link', { name: 'About', exact: true }).click();
  await expect(page).toHaveURL(/(?<!\/es)\/about\/$/);
});

for (const path of ['/', '/about/', '/cv/']) {
  test(`translated metadata is reciprocal and uses production URLs: ${path}`, async ({ page }) => {
    await page.goto(path);
    const englishTitle = await page.title();
    const englishDescription = await page.locator('meta[name="description"]').getAttribute('content');
    const englishURL = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(englishURL).toBeTruthy();
    const origin = new URL(englishURL!).origin;
    for (const language of ['en', 'es']) {
      const localized = language === 'es' ? `/es${path}` : path;
      await page.goto(localized);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', origin + localized);
      for (const [locale, target] of [['en', path], ['es', `/es${path}`], ['x-default', path]]) {
        await expect(page.locator(`link[hreflang="${locale}"]`)).toHaveAttribute('href', origin + target);
      }
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', origin + localized);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', await page.title());
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', language === 'es' ? 'es_CO' : 'en_US');
      if (language === 'es') {
        expect(await page.title()).not.toBe(englishTitle);
        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description?.trim().length).toBeGreaterThan(20);
        expect(description).not.toBe(englishDescription);
      }
    }
  });
}

test('Spanish navigation stays localized and an explicit English URL overrides the preference', async ({ page }) => {
  await page.goto('/es/');
  const header = page.locator('header');
  for (const [name, path] of [['Sobre mí', '/es/about/'], ['CV', '/es/cv/'], ['Inicio', '/es/']]) {
    await header.getByRole('link', { name, exact: true }).click();
    expect(new URL(page.url()).pathname).toBe(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('footer')).toContainText('Todos los derechos reservados.');
    await expect(header.locator('.internal-links a.active')).toHaveCount(1);
  }
  await page.goto('/about/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await header.getByRole('link', { name: 'Blog', exact: true }).click();
  await expect(header.getByRole('link', { name: 'About', exact: true })).toHaveAttribute('href', '/about/');
});

test('translations and switching work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  try {
    await page.goto('/es/about/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sobre mí');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await page.getByRole('link', { name: 'English', exact: true }).click();
    expect(new URL(page.url()).pathname).toBe('/about/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('About Me');
  } finally {
    await context.close();
  }
});

test('navigation remains usable when browser storage is blocked', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.goto('/es/');
  await page.locator('header').getByRole('link', { name: 'Sobre mí', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.getByRole('link', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.locator('header').getByRole('link', { name: 'Blog', exact: true }).click();
  await page.getByRole('link', { name: 'Español', exact: true }).click();
  await expect(page.locator('header').getByRole('link', { name: 'CV', exact: true })).toHaveAttribute('href', '/es/cv/');
  expect(errors).toEqual([]);
});

test('missing Spanish URLs return a bilingual 404 with a working Spanish recovery link', async ({ page }) => {
  expect((await page.goto('/es/does-not-exist/'))?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.getByRole('heading', { name: 'No encontramos esta página.' })).toBeVisible();
  await page.getByRole('link', { name: 'Volver al inicio en español' }).click();
  expect(new URL(page.url()).pathname).toBe('/es/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});
