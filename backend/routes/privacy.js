const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../lifelink-ui/pages/privacy.html'));
});

module.exports = router;