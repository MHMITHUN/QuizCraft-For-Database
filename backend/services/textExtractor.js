const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');

class TextExtractor {
  /**
   * Extract text from various file types
   * @param {String} filePath - Path to the file
   * @param {String} fileType - Type of file (pdf, image, text)
   * @returns {Promise<String>} Extracted text
   */
  async extractText(filePath, fileType) {
    try {
      if (fileType === 'pdf' || filePath.toLowerCase().endsWith('.pdf')) {
        return await this.extractFromPDF(filePath);
      } else if (this.isImage(filePath)) {
        return await this.extractFromImage(filePath);
      } else {
        return await this.extractFromText(filePath);
      }
    } catch (error) {
      console.error('Text extraction error:', error);
      throw new Error('Failed to extract text from file: ' + error.message);
    }
  }

  /**
   * Extract text from PDF file
   */
  async extractFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('PDF appears to be empty or contains only images');
      }

      return data.text;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF: ' + error.message);
    }
  }

  /**
   * Extract text from image using OCR
   */
  async extractFromImage(filePath) {
    try {
      const result = await Tesseract.recognize(filePath, 'eng+ben', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      if (!result.data.text || result.data.text.trim().length === 0) {
        throw new Error('No text could be extracted from the image');
      }

      return result.data.text;
    } catch (error) {
      console.error('OCR error:', error);
      throw new Error('Failed to extract text from image: ' + error.message);
    }
  }

  /**
   * Extract text from plain text file
   */
  async extractFromText(filePath) {
    try {
      const text = await fs.readFile(filePath, 'utf-8');
      
      if (!text || text.trim().length === 0) {
        throw new Error('Text file is empty');
      }

      return text;
    } catch (error) {
      console.error('Text file reading error:', error);
      throw new Error('Failed to read text file: ' + error.message);
    }
  }

  /**
   * Check if file is an image
   */
  isImage(filePath) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];
    const ext = path.extname(filePath).toLowerCase();
    return imageExtensions.includes(ext);
  }

  /**
   * Validate extracted text
   */
  validateText(text, minLength = 50) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text format');
    }

    const cleanText = text.trim();
    
    if (cleanText.length < minLength) {
      throw new Error(`Extracted text is too short (minimum ${minLength} characters required)`);
    }

    return cleanText;
  }

  /**
   * Clean and preprocess extracted text
   */
  cleanText(text) {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/\t/g, ' ') // Replace tabs with spaces
      .replace(/ {2,}/g, ' ') // Remove multiple spaces
      .trim();
  }

  /**
   * Detect language from text content
   * Detects if text contains Bengali/Bangla characters
   * @param {String} text - Text to analyze
   * @returns {String} Language code ('bn' for Bengali, 'en' for English)
   */
  detectLanguage(text) {
    if (!text || typeof text !== 'string') {
      return 'en'; // Default to English
    }

    // Bengali Unicode range: \u0980-\u09FF
    const bengaliRegex = /[\u0980-\u09FF]/;
    
    // Count Bengali characters
    const bengaliMatches = text.match(/[\u0980-\u09FF]/g);
    const bengaliCharCount = bengaliMatches ? bengaliMatches.length : 0;
    
    // Count total alphanumeric characters (excluding spaces and punctuation)
    const totalChars = text.replace(/[\s\d\p{P}]/gu, '').length;
    
    // If Bengali characters make up more than 30% of content, consider it Bengali
    // This threshold balances between pure Bengali content and mixed content
    if (totalChars > 0 && (bengaliCharCount / totalChars) > 0.3) {
      console.log(`📝 Language detected: Bengali (${bengaliCharCount}/${totalChars} chars = ${((bengaliCharCount/totalChars)*100).toFixed(1)}%)`);
      return 'bn';
    }
    
    console.log(`📝 Language detected: English (${bengaliCharCount}/${totalChars} chars = ${totalChars > 0 ? ((bengaliCharCount/totalChars)*100).toFixed(1) : 0}%)`);
    return 'en';
  }
}

module.exports = new TextExtractor();
