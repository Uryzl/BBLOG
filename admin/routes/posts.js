const express = require('express');
const content = require('../../lib/content');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(content.readAllPosts());
});

router.get('/:id', (req, res) => {
  const post = content.getPostById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  res.json(post);
});

router.post('/', (req, res) => {
  const post = content.createPost(req.body);
  res.status(201).json(post);
});

router.put('/:id', (req, res) => {
  try {
    const post = content.updatePost(req.params.id, req.body);
    res.json(post);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  content.deletePost(req.params.id);
  res.status(204).end();
});

module.exports = router;
