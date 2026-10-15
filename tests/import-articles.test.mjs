import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { importArticles, removeRepeatedTitle } from '../scripts/import-articles.mjs';

// Every filesystem test owns a temporary project; real articles/assets are untouched.
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'article-import-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'incoming articles');
  const target = path.join(root, 'src/content/blog');
  const assets = path.join(root, 'src/assets');
  await mkdir(source);
  return { root, source, target, assets };
}

const metadata = { title: 'My Article', description: 'A useful article', pubDate: '2026-10-15', tags: ['Astro', 'SEO'] };
function markdown(data = metadata, body = 'Introduction.\n\n## Details\nMore text.\n') {
  // JSON objects are valid YAML and let test cases vary individual metadata fields.
  return `---\n${JSON.stringify(data)}\n---\n${body}`;
}
async function pair(source, name = 'my-article', text = markdown(), extension = '.webp') {
  await writeFile(path.join(source, `${name}.md`), text);
  await writeFile(path.join(source, `${name}${extension}`), Buffer.from([0, 1, 2, 255]));
}
async function absent(folder) {
  await assert.rejects(readdir(folder), { code: 'ENOENT' });
}

test('imports a sorted batch into blog/assets, rewrites image paths, and preserves sources', async (t) => {
  const { source, target, assets } = await fixture(t);
  const body = 'Introduction.\r\n\r\n## Details\r\nBody unchanged.\r\n';
  await pair(source, 'z-post', markdown({ ...metadata, heroImage: 'old.webp' }, body));
  await pair(source, 'a-post', markdown({ ...metadata, heroImage: '' }));
  const originals = await Promise.all(['z-post.md', 'a-post.md'].map((name) => readFile(path.join(source, name), 'utf8')));
  assert.deepEqual(await importArticles(source, { target }), [
    { article: 'a-post.md', image: 'a-post.webp' },
    { article: 'z-post.md', image: 'z-post.webp' },
  ]);
  assert.deepEqual((await readdir(target)).sort(), ['a-post.md', 'z-post.md']);
  assert.deepEqual((await readdir(assets)).sort(), ['a-post.webp', 'z-post.webp']);
  for (const name of ['a-post', 'z-post']) {
    const output = await readFile(path.join(target, `${name}.md`), 'utf8');
    const data = parse(output.match(/^---\n([\s\S]*?)\n---\n/)[1]);
    assert.deepEqual(data, { ...metadata, heroImage: `../../assets/${name}.webp` });
    assert.deepEqual(await readFile(path.resolve(target, data.heroImage)), await readFile(path.join(source, `${name}.webp`)));
    if (name === 'z-post') assert.ok(output.endsWith(body));
  }
  assert.deepEqual(await Promise.all(['z-post.md', 'a-post.md'].map((name) => readFile(path.join(source, name), 'utf8'))), originals);
});

test('dry run returns a plan without creating either destination', async (t) => {
  const { source, target, assets } = await fixture(t);
  await pair(source);
  assert.deepEqual(await importArticles(source, { target, dryRun: true }), [{ article: 'my-article.md', image: 'my-article.webp' }]);
  await absent(target);
  await absent(assets);
});

for (const extension of ['.webp', '.png', '.jpg', '.jpeg', '.avif', '.WEBP']) {
  test(`accepts image extension ${extension}`, async (t) => {
    const { source, target, assets } = await fixture(t);
    await pair(source, 'my-article', markdown(), extension);
    await importArticles(source, { target });
    assert.deepEqual(await readdir(assets), [`my-article${extension}`]);
  });
}

const invalidCases = [
  ['missing frontmatter', 'No metadata', /frontmatter is required/],
  ['invalid YAML', '---\ntitle: [unterminated\n---\nBody', /my-article.md/],
  ['missing title', markdown({ description: 'Description', pubDate: '2026-10-15' }), /missing title/],
  ['missing description', markdown({ title: 'Title', pubDate: '2026-10-15' }), /missing description/],
  ['missing date', markdown({ title: 'Title', description: 'Description' }), /missing pubDate/],
  ['empty title', markdown({ ...metadata, title: ' ' }), /missing title/],
  ['non-string title', markdown({ ...metadata, title: 123 }), /must be strings/],
  ['non-string description', markdown({ ...metadata, description: 123 }), /must be strings/],
  ['invalid date', markdown({ ...metadata, pubDate: 'not a date' }), /valid date/],
  ['non-array tags', markdown({ ...metadata, tags: 'Astro' }), /tags must be an array/],
  ['empty tag', markdown({ ...metadata, tags: [' '] }), /tags must be an array/],
  ['non-string tag', markdown({ ...metadata, tags: [1] }), /tags must be an array/],
];
for (const [label, input, error] of invalidCases) {
  test(`rejects ${label} before writing any batch files`, async (t) => {
    const { source, target, assets } = await fixture(t);
    await pair(source, 'a-valid');
    await pair(source, 'my-article', input);
    await assert.rejects(importArticles(source, { target }), error);
    await absent(target);
    await absent(assets);
  });
}

