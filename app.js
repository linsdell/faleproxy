const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to fetch and modify content
app.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the content from the provided URL
    const response = await axios.get(url);
    const html = response.data;

    // Use cheerio to parse HTML and selectively replace text content, not URLs
    const $ = cheerio.load(html);
    
    // Process text nodes in the body
    $('body *').contents().filter(function() {
      return this.nodeType === 3; // Text nodes only
    }).each(function() {
      // Replace text content but not in URLs or attributes
      // Handle case-preserving replacements: YALE->FALE, Yale->Fale, yale->fale
      const text = $(this).text();
      let newText = text.replace(/YALE/g, 'FALE');
      newText = newText.replace(/Yale/g, 'Fale');
      newText = newText.replace(/yale/g, 'fale');
      if (text !== newText) {
        $(this).replaceWith(newText);
      }
    });
    
    // Process title separately with case-preserving replacements
    let title = $('title').text();
    title = title.replace(/YALE/g, 'FALE').replace(/Yale/g, 'Fale').replace(/yale/g, 'fale');
    $('title').text(title);
    
    return res.json({ 
      success: true, 
      content: $.html(),
      title: title,
      originalUrl: url
    });
  } catch (error) {
    console.error('Error fetching URL:', error.message);
    return res.status(500).json({ 
      error: `Failed to fetch content: ${error.message}` 
    });
  }
});

// Start the server only if this file is run directly (not imported)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Faleproxy server running at http://localhost:${PORT}`);
  });
}

// Export the app for testing
module.exports = app;
