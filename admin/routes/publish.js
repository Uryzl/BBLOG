const express = require('express');
const { build } = require('../../generator/build');

const router = express.Router();

router.post('/', (req, res) => {
  try {
    const result = build();
    if (!result.ok) {
      return res.status(422).json({ ok: false, errors: result.errors });
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, errors: [e.message] });
  }
});

module.exports = router;
