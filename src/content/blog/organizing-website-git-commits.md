---
tags: [ "Git", "Conventional Commits", "Web Development" ]
title: "Organizing Website Changes Into Focused Git Commits"
description: "Grouping website work into focused commits using Conventional
  Commits and selective staging."
pubDate: 2026-10-15
heroImage: '../../assets/organizing-website-git-commits.webp'
---

The website work touched several areas at once: SEO, multilingual pages, deployment, testing, and documentation.

Committing everything together would have made later review and troubleshooting harder. I grouped the changes by topic and used Conventional Commits:

```text
type(scope): description
```

Examples included:

```text
fix(i18n): preserve selected language highlighting
test(i18n): support dev-server sitemap and storage checks
docs(test): clarify production preview and deployed-site testing
```

## Keeping fixes with their regression checks

The language-highlight fix and its visual assertions belonged together. Deployment cleanup and Cloudflare documentation formed another topic.

Some files contained changes from multiple tasks. Selective staging allowed the relevant hunks to enter separate commits without splitting or discarding the working files.

## Checking the result

Before committing, I checked staged differences. Afterward, I reviewed the commit history and confirmed the working tree was clean.

Creating commits and pushing them are separate operations. When the environment lacked GitHub credentials, the local commits remained intact and could be pushed from an authenticated terminal.

Focused commits made the repository’s history more useful: each entry explains a concrete change and provides a smaller unit to review or revert.
