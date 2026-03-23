const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/hospital-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../lifelink-ui/pages/hospital-login.html'));
});

module.exports = router;