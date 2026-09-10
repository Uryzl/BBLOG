const express = require('express');
const content = require('../../lib/content');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(content.readCategories());
});

router.post('/', (req, res) => {
  const { name, imagePath } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }
  const category = content.createCategory({ name: name.trim(), imagePath: imagePath || '' });
  res.status(201).json(category);
});

router.put('/:id', (req, res) => {
  try {
    const { name, imagePath } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (imagePath !== undefined) updates.imagePath = imagePath;
    const category = content.updateCategory(req.params.id, updates);
    res.json(category);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

router.post('/reorder', (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds must be an array.' });
  }
  res.json(content.reorderCategories(orderedIds));
});

router.delete('/:id', (req, res) => {
  try {
    content.deleteCategory(req.params.id);
    res.status(204).end();
  } catch (e) {
    if (e.code === 'CATEGORY_IN_USE') {
      return res.status(409).json({ error: e.message });
    }
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
