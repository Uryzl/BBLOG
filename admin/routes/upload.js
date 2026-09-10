const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs-extra');
const { nanoid } = require('nanoid');
const paths = require('../../lib/paths');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed.'));
    }
    cb(null, true);
  }
});

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file was uploaded.' });
  }

  const type = req.query.type === 'inline' ? 'inline' : 'thumb';
  const id = nanoid(10);

  try {
    const originalExt = path.extname(req.file.originalname) || '.jpg';
    const originalPath = path.join(paths.UPLOADS_ORIGINALS_DIR, `${id}${originalExt}`);
    await fs.writeFile(originalPath, req.file.buffer);

    if (type === 'thumb') {
      const filename = `${id}-thumb.jpg`;
      const outPath = path.join(paths.UPLOADS_THUMBS_DIR, filename);
      await sharp(req.file.buffer).resize({ width: 600, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(outPath);
      return res.status(201).json({ path: `thumbs/${filename}`, previewUrl: `/uploads/thumbs/${filename}` });
    }

    const filename = `${id}-inline.jpg`;
    const outPath = path.join(paths.UPLOADS_INLINE_DIR, filename);
    await sharp(req.file.buffer).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 84 }).toFile(outPath);
    return res.status(201).json({ path: `inline/${filename}`, previewUrl: `/uploads/inline/${filename}` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to process image: ' + e.message });
  }
});

module.exports = router;
