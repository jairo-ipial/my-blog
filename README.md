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

## Deployment strategy

Follow the [Oracle VM and Podman deployment guide](deploy/oracle/README.md) for account setup, networking, HTTPS, publishing, and rollback. Deployment configuration lives in `deploy/`.

The planned deployment uses an **Oracle Cloud Always Free eligible VM** with a **Podman-managed static web server**.

Astro builds run locally in WSL. Publishing uploads the generated site as a batch, without rebuilding or uploading the web-server container image for content changes. Releases will be activated after validation, with the previous version retained for rollback.

A free DuckDNS subdomain is planned for the public address, with Caddy providing automatic HTTPS.

The goal is to keep recurring hosting costs at **$0**, within provider limits. Because free compute availability is not guaranteed, source content and recovery assets will remain backed up independently of Oracle.

## Contact

[Jairo Ipial](mailto:jairo.ipial@gmail.com)
