import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch'; // node-fetch v2

const router = Router();

router.get('/link-preview', requireAuth, async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    let urlObj;
    try {
      urlObj = new URL(targetUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Signal-Clone-Bot/1.0',
        'Accept': 'text/html'
      },
      timeout: 5000 // 5 seconds timeout
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch URL' });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const getMetaTag = (name: string) => {
      return $(`meta[name="${name}"]`).attr('content') ||
             $(`meta[property="${name}"]`).attr('content') ||
             $(`meta[property="og:${name}"]`).attr('content') ||
             $(`meta[name="twitter:${name}"]`).attr('content');
    };

    const title = getMetaTag('title') || $('title').text() || urlObj.hostname;
    const description = getMetaTag('description') || '';
    const image = getMetaTag('image') || '';

    return res.json({
      title: title.trim(),
      description: description.trim(),
      image,
      url: targetUrl
    });
  } catch (error) {
    console.error('Link preview error:', error);
    res.status(500).json({ error: 'Failed to generate link preview' });
  }
});

export default router;