for (const kind of ['missing image', 'multiple images', 'invalid filename', 'no Markdown']) {
  test(`rejects ${kind}, including in a dry run`, async (t) => {
    const { source, target, assets } = await fixture(t);
    if (kind === 'missing image') await writeFile(path.join(source, 'my-article.md'), markdown());
    if (kind === 'multiple images') {
      await pair(source);
      await writeFile(path.join(source, 'my-article.png'), 'another image');
    }
    if (kind === 'invalid filename') await pair(source, 'My Article');
    const error = kind === 'no Markdown' ? /No Markdown/ : kind === 'invalid filename' ? /lowercase/ : /exactly one/;
    for (const dryRun of [false, true]) await assert.rejects(importArticles(source, { target, dryRun }), error);
    await absent(target);
    await absent(assets);
  });
}

for (const kind of ['article', 'image']) {
  test(`refuses to overwrite an existing ${kind}`, async (t) => {
    const { source, target, assets } = await fixture(t);
    await pair(source, 'a-valid');
    await pair(source);
    const folder = kind === 'article' ? target : assets;
    const file = path.join(folder, `my-article.${kind === 'article' ? 'md' : 'webp'}`);
    await mkdir(folder, { recursive: true });
    await writeFile(file, 'original content');
    for (const dryRun of [false, true]) await assert.rejects(importArticles(source, { target, dryRun }), /already exists/);
    assert.equal(await readFile(file, 'utf8'), 'original content');
    assert.equal((await readdir(folder)).length, 1);
    await absent(kind === 'article' ? assets : target);
  });
}

test('ignores nested articles, MDX, and unrelated files', async (t) => {
  const { source, target } = await fixture(t);
  await pair(source);
  await mkdir(path.join(source, 'nested'));
  await pair(path.join(source, 'nested'), 'nested-post');
  await writeFile(path.join(source, 'ignored.mdx'), 'ignored');
  await writeFile(path.join(source, 'notes.txt'), 'ignored');
  assert.equal((await importArticles(source, { target })).length, 1);
});

test('accepts BOM/CRLF input and removes a repeated title during import', async (t) => {
  const { source, target } = await fixture(t);
  const input = '\uFEFF' + markdown(metadata, '\n# MY ARTICLE.\n\nBody\n').replaceAll('\n', '\r\n');
  await pair(source, 'my-article', input);
  await importArticles(source, { target });
  const output = await readFile(path.join(target, 'my-article.md'), 'utf8');
  assert.ok(output.endsWith('---\nBody\r\n'));
  assert.ok(!output.includes('# MY ARTICLE'));
});

test('duplicate-title cleanup removes only a matching opening H1', () => {
  for (const heading of ['# My Article\n\n', '\r\n# MY   ARTICLE.\r\n\r\n', '  # My Article ###\n']) {
    assert.equal(removeRepeatedTitle(heading + 'Body', 'My Article'), 'Body');
  }
  assert.equal(removeRepeatedTitle('# My Article', 'My Article'), '');
  for (const body of ['# Other title\nBody', '## My Article\nBody', 'Intro\n# My Article\n', '```md\n# My Article\n```', '    # My Article\n', 'Body']) {
    assert.equal(removeRepeatedTitle(body, 'My Article'), body);
  }
});

test('CLI provides help and rejects missing/unknown arguments from any cwd', async (t) => {
  const { root } = await fixture(t);
  const script = fileURLToPath(new URL('../scripts/import-articles.mjs', import.meta.url));
  const run = (...args) => {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });
    assert.ifError(result.error);
    return result;
  };
  const help = run('--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
  for (const args of [[], ['--unknown'], ['one', 'two']]) {
    const result = run(...args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage:/);
  }
});
