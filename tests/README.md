# Mobile browser tests

These tests reproduce the mobile checks for Jairo Ipial’s blog using Playwright and Chromium. They run each scenario at **320×844** and **390×844**, with touch and mobile emulation enabled: **12 test cases** in total.

## Files

- `mobile.spec.ts`: assertions and an explicit summary above each scenario.
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

## 6. Optional production check

Build the site and start a preview on an unused port:

```bash
npm run build
npm run preview -- --port 4323
```

Keep preview running, then run tests from another terminal:

```bash
TEST_BASE_URL=http://localhost:4323 npm run test:mobile
```

In PowerShell, set `TEST_BASE_URL` as shown in step 4. Stop the foreground preview with Ctrl+C when finished.

## Troubleshooting and scope

### All tests fail with “Executable doesn't exist”

If all 12 tests fail immediately with `browserType.launch: Executable doesn't exist`, Chromium is missing from the browser cache. The website checks have not run yet; this is a browser setup failure rather than a failed layout assertion.

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
