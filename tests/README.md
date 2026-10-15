# Mobile browser tests

These tests reproduce the mobile checks for Jairo Ipial’s blog using Playwright and Chromium. They run each scenario at **320×844** and **390×844**, with touch and mobile emulation enabled.

## Files

- `mobile.spec.ts`: original mobile layout and interaction checks, with an explicit summary above each scenario.
- `site-features.spec.ts`: RSS, custom 404, sharing metadata, archived content, and mobile table spacing checks, each with an explicit summary.
- `playwright.config.ts`: viewport sizes, server address, screenshots, traces, and report settings.
- `artifacts/`: screenshots and failure traces generated during tests (ignored by Git).
- `report/`: HTML results with attached screenshots (ignored by Git).

## What each test checks

| Scenario | Checks | Screenshots |
| --- | --- | --- |
| Homepage layout | HTTP 200, visible main heading, all four navigation links fit, links are at least 44px high, no document overflow or uncaught JavaScript errors | Full homepage |
| CV layout | Same loading, navigation, overflow, and error checks | Full CV |
| RunPod article layout | Same loading, navigation, overflow, and error checks | Full article |
| CV sections and back-to-top links | Skills, education, and languages headings exist; all four back-to-top links navigate to `#top` and position the main element at the viewport top | Three lower-section views |
| Article tags | AI, RunPod, Python, and DevOps tags are visible and at least 44px high; AI opens its archive and the archive links back to the article | Failure screenshot if needed |
| Tables and code | Every block fits within the viewport; overflowing blocks permit horizontal scrolling and their scroll position changes | Each table and one wide code block |

The tests allow one pixel of rounding tolerance for viewport bounds. Back-to-top checks allow two pixels. Their target is the start of `<main>`, below the header, rather than the document’s absolute top.

The additional scenarios in `site-features.spec.ts` run at both viewport widths:

| Scenario | Checks |
| --- | --- |
| RSS | Footer link on five pages, 44px touch target, valid XML, configured feed identity, current article metadata, no archived posts |
| Custom 404 | HTTP 404, recovery message, noindex, no page overflow, working Home/Blog buttons, screenshot |
| Sharing metadata | Article title and description match frontmatter; Open Graph uses article artwork; homepage uses branded fallback; both image URLs respond successfully |
| Archived content | Real article remains in listings; archived post links are absent; removed posts and unused tags return HTTP 404 |
| About presentation | Personal heading, loaded image, CV link, no publication date or article tags, mobile overflow check and screenshot |
| Publication dates | Visible labels match the UTC calendar day in datetime attributes across homepage, blog, tag archive, and article |
| Table readability | Minimum column width and cell padding; wide tables scroll locally without document overflow |

These checks work against the existing development server. For the 404 assertions to pass against a production server, configure it to serve the generated `404.html` with HTTP status 404 for unknown URLs. Social metadata checks do not verify third-party preview caches or public-domain reachability. Frontmatter extraction expects the fixture article’s title and description to use double-quoted single-line values.

## 1. Install project dependencies

From the project root, not the `tests` directory:

```bash
npm install
```

`@playwright/test` is a development dependency. On a fresh checkout with a committed lockfile, you can use `npm ci` instead. Node.js must meet the project’s requirement in `package.json`.

## 2. Install Chromium

```bash
npx playwright install chromium
```

On Linux or WSL, if Chromium reports missing shared libraries:

```bash
npx playwright install --with-deps chromium
```

The Linux dependency installation may request your sudo password. Run the browser installation in the same environment where tests will run: installing a Windows browser does not provide a Linux browser to WSL. Browser files are normally stored in Playwright’s user cache, outside this repository.

## 3. Start the blog

Use the project’s background server commands:

```bash
npm run dev -- --background --port 4321
npm run dev -- status
```

Open `http://localhost:4321/` and confirm this is the current project. If Astro reports a different port, use that address in step 4. Tests use an existing server and never start or stop it automatically.

Useful server commands:

```bash
npm run dev -- logs
npm run dev -- stop
```

Do not start another server if the current project is already running at the intended address.

## 4. Run all mobile tests

```bash
npm run test:mobile
```

To use another address, in Bash/WSL:

```bash
TEST_BASE_URL=http://localhost:4322 npm run test:mobile
```

