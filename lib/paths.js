const path = require('path');

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  ROOT,
  CONFIG_DIR: path.join(ROOT, 'config'),
  FONTS_FILE: path.join(ROOT, 'config', 'fonts.json'),
  SITE_FILE: path.join(ROOT, 'config', 'site.json'),
  CONTENT_DIR: path.join(ROOT, 'content'),
  CATEGORIES_FILE: path.join(ROOT, 'content', 'categories.json'),
  POSTS_DIR: path.join(ROOT, 'content', 'posts'),
  UPLOADS_DIR: path.join(ROOT, 'uploads'),
  UPLOADS_ORIGINALS_DIR: path.join(ROOT, 'uploads', 'originals'),
  UPLOADS_THUMBS_DIR: path.join(ROOT, 'uploads', 'thumbs'),
  UPLOADS_INLINE_DIR: path.join(ROOT, 'uploads', 'inline'),
  GENERATOR_DIR: path.join(ROOT, 'generator'),
  TEMPLATES_DIR: path.join(ROOT, 'generator', 'templates'),
  GENERATOR_ASSETS_DIR: path.join(ROOT, 'generator', 'assets'),
  DOCS_DIR: path.join(ROOT, 'docs'),
  DOCS_BUILD_DIR: path.join(ROOT, '.docs-build')
};
