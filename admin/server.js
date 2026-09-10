const path = require('path');
const express = require('express');
const fs = require('fs-extra');
const paths = require('../lib/paths');
const content = require('../lib/content');

fs.ensureDirSync(paths.POSTS_DIR);
fs.ensureDirSync(paths.UPLOADS_ORIGINALS_DIR);
fs.ensureDirSync(paths.UPLOADS_THUMBS_DIR);
fs.ensureDirSync(paths.UPLOADS_INLINE_DIR);

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use('/admin-assets', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(paths.UPLOADS_DIR));

app.use('/api/posts', require('./routes/posts'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/publish', require('./routes/publish'));

app.get('/', (req, res) => {
  const posts = content.readAllPosts();
  const categories = content.readCategories();
  res.render('dashboard', {
    postCount: posts.length,
    publishedCount: posts.filter((p) => p.status === 'published').length,
    draftCount: posts.filter((p) => p.status === 'draft').length,
    categoryCount: categories.length
  });
});

app.get('/posts', (req, res) => {
  const posts = content.readAllPosts();
  const categories = content.readCategories();
  const categoriesById = {};
  categories.forEach((c) => { categoriesById[c.id] = c; });
  res.render('post-list', { posts, categoriesById });
});

app.get('/posts/new', (req, res) => {
  res.render('post-editor', {
    post: null,
    categories: content.readCategories(),
    fonts: content.readFonts()
  });
});

app.get('/posts/:id/edit', (req, res) => {
  const post = content.getPostById(req.params.id);
  if (!post) return res.status(404).send('Post not found');
  res.render('post-editor', {
    post: { ...post, bodyHtml: content.previewHtmlForBody(post.bodyHtml) },
    categories: content.readCategories(),
    fonts: content.readFonts()
  });
});

app.get('/categories', (req, res) => {
  const categories = content.readCategories();
  const posts = content.readAllPosts();
  const countsByCategory = {};
  posts.forEach((p) => {
    countsByCategory[p.categoryId] = (countsByCategory[p.categoryId] || 0) + 1;
  });
  res.render('category-manager', { categories, countsByCategory });
});

app.listen(PORT, () => {
  console.log(`\nAdmin dashboard running at http://localhost:${PORT}\n`);
});
