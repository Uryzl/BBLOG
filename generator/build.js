const fs = require('fs-extra');
const path = require('path');
const ejs = require('ejs');
const paths = require('../lib/paths');
const content = require('../lib/content');

function makeUrl(basePath) {
  const base = (basePath || '').replace(/\/$/, '');
  return function url(p) {
    if (!p.startsWith('/')) p = '/' + p;
    return base + p;
  };
}

function rewriteBodyImagesForPublish(html, url) {
  return html.replace(/src="(inline\/[^"]+)"/g, (m, p1) => `src="${url('/images/' + p1)}"`);
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function validate({ categories, posts }) {
  const errors = [];
  const categoryIds = new Set(categories.map((c) => c.id));

  posts.forEach((post) => {
    if (!post.categoryId || !categoryIds.has(post.categoryId)) {
      errors.push(`Post "${post.title}" (${post.id}) has no valid category assigned.`);
    }
    if (post.thumbnail && !fs.existsSync(path.join(paths.UPLOADS_DIR, post.thumbnail))) {
      errors.push(`Post "${post.title}" references a missing thumbnail image: ${post.thumbnail}`);
    }
  });

  categories.forEach((cat) => {
    if (cat.imagePath && !fs.existsSync(path.join(paths.UPLOADS_DIR, cat.imagePath))) {
      errors.push(`Category "${cat.name}" references a missing image: ${cat.imagePath}`);
    }
  });

  return errors;
}

function listFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  (function walk(current) {
    fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        out.push(path.relative(dir, full));
      }
    });
  })(dir);
  return out;
}

// Publishing overwrites files in place (rather than deleting and recreating
// the whole docs/ folder) because on Windows, deleting a file that another
// process has open — e.g. a local static server previewing docs/ — fails
// with EPERM/ENOTEMPTY. Overwriting an open-for-read file works fine; only
// files that truly need to disappear (renamed/removed pages) are deleted,
// and even that is best-effort: if a stale file is locked by something
// actively reading it right now, it's left in place and swept up on a
// later publish once that reader has moved on, rather than failing the
// whole publish over one file that's about to be replaced anyway.
function syncBuildIntoDocs() {
  fs.ensureDirSync(paths.DOCS_DIR);
  const warnings = [];
  const freshFiles = listFilesRecursive(paths.DOCS_BUILD_DIR);
  const freshSet = new Set(freshFiles.map((f) => f.split(path.sep).join('/')));

  freshFiles.forEach((rel) => {
    const src = path.join(paths.DOCS_BUILD_DIR, rel);
    const dest = path.join(paths.DOCS_DIR, rel);
    fs.ensureDirSync(path.dirname(dest));
    try {
      fs.copyFileSync(src, dest);
    } catch (e) {
      warnings.push(`Could not update ${rel}: ${e.message}`);
    }
  });

  const existingFiles = listFilesRecursive(paths.DOCS_DIR);
  existingFiles.forEach((rel) => {
    const key = rel.split(path.sep).join('/');
    if (!freshSet.has(key)) {
      try {
        fs.removeSync(path.join(paths.DOCS_DIR, rel));
      } catch (e) {
        warnings.push(`Could not remove stale file ${rel} (still open elsewhere) — it will be cleaned up on a later publish.`);
      }
    }
  });

  // Prune now-empty directories left behind by removed pages/categories.
  (function pruneEmptyDirs(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      if (entry.isDirectory()) {
        const full = path.join(dir, entry.name);
        pruneEmptyDirs(full);
        try {
          if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
        } catch (e) {
          // Leave it; will retry on a later publish.
        }
      }
    });
  })(paths.DOCS_DIR);

  fs.removeSync(paths.DOCS_BUILD_DIR);
  return warnings;
}

function renderPage(templateName, locals) {
  const bodyPath = path.join(paths.TEMPLATES_DIR, `${templateName}.ejs`);
  const body = ejs.render(fs.readFileSync(bodyPath, 'utf8'), locals, {
    filename: bodyPath
  });
  const layoutPath = path.join(paths.TEMPLATES_DIR, 'layout.ejs');
  return ejs.render(fs.readFileSync(layoutPath, 'utf8'), { ...locals, body }, {
    filename: layoutPath
  });
}

function build() {
  const site = content.readSiteConfig();
  const fonts = content.readFonts();
  const categories = content.readCategories();
  const posts = content.allPublishedPosts();

  const errors = validate({ categories, posts });
  if (errors.length) {
    return { ok: false, errors };
  }

  const url = makeUrl(site.basePath);
  const categoriesById = {};
  categories.forEach((c) => { categoriesById[c.id] = c; });

  fs.emptyDirSync(paths.DOCS_BUILD_DIR);
  const OUT = paths.DOCS_BUILD_DIR;
  fs.ensureDirSync(path.join(OUT, 'assets'));
  fs.ensureDirSync(path.join(OUT, 'category'));
  fs.ensureDirSync(path.join(OUT, 'post'));
  fs.ensureDirSync(path.join(OUT, 'images'));

  fs.copySync(paths.GENERATOR_ASSETS_DIR, path.join(OUT, 'assets'));

  if (fs.existsSync(paths.UPLOADS_THUMBS_DIR)) {
    fs.copySync(paths.UPLOADS_THUMBS_DIR, path.join(OUT, 'images', 'thumbs'));
  }
  if (fs.existsSync(paths.UPLOADS_INLINE_DIR)) {
    fs.copySync(paths.UPLOADS_INLINE_DIR, path.join(OUT, 'images', 'inline'));
  }

  const baseLocals = { site, fonts, categories, categoriesById, url };

  const homeHtml = renderPage('home', {
    ...baseLocals,
    pageTitle: 'Home',
    posts
  });
  fs.writeFileSync(path.join(OUT, 'index.html'), homeHtml);

  categories.forEach((category) => {
    const categoryPosts = content.publishedPostsByCategory(category.id);
    const html = renderPage('category', {
      ...baseLocals,
      pageTitle: category.name,
      category,
      posts: categoryPosts
    });
    const dir = path.join(OUT, 'category', category.slug);
    fs.ensureDirSync(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  });

  posts.forEach((post) => {
    const category = categoriesById[post.categoryId] || null;
    const publishablePost = { ...post, bodyHtml: rewriteBodyImagesForPublish(post.bodyHtml, url) };
    const html = renderPage('post', {
      ...baseLocals,
      pageTitle: post.title,
      pageDescription: post.excerpt,
      post: publishablePost,
      category,
      publishedDateLabel: formatDate(post.publishedAt)
    });
    const dir = path.join(OUT, 'post', post.slug);
    fs.ensureDirSync(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  });

  const warnings = syncBuildIntoDocs();

  return {
    ok: true,
    warnings,
    stats: {
      posts: posts.length,
      categories: categories.length,
      publishedAt: new Date().toISOString()
    }
  };
}

module.exports = { build };

if (require.main === module) {
  const result = build();
  if (!result.ok) {
    console.error('Build failed:\n' + result.errors.map((e) => ' - ' + e).join('\n'));
    process.exit(1);
  } else {
    console.log(`Build complete: ${result.stats.posts} posts, ${result.stats.categories} categories.`);
  }
}
