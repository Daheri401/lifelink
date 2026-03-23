const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/verification', (req, res) => {
  res.sendFile(path.join(__dirname, '../lifelink-ui/pages/verification.html'));
});

module.exports = router;