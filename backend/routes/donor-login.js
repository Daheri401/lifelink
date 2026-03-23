const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/donor-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../lifelink-ui/pages/donor-login.html'));
});

module.exports = router;