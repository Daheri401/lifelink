const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/hospital-signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../lifelink-ui/pages/hospital-signup.html'));
});

module.exports = router;