Or in PowerShell:

```powershell
$env:TEST_BASE_URL = 'http://localhost:4322'
npm run test:mobile
Remove-Item Env:TEST_BASE_URL
```

Use an origin such as `http://localhost:4321`, without a page path. The tests visit `/`, `/cv/`, `/blog/configure-runpod-instance/`, and `/blog/tags/ai/`.

Run only one width:

```bash
npm run test:mobile -- --project=mobile-320
npm run test:mobile -- --project=mobile-390
```

Run one scenario, or watch Chromium execute it:

```bash
npm run test:mobile -- --grep "back-to-top"
npm run test:mobile -- --headed
```

Headed mode requires a desktop/display; WSL may require WSLg. Headless mode is the default.

## 5. Review results visually

```bash
npm run test:mobile:report
```

Open the address printed by Playwright. Expand a test and inspect its attached screenshots at both widths. The RunPod full-page screenshot is long; scroll through it or use individual table/code captures.

Check these details manually:

1. Header labels remain readable and the active link is clear.
2. Headings wrap naturally; images, controls, and tags fit.
3. CV experience and skills read comfortably in one column.
4. Table headings and columns have enough spacing. A passing overflow test does **not** guarantee comfortable table readability; cramped columns were noted in the original visual review.
5. Code can scroll within its block without scrolling the whole page sideways.
6. Footer links remain readable and accessible.

Astro’s development toolbar may appear in screenshots. It is development UI and is absent from production builds.

## 6. Test the local production build

Run these commands from the project root, after installing dependencies and Chromium as described above:

```bash
npm run build
npm run preview -- --port 4322
```

Confirm the preview address printed by Astro. Run the full suite against that address:

```bash
TEST_BASE_URL=http://localhost:4322 npm run test:mobile
```

If preview occupies the terminal, run the test command in another terminal. In PowerShell, set `TEST_BASE_URL` as shown in step 4.

The production preview runs the sitemap checks that are explicitly skipped on the development server. A missing sitemap in production fails the test. This checks the latest local build; it does not publish anything.

Stop the preview afterward:

```bash
npx astro preview stop
```

## 7. Test the deployed Cloudflare site

After deploying, run the same full suite against the public address:

```bash
TEST_BASE_URL=https://blog.jairo-ipial.workers.dev npm run test:mobile
```

This also checks Cloudflare’s routing and responses. Use a checkout matching the deployed version: tests compare some metadata against local source files, so unpublished content changes can cause mismatches.

Review results with `npm run test:mobile:report`. No local server is needed when testing the deployed site.

## Troubleshooting and scope

### All tests fail with “Executable doesn't exist”

If all tests fail immediately with `browserType.launch: Executable doesn't exist`, Chromium is missing from the browser cache. The website checks have not run yet; this is a browser setup failure rather than a failed layout assertion.

Installing `@playwright/test` installs the testing library, but the browser needs a separate installation. Earlier checks performed with a browser under `/tmp` do not populate the default cache at `~/.cache/ms-playwright` on Linux/WSL.

From the project root, run these commands in your **WSL terminal**:

```bash
npx playwright install --with-deps chromium
```

This downloads Chromium and installs the Linux libraries it needs. The dependency installation may ask for your sudo password. If those libraries are already installed, `npx playwright install chromium` is sufficient.

Confirm that the blog server is running at the expected address, then retry:

```bash
npm run dev -- status
npm run test:mobile
```

If the server is stopped, start it with `npm run dev -- --background --port 4321`. If it uses another port, set `TEST_BASE_URL` as described in step 4. Run the browser installation again after a Playwright upgrade if its required executable changes.

### Other issues and limitations

- **Connection refused:** check the server address and status; match `TEST_BASE_URL` to the port Astro printed.
- **Browser executable missing:** run `npx playwright install chromium` again after upgrading Playwright.
- **Missing Linux libraries:** install browser dependencies using step 2.
- **Unexpected page or missing tags:** verify that the server serves this checkout, rather than an older process.
- **Article-related tests fail after content changes:** update `articlePath`, expected tags, and the tested archive in `mobile.spec.ts` to match the intended fixture article.
- **Failed assertions:** inspect the HTML report, failure screenshots, and retained traces before changing expectations.

