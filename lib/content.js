const fs = require('fs-extra');
const path = require('path');
const slugify = require('slugify');
const { nanoid } = require('nanoid');
const sanitizeHtml = require('sanitize-html');
const paths = require('./paths');

function slugFor(text) {
  return slugify(text, { lower: true, strict: true, trim: true });
}

function sanitizeBodyHtml(html) {
  return sanitizeHtml(html || '', {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'img', 'h2', 'h3', 'ol', 'ul', 'li', 'blockquote'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
    }
  });
}

// ---- Fonts / site config ----

function readFonts() {
  return fs.readJsonSync(paths.FONTS_FILE);
}

function getFontById(id) {
  return readFonts().find((f) => f.id === id) || null;
}

function readSiteConfig() {
  return fs.readJsonSync(paths.SITE_FILE);
}

function writeSiteConfig(config) {
  fs.writeJsonSync(paths.SITE_FILE, config, { spaces: 2 });
}

// ---- Categories ----

function readCategories() {
  fs.ensureFileSync(paths.CATEGORIES_FILE);
  let raw;
  try {
    raw = fs.readJsonSync(paths.CATEGORIES_FILE);
  } catch (e) {
    raw = [];
  }
  return raw.sort((a, b) => a.order - b.order);
}

function writeCategories(categories) {
  fs.writeJsonSync(paths.CATEGORIES_FILE, categories, { spaces: 2 });
}

function getCategoryById(id) {
  return readCategories().find((c) => c.id === id) || null;
}

function createCategory({ name, imagePath = '' }) {
  const categories = readCategories();
  const baseSlug = slugFor(name);
  let slug = baseSlug;
  let n = 2;
  while (categories.some((c) => c.slug === slug)) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }
  const maxOrder = categories.reduce((m, c) => Math.max(m, c.order || 0), 0);
  const category = {
    id: slug,
    name,
    slug,
    order: maxOrder + 1,
    imagePath
  };
  categories.push(category);
  writeCategories(categories);
  return category;
}

function updateCategory(id, updates) {
  const categories = readCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Category not found');
  categories[idx] = { ...categories[idx], ...updates, id: categories[idx].id, slug: categories[idx].slug };
  writeCategories(categories);
  return categories[idx];
}

function reorderCategories(orderedIds) {
  const categories = readCategories();
  orderedIds.forEach((id, index) => {
    const cat = categories.find((c) => c.id === id);
    if (cat) cat.order = index + 1;
  });
  writeCategories(categories);
  return readCategories();
}

function deleteCategory(id) {
  const posts = readAllPosts();
  const inUse = posts.some((p) => p.categoryId === id);
  if (inUse) {
    const err = new Error('Category is still assigned to one or more posts. Reassign those posts first.');
    err.code = 'CATEGORY_IN_USE';
    throw err;
  }
  const categories = readCategories().filter((c) => c.id !== id);
  writeCategories(categories);
}

// ---- Posts ----

function postFilePath(id) {
  return path.join(paths.POSTS_DIR, `${id}.json`);
}

function readAllPosts() {
  fs.ensureDirSync(paths.POSTS_DIR);
  const files = fs.readdirSync(paths.POSTS_DIR).filter((f) => f.endsWith('.json'));
  return files
    .map((f) => fs.readJsonSync(path.join(paths.POSTS_DIR, f)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getPostById(id) {
  const file = postFilePath(id);
  if (!fs.existsSync(file)) return null;
  return fs.readJsonSync(file);
}

function slugForPost(title, excludeId) {
  const posts = readAllPosts();
  const baseSlug = slugFor(title) || 'post';
  let slug = baseSlug;
  let n = 2;
  while (posts.some((p) => p.slug === slug && p.id !== excludeId)) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }
  return slug;
}

function createPost(data) {
  const id = nanoid(10);
  const now = new Date().toISOString();
  const slug = slugForPost(data.title || 'untitled');
  const post = {
    id,
    slug,
    title: data.title || 'Untitled',
    titleFont: data.titleFont || '',
    categoryId: data.categoryId || '',
    excerpt: data.excerpt || '',
    thumbnail: data.thumbnail || '',
    bodyHtml: sanitizeBodyHtml(data.bodyHtml || ''),
    status: data.status === 'published' ? 'published' : 'draft',
    createdAt: now,
    updatedAt: now,
    publishedAt: data.status === 'published' ? now : null
  };
  fs.writeJsonSync(postFilePath(id), post, { spaces: 2 });
  return post;
}

function updatePost(id, data) {
  const existing = getPostById(id);
  if (!existing) throw new Error('Post not found');
  const now = new Date().toISOString();
  const titleChanged = data.title && data.title !== existing.title;
  const wasPublished = existing.status === 'published';
  const willBePublished = data.status === 'published';

  const updated = {
    ...existing,
    title: data.title !== undefined ? data.title : existing.title,
    slug: titleChanged ? slugForPost(data.title, id) : existing.slug,
    titleFont: data.titleFont !== undefined ? data.titleFont : existing.titleFont,
    categoryId: data.categoryId !== undefined ? data.categoryId : existing.categoryId,
    excerpt: data.excerpt !== undefined ? data.excerpt : existing.excerpt,
    thumbnail: data.thumbnail !== undefined ? data.thumbnail : existing.thumbnail,
    bodyHtml: data.bodyHtml !== undefined ? sanitizeBodyHtml(data.bodyHtml) : existing.bodyHtml,
    status: data.status !== undefined ? (data.status === 'published' ? 'published' : 'draft') : existing.status,
    updatedAt: now,
    publishedAt: !wasPublished && willBePublished ? now : existing.publishedAt
  };
  fs.writeJsonSync(postFilePath(id), updated, { spaces: 2 });
  return updated;
}

function deletePost(id) {
  const file = postFilePath(id);
  if (fs.existsSync(file)) fs.removeSync(file);
}

function publishedPostsByCategory(categoryId) {
  return readAllPosts()
    .filter((p) => p.status === 'published' && p.categoryId === categoryId)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function allPublishedPosts() {
  return readAllPosts()
    .filter((p) => p.status === 'published')
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function previewHtmlForBody(bodyHtml) {
  return bodyHtml.replace(/src="(inline\/[^"]+)"/g, (m, p1) => `src="/uploads/${p1}"`);
}

module.exports = {
  slugFor,
  previewHtmlForBody,
  readFonts,
  getFontById,
  readSiteConfig,
  writeSiteConfig,
  readCategories,
  writeCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  reorderCategories,
  deleteCategory,
  readAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  publishedPostsByCategory,
  allPublishedPosts
};
