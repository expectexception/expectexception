const fs = require('fs');
const path = require('path');

const baseUrl = 'https://expectexception.com';
const routes = [
    '/',
    '/services',
    '/services/qr-generator',
    '/services/json-formatter',
    '/services/url-downloader',
    '/services/yt-downloader',
    '/services/text-to-speech',
    '/services/image-compressor',
    '/services/ai-detector',
    '/services/pdf-to-doc',
    '/services/doc-to-pdf',
    '/services/pdf-merger',
    '/services/pdf-splitter',
    '/services/image-to-pdf',
    '/services/image-resizer',
    '/services/background-remover',
    '/services/image-to-text',
    '/services/image-converter',
    '/services/base64',
    '/services/hash-generator',
    '/services/uuid-generator',
    '/services/color-converter',
    '/services/markdown-preview',
    '/search',
    '/blogs',
    '/downloads',
    '/privacy-policy',
    '/terms-of-service',
    '/contact'
];

const generateSitemap = () => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
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
