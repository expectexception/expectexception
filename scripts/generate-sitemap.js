const fs = require('fs');
const path = require('path');

const baseUrl = 'https://expectexception.com';
const tools = require('../src/data/tools.json');

const staticRoutes = [
    '/',
    '/services',
    '/search',
    '/blogs',
    '/downloads',
    '/privacy-policy',
    '/terms-of-service',
    '/contact'
];

const toolRoutes = tools.map(tool => tool.path);

const routes = [...staticRoutes, ...toolRoutes];

const axios = require('axios'); // Ensure axios is available or use native fetch/https

const generateSitemap = async () => {
    let blogRoutes = [];
    try {
        // Fetch published blog posts
        // Attempting to fetch from local backend first, fallback or skip if offline
        const response = await axios.get('http://127.0.0.1:8000/api/blog/posts/');
        if (response.data && Array.isArray(response.data.results)) {
            blogRoutes = response.data.results.map(post => `/blogs/${post.id}`);
            console.log(`Fetched ${blogRoutes.length} blog posts for sitemap.`);
        }
    } catch (error) {
        console.warn('Warning: Could not fetch blog posts for sitemap (Backend might be down). Skipping blog routes.', error.message);
    }

    const allRoutes = [...routes, ...blogRoutes];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
            .map(route => {
                return `  <url>
    <loc>${baseUrl}${route}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`;
            })
            .join('\n')}
</urlset>`;

    const outputPath = path.join(__dirname, '../public/sitemap.xml');
    fs.writeFileSync(outputPath, sitemap);
    console.log(`Sitemap generated at ${outputPath}`);

    // Also copy to build folder if it exists
    const buildPath = path.join(__dirname, '../build/sitemap.xml');
    if (fs.existsSync(path.join(__dirname, '../build'))) {
        fs.writeFileSync(buildPath, sitemap);
        console.log(`Sitemap copied to ${buildPath}`);
    }
};

generateSitemap();
