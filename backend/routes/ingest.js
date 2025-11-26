const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const textExtractor = require('../services/textExtractor');
router.post('/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const text = await textExtractor.extractText(req.file.path, 'pdf');
    const cleaned = textExtractor.cleanText(text);
    textExtractor.validateText(cleaned, 50);
    res.json({ success: true, data: { text: cleaned } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to parse PDF' });
  }
});
router.post('/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const text = await textExtractor.extractFromImage(req.file.path);
    const cleaned = textExtractor.cleanText(text);
    textExtractor.validateText(cleaned, 30);
    res.json({ success: true, data: { text: cleaned } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to run OCR' });
  }
});
module.exports = router;
