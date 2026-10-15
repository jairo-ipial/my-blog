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
npm run dev
```

Open the local address printed by Astro.

To build and preview the production site:

```bash
npm run build
npm run preview
```

## Content

Blog posts live in `src/content/blog/`. Longer articles use Markdown headings and a linked table of contents to make sections easier to navigate.

The CV page lives at `/cv`.

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
