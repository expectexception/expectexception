// Bakes per-route <title>/<meta description>/OG/Twitter/canonical tags into
// static build/<route>/index.html files.
//
// Why this exists: this is a CRA SPA — every route serves the exact same
// public/index.html shell, and react-helmet-async only rewrites <head> tags
// client-side, after JS executes. Search engines that don't wait for (or
// mis-time) JS execution see the homepage's title/description for every
// route — confirmed live: Google's indexed snippet for /downloads was
// showing the generic homepage description instead of the Download Hub's
// own. A prior attempt at fixing this (react-snap, a headless-Chrome
// prerenderer wired to `postbuild`) was found in this repo's history but
// silently dropped long ago; re-enabling it now reproducibly crawled only
// 3 of 23 routes before stopping, with no fatal error — re-introducing a
// flaky headless-browser step into the Vercel build risks reproducing the
// exact "build failure" incidents already fought this session. This script
// does the one thing that actually matters for search snippets (correct
// <title>/<meta description>/OG tags in the raw HTML) via plain string
// templating — no browser, nothing that can hang or crash the build.
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BUILD_DIR = path.join(__dirname, '../build');
const TEMPLATE_PATH = path.join(BUILD_DIR, 'index.html');
const SITE_URL = 'https://expectexception.com';
const tools = require('../src/data/tools.json');
const games = require('../src/data/games.json');

const STATIC_PAGES = [
  {
    route: '/services',
    title: 'Developer Tools & Services | ExpectException',
    description: 'Browse every free developer tool on ExpectException: YouTube downloader, AI image detector, PDF converters, image tools, text utilities, and more. No sign-up required.',
    keywords: 'developer tools, free online tools, software utilities, ExpectException services',
  },
  {
    route: '/sandbox',
    title: 'Sandbox — Free Browser Games & Creative Toys | ExpectException',
    description: 'Play free browser games and creative toys: Snake, 2048, Minesweeper, Connect Four, particle playgrounds, and more. No install, no sign-up, just click and play.',
    keywords: 'free browser games, online games no download, mini games, creative coding toys, javascript games',
  },
  {
    route: '/downloads',
    title: 'Download Hub – Free Developer Resources, Templates & Tools | ExpectException',
    description: 'Free developer resources, code templates, and downloadable tools curated by ExpectException. No sign-up required to browse or download.',
    keywords: 'free developer resources, code templates, download hub, free templates',
  },
  {
    route: '/blogs',
    title: 'Technical Blog | ExpectException',
    description: 'Engineering write-ups, how-tos, and behind-the-scenes notes on building high-performance web tools and AI-powered developer utilities.',
    keywords: 'technical blog, engineering blog, developer tutorials, ExpectException blog',
  },
  {
    route: '/privacy-policy',
    title: 'Privacy Policy | ExpectException',
    description: 'How ExpectException collects, uses, and protects your data across our free developer tools and services.',
    keywords: 'privacy policy, data protection, ExpectException privacy',
  },
  {
    route: '/terms-of-service',
    title: 'Terms of Service | ExpectException',
    description: 'Terms and conditions for using ExpectException\'s free developer tools, sandbox games, and services.',
    keywords: 'terms of service, terms and conditions, ExpectException terms',
  },
  {
    route: '/contact',
    title: 'Contact Us | ExpectException',
    description: 'Get in touch with ExpectException for project inquiries, bug reports, or feedback on our free developer tools.',
    keywords: 'contact ExpectException, hire developer, project inquiry',
  },
];

function toolPageMeta(tool) {
  const keywordList = Array.from(new Set(['ExpectException', tool.title, ...(tool.tags || [])])).join(', ');
  return {
    route: tool.path,
    title: `${tool.title} — Free Online Tool | ExpectException`,
    description: tool.description,
    keywords: keywordList,
  };
}

function gamePageMeta(game) {
  const keywordList = Array.from(new Set(['ExpectException', 'free browser game', game.title, ...(game.tags || [])])).join(', ');
  return {
    route: game.path,
    title: `${game.title} — Free Browser Game | ExpectException Sandbox`,
    description: game.description,
    keywords: keywordList,
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function applyMeta(template, page) {
  const url = `${SITE_URL}${page.route}`;
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const keywords = escapeHtml(page.keywords || '');

  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = html.replace(
    /<meta name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${description}" />`
  );
  html = html.replace(
    /<meta name="keywords"\s+content="[^"]*"\s*\/>/,
    `<meta name="keywords" content="${keywords}" />`
  );
  html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${url}" />`);
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${title}" />`);
  html = html.replace(
    /<meta property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${description}" />`
  );
  html = html.replace(/<meta name="twitter:url" content="[^"]*"\s*\/>/, `<meta name="twitter:url" content="${url}" />`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${title}" />`);
  html = html.replace(
    /<meta name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${description}" />`
  );
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${url}" />`);
  return html;
}

function writeRouteHtml(template, page) {
  const outDir = path.join(BUILD_DIR, page.route.replace(/^\//, ''));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), applyMeta(template, page));
}

async function fetchBlogPages() {
  try {
    const response = await axios.get('http://127.0.0.1:8000/api/blog/posts/', { timeout: 5000 });
    const results = (response.data && response.data.results) || [];
    return results.map((post) => ({
      route: `/blogs/${post.id}`,
      title: `${post.title} | ExpectException Blog`,
      description: post.excerpt || post.title,
      keywords: `ExpectException blog, ${post.title}`,
    }));
  } catch (error) {
    console.warn('Warning: Could not fetch blog posts for static SEO pages (backend might be down). Skipping.', error.message);
    return [];
  }
}

// Admin-editable overrides (apps.services.models.SeoKeywordOverride) — same
// fetch-from-local-backend pattern as fetchBlogPages(). Lets an admin tune
// a route's title/description/keywords (e.g. chasing a trending search
// term) without a code change, and have it reach the *static* HTML a
// crawler sees, not just the client-rendered one.
async function fetchSeoOverrides() {
  try {
    const response = await axios.get('http://127.0.0.1:8000/api/services/seo-overrides/', { timeout: 5000 });
    return response.data || {};
  } catch (error) {
    console.warn('Warning: Could not fetch SEO overrides for static build (backend might be down). Skipping.', error.message);
    return {};
  }
}

function applyOverrides(pages, overrides) {
  return pages.map((page) => {
    const override = overrides[page.route];
    if (!override) return page;
    return {
      ...page,
      title: override.title || page.title,
      description: override.description || page.description,
      keywords: (override.keywords && override.keywords.length > 0)
        ? Array.from(new Set([...(page.keywords || '').split(', ').filter(Boolean), ...override.keywords])).join(', ')
        : page.keywords,
    };
  });
}

async function main() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.warn('generate-static-seo: build/index.html not found, skipping.');
    return;
  }
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  const blogPages = await fetchBlogPages();
  const seoOverrides = await fetchSeoOverrides();
  const pages = applyOverrides([
    ...STATIC_PAGES,
    ...tools.map(toolPageMeta),
    ...games.map(gamePageMeta),
    ...blogPages,
  ], seoOverrides);

  let written = 0;
  for (const page of pages) {
    try {
      writeRouteHtml(template, page);
      written += 1;
    } catch (error) {
      console.warn(`generate-static-seo: failed to write ${page.route}:`, error.message);
    }
  }
  console.log(`generate-static-seo: wrote ${written}/${pages.length} static route pages with per-page SEO tags.`);
}

main();
