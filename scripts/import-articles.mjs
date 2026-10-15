/**
 * Import downloaded Markdown articles and their matching hero images into this blog.
 * Both the WSL (.sh) and Windows PowerShell (.ps1) launchers call this module.
 *
 * Usage (from the project root):
 *   npm run import:articles -- "path/to/articles" --dry-run
 *   npm run import:articles -- "path/to/articles"
 *
 * A source folder should contain pairs such as my-article.md + my-article.webp.
 * Markdown goes into src/content/blog/; images go into src/assets/. The imported
 * frontmatter receives heroImage: ../../assets/my-article.webp. Source files are
 * preserved, and importing does not commit or publish anything.
 *
 * Only immediate .md files are imported (no recursion or MDX). Images referenced
 * in the Markdown body are not copied. Astro remains responsible for full content
 * schema validation and image processing when you check/build the site.
 */
import { constants } from 'node:fs';
import { access, copyFile, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';

// Resolve project destinations relative to this module, regardless of the shell's cwd.
const destination = fileURLToPath(new URL('../src/content/blog/', import.meta.url));
const extensions = new Set(['.webp', '.png', '.jpg', '.jpeg', '.avif']);

/** Remove only an opening ATX H1 that repeats the layout's frontmatter title. */
export function removeRepeatedTitle(body, title) {
  // Ignore capitalization, repeated whitespace, and a final period when comparing.
  const normalize = (value) => value.normalize('NFC').trim().replace(/\s+/g, ' ').replace(/\.$/, '').toLowerCase();
  // Blank lines may precede the heading. Do not match H2s, fenced code, or later H1s.
  const heading = body.match(/^(?:[\t ]*\r?\n)* {0,3}#[\t ]+([^\r\n]*)(?:\r?\n|$)/);
  if (!heading) return body;
  const text = heading[1].replace(/[\t ]+#+[\t ]*$/, '');
  if (normalize(text) !== normalize(title)) return body;
  return body.slice(heading[0].length).replace(/^(?:[\t ]*\r?\n)+/, '');
}

/**
 * Validate every pair before writing, then copy the batch without overwriting files.
 * Dry runs perform the same validation without creating folders or copying files.
 *
 * @param {string} source Folder containing Markdown/image pairs.
 * @param {object} [options]
 * @param {boolean} [options.dryRun=false] Preview a validated import without writes.
 * @param {string} [options.target] Article destination; defaults to src/content/blog/.
 * @param {string} [options.assetsTarget] Image destination; defaults to ../../assets
 *   relative to target. Destination overrides are useful for isolated verification.
 * @returns {Promise<Array<{article: string, image: string}>>} Imported/planned filenames.
 * @throws {Error} If a pair, frontmatter, or destination is invalid, or file I/O fails.
 */
export async function importArticles(source, { dryRun = false, target = destination, assetsTarget = path.resolve(target, '../../assets') } = {}) {
  // Ignore subdirectories and process Markdown in a predictable filename order.
  const entries = await readdir(source, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const articles = files.filter((name) => /\.md$/i.test(name)).sort();
  if (!articles.length) throw new Error('No Markdown (.md) files found in the source folder.');
  const plan = [];
  const names = new Set();
  for (const article of articles) {
    const stem = path.parse(article).name;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stem)) {
      throw new Error(`${article}: use lowercase, hyphen-separated filenames.`);
    }
    // Match the exact basename; reject missing images and ambiguous pairs (e.g. both
    // my-article.webp and my-article.png). Image extensions are case-insensitive.
    const matches = files.filter((name) => path.parse(name).name === stem && extensions.has(path.extname(name).toLowerCase()));
    if (matches.length !== 1) throw new Error(`${article}: expected exactly one matching hero image, found ${matches.length}.`);
    const image = matches[0];
    const text = await readFile(path.join(source, article), 'utf8');
    // Accept a UTF-8 BOM and Windows/Unix line endings. Parse only frontmatter;
    // process the body separately from YAML.
    const match = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!match) throw new Error(`${article}: YAML frontmatter is required.`);
    const doc = parseDocument(match[1]);
    if (doc.errors.length) throw new Error(`${article}: ${doc.errors[0].message}`);
    // Check required metadata before copying. YAML's document API lets us replace
    // heroImage while retaining other fields and YAML comments where possible.
    const data = doc.toJS();
    for (const key of ['title', 'description', 'pubDate']) {
      if (!data || data[key] == null || String(data[key]).trim() === '') throw new Error(`${article}: missing ${key}.`);
    }
    if (typeof data.title !== 'string' || typeof data.description !== 'string' || Number.isNaN(new Date(data.pubDate).getTime())) {
      throw new Error(`${article}: title/description must be strings and pubDate must be a valid date.`);
    }
    if (data.tags !== undefined && (!Array.isArray(data.tags) || data.tags.some((tag) => typeof tag !== 'string' || !tag.trim()))) {
      throw new Error(`${article}: tags must be an array of nonempty strings.`);
    }
    // Use forward slashes even on Windows so Astro receives a portable image path.
    // Replace any previous heroImage value, including an empty string.
    const heroImage = path.relative(target, path.join(assetsTarget, image)).split(path.sep).join('/');
    doc.set('heroImage', heroImage);
    // Reject duplicate output names within the batch and existing files in either
    // destination. Other filesystem errors must propagate rather than look absent.
    for (const [name, folder] of [[article, target], [image, assetsTarget]]) {
      if (names.has(name.toLowerCase())) throw new Error(`Duplicate destination: ${name}`);
      names.add(name.toLowerCase());
      try {
        await access(path.join(folder, name));
      } catch (error) {
        if (error.code === 'ENOENT') continue;
        throw error;
      }
      throw new Error(`Destination already exists: ${name}. No files imported.`);
    }
    // The layout already renders the title. Remove an opening duplicate H1 while
    // preserving the remaining body; YAML serialization may normalize formatting.
    const body = removeRepeatedTitle(text.slice(match[0].length), data.title);
    plan.push({ article, image, content: `---\n${doc.toString()}---\n${body}` });
  }
  // Validate the whole batch before copying anything. Exclusive writes prevent overwrites.
  const created = [];
  if (!dryRun) {
    await mkdir(target, { recursive: true });
    await mkdir(assetsTarget, { recursive: true });
    try {
      for (const item of plan) {
        const imagePath = path.join(assetsTarget, item.image);
        await copyFile(path.join(source, item.image), imagePath, constants.COPYFILE_EXCL);
        created.push(imagePath);
        const articlePath = path.join(target, item.article);
        await writeFile(articlePath, item.content, { flag: 'wx' });
        created.push(articlePath);
      }
    } catch (error) {
      // On a copy/write failure, remove files successfully created by this invocation.
      // This is best-effort rollback, not a transaction resilient to process crashes.
      await Promise.all(created.map((file) => unlink(file)));
      throw error;
    }
  }
  return plan.map(({ article, image }) => ({ article, image }));
}

// Run the CLI only when executed directly. Importing this module exposes the
// function without starting an import or reading command-line arguments.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: npm run import:articles -- <source-folder> [--dry-run]\nImports matching .md and hero image pairs; never overwrites existing files.');
  } else {
    // Require one source folder and permit only the optional --dry-run flag.
    const folders = args.filter((arg) => !arg.startsWith('--'));
    try {
      if (folders.length !== 1 || args.some((arg) => arg.startsWith('--') && arg !== '--dry-run')) {
        throw new Error('Usage: npm run import:articles -- <source-folder> [--dry-run]');
      }
      const dryRun = args.includes('--dry-run');
      const result = await importArticles(path.resolve(folders[0]), { dryRun });
      for (const { article, image } of result) console.log(`${dryRun ? 'Would import' : 'Imported'} ${article} + ${image}`);
      console.log('Source files are preserved. Run npm run check and npm run build to validate the site.');
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
