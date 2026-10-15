# Jairo Ipial — Personal Website & Engineering Blog

My personal website brings together my engineering experience, professional CV, and practical notes on building and operating software.

I’m a software engineer and technical leader based in Bogotá, Colombia, with experience in global payments, cloud infrastructure, DevOps, and production reliability.

## What you’ll find here

- **Home:** an introduction to my work, featured projects, and recent articles.
- **Blog:** hands-on experiments, technical decisions, results, and lessons learned.
- **About:** my background, interests, and professional perspective.
- **CV:** a dedicated overview of my experience, technical skills, and education.

Topics include software engineering, distributed systems, cloud platforms, production support, and applied AI. One project explores open-source AI video generation for small-business advertising, including GPU infrastructure, performance benchmarks, and the gap between generating footage and producing an effective advertisement.

## Technology

The website uses **Astro**, with posts authored in Markdown or MDX. Development takes place in **Ubuntu 26.04 on WSL 2**, using **Node.js 24** and **VS Code with the WSL extension**.

## Local development

```bash
npm install
npm run dev -- --background
```

Open the local address printed by Astro.

Manage the background server with `npm run dev -- status`, `npm run dev -- logs`, and `npm run dev -- stop`.

To build and preview the production site:

```bash
npm run build
npm run preview
```

## Content

Blog posts live in `src/content/blog/`. Longer articles use Markdown headings and a linked table of contents to make sections easier to navigate.

The CV page lives at `/cv`.

### Import articles and hero images

Astro's [content collections](https://docs.astro.build/en/guides/content-collections/) already discover posts in `src/content/blog/`. To add an article manually, place `article-name.md` in `src/content/blog/`, place `article-name.webp` in `src/assets/`, and set `heroImage: '../../assets/article-name.webp'` in the Markdown frontmatter. No import command is needed for files already in those folders.

To import a folder of downloaded articles, keep each Markdown file beside an image with the same basename, such as `organizing-website-git-commits.md` and `organizing-website-git-commits.webp`. Filenames must be lowercase and hyphen-separated. Supported image formats: WebP, PNG, JPG/JPEG, and AVIF. Each article needs YAML frontmatter:

```yaml
---
title: "Organizing website Git commits"
description: "A practical guide to organizing commits."
pubDate: 2026-10-15
tags: [Git]
heroImage: ''
---
```

The importer copies Markdown files into `src/content/blog/` and hero images into `src/assets/`. It adds or replaces `heroImage` with `../../assets/<image_name>`, preserving other frontmatter and the Markdown body. Source files remain untouched. It imports only the source folder's immediate `.md` files, requires exactly one matching image for each article, and rejects the entire batch before copying if an article or image destination exists or a pair is invalid. Other local assets referenced in the article body are not copied; place those separately and update their paths.

The `heroImage` field can be omitted or empty in the source article; the importer sets it automatically. For the example pair above, the imported value is:

```yaml
heroImage: ../../assets/organizing-website-git-commits.webp
```

Other frontmatter values are retained, although YAML formatting may change. The importer does not handle `.mdx` files or nested folders. Since the blog layout displays the frontmatter title, the importer removes an opening `#` heading if it repeats that title, ignoring capitalization, extra whitespace, and a final period. Different headings and the remaining article content are preserved. Existing articles are not modified; for manually added articles, omit the repeated heading yourself.

Install dependencies with `npm install` first and run these commands from the project root. Preview and then import on **WSL** (use `/mnt/c/...` for Windows folders):

```bash
bash scripts/import-articles.sh "/mnt/c/Users/YourName/Downloads/articles" --dry-run
bash scripts/import-articles.sh "/mnt/c/Users/YourName/Downloads/articles"
```

On **Windows PowerShell**, with Node.js installed on Windows and a Windows checkout of this repository:

```powershell
.\scripts\import-articles.ps1 "C:\Users\YourName\Downloads\articles" --dry-run
.\scripts\import-articles.ps1 "C:\Users\YourName\Downloads\articles"
```

`--dry-run` validates filenames, required frontmatter, matching images, and destination conflicts without creating folders or copying files. A successful preview prints each pair:

```text
Would import organizing-website-git-commits.md + organizing-website-git-commits.webp
```

Remove `--dry-run` to import. Both modes reject existing article or image destinations; there is no overwrite option. A dry run does not perform Astro's full schema validation or decode images. After importing, run `npm run check` and `npm run build` to validate the site.

Both launchers use the shared implementation in [scripts/import-articles.mjs](scripts/import-articles.mjs), which also documents the import flow and safeguards. You can run it through npm in either shell, including if PowerShell's execution policy blocks `.ps1` files:

```bash
npm run import:articles -- "path/to/articles" --dry-run
npm run import:articles -- "path/to/articles"
npm run check
npm run build
```

Importing does not publish the site. Review and commit the imported files, then use the normal deployment workflow.

Run the importer's automated tests with `npm run test:import`. They use Node.js's built-in test runner and temporary folders, with no browser or dev server required. They cover batch imports, image paths, source preservation, repeated-title removal, validation failures, dry runs, overwrite protection, and CLI argument handling.

## Deployment

The site is hosted on **Cloudflare Workers Static Assets** at https://blog.jairo-ipial.workers.dev/.

Follow the [Cloudflare deployment guide](deploy/cloudflare/README.md) for authentication, validation, publishing, and Google Search Console setup.

```bash
npx wrangler login
npm run check
npm run check:types
npm run deploy:check
npm run deploy
```

`npm run deploy` builds the Astro site into `dist/` and publishes it using Wrangler. Configuration lives in `wrangler.jsonc`. The production URL in `astro.config.mjs` supplies canonical links, social previews, RSS, and sitemap URLs.

English pages use the existing routes; Spanish Home, About, and CV pages live under `/es/`. Blog content remains in English.

## Contact

[Jairo Ipial](mailto:jairo.ipial@gmail.com)