Passing tests verify the stated layout and interaction rules. They are not pixel-baseline comparisons, a full accessibility audit, performance tests, or checks on physical phones, Safari, or Firefox. Screenshot review is still necessary. Test artifacts may include content from the target site; avoid committing or publicly sharing them without review.

## Browser runtime coverage

The feature coverage is implemented in `site-features.spec.ts`; its test summaries describe RSS, 404, sharing metadata, archived content, and table readability assertions. The separate `coverage.mjs` script measures which browser assets execute during representative interactions.

With project dependencies and Chromium installed, start the blog as described above and run:

```bash
npm run test:coverage
```

The script visits Home, CV, and the RunPod article at both mobile widths. It exercises header navigation, RSS subscription, CV back-to-top links, article tags, and horizontal table/code scrolling. It generates:

- `tests/coverage/report.md`: readable per-resource report.
- `tests/coverage/summary.json`: machine-readable scenario summaries.
- `tests/coverage/<page>-<width>.json`: raw Chromium JavaScript and CSS coverage for inspection.

JavaScript coverage reports executed functions versus collected functions. CSS coverage reports used character ranges (Chromium's byte offsets) as a percentage of each stylesheet. Results are per scenario and resource, not merged source-line coverage. Development tools, desktop styles, and print styles affect the totals. No arbitrary coverage threshold is enforced. This does **not** measure server-side Astro frontmatter or TypeScript source lines and does not replace the assertion-based tests.

For a cleaner report, run against the production preview using `TEST_BASE_URL` as explained above. The same variable works for coverage:

```bash
TEST_BASE_URL=http://localhost:4322 npm run test:coverage
```

Generated coverage files are ignored by Git. Installing the browser under a custom path requires the same `PLAYWRIGHT_BROWSERS_PATH` when running tests and coverage.

## Static code analysis

Dependencies `@astrojs/check` and `typescript` are installed through the project’s `npm install`/`npm ci` setup. Static analysis does not require a running server or Chromium.

Run Astro component/template diagnostics and TypeScript checks:

```bash
npm run check
npm run check:types
```

- `check` runs `astro check`, generates Astro content types, and checks `.astro` files for syntax and type problems.
- `check:types` runs `tsc --noEmit` against `tsconfig.json`, checking TypeScript utilities, test files, and configuration without generating JavaScript.

Both commands must finish with exit code 0. Errors include file paths and line numbers to help locate the problem. Astro hints/warnings are reported separately; review them even when the exit code succeeds. These commands are type analysis, not a formatting linter, vulnerability scanner, or runtime test suite. JavaScript files are not fully type-checked unless `checkJs` is enabled; browser coverage scripts are validated by running them.

To run static analysis followed by all browser tests:

```bash
npm run validate
```

Start the blog before `validate`; it does not manage the server. Coverage is an additional report and runs separately with `npm run test:coverage`. Run `npm run build` separately before publishing to verify production generation.

`i18n.spec.ts` covers English/Spanish switching for Home, About, and CV, localized navigation, language metadata, canonical/alternate links, mobile overflow, Spanish CV content, sitemap inclusion, and the absence of Spanish blog routes. Run against a built preview to include sitemap checks:

```bash
TEST_BASE_URL=http://localhost:4322 npm run test:mobile -- --grep 'Spanish translation|Blog stays|production sitemap'
```

### Internationalization suite

Run all English/Spanish tests against the built preview (the sitemap is generated only during a build):

```bash
npm run build
npm run preview -- --port 4322
TEST_BASE_URL=http://localhost:4322 npm run test:i18n
npx astro preview stop
```

The suite runs at 320px and 390px widths. It covers translated Home/About/CV content, language switching, localized navigation and active links, canonical and reciprocal hreflang URLs, social metadata, sitemap entries, English-only blog routes, saved preferences across blog navigation and reloads, explicit English URL selection, disabled JavaScript, blocked localStorage, and bilingual 404 recovery. It uses an existing server and does not start or stop one itself.

On the Astro development server, the production sitemap test is explicitly skipped because the sitemap integration generates XML only during builds. Run against a built preview to execute that check; a missing sitemap on a production preview still fails. The blocked-storage test denies reads and writes of `preferred-language`, leaving development-tool storage unaffected.
