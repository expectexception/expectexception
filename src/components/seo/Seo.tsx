import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import apiClient from '../../api/config';

import toolsData from '../../data/tools.json';
import gamesData from '../../data/games.json';

interface SeoOverride {
    keywords: string[];
    title: string;
    description: string;
}

// Module-level cache shared by every <Seo> instance on the page — fetched
// once regardless of how many components mount, not once per page. Admin
// edits (apps/services/models.py's SeoKeywordOverride) reach this on the
// next full page load; no cache invalidation needed since it's a fresh
// module load per navigation-triggered reload anyway, and per-route content
// otherwise never changes without a deploy either.
let overridesCache: Record<string, SeoOverride> | null = null;
let overridesPromise: Promise<Record<string, SeoOverride>> | null = null;

function useSeoOverrides(): Record<string, SeoOverride> | null {
    const [overrides, setOverrides] = useState(overridesCache);
    useEffect(() => {
        if (overridesCache) return;
        if (!overridesPromise) {
            overridesPromise = apiClient
                .get('/api/services/seo-overrides/')
                .then((res) => {
                    overridesCache = res.data;
                    return overridesCache as Record<string, SeoOverride>;
                })
                .catch(() => {
                    overridesCache = {};
                    return overridesCache as Record<string, SeoOverride>;
                });
        }
        overridesPromise.then(setOverrides);
    }, []);
    return overrides;
}

export interface HowToStep {
    name: string;
    text: string;
}

export interface FaqItem {
    question: string;
    answer: string;
}

interface SeoProps {
    title: string;
    description?: string;
    keywords?: string[];
    image?: string;
    type?: 'website' | 'article' | 'application';
    date?: string;
    author?: string;
    structuredData?: object;
    toolId?: number;
    /** games.json id → merges the game's description (as a fallback) and
     * keywords into this page's meta tags, mirroring how toolId works for
     * tool pages. Game pages previously had no equivalent, so most of them
     * fell back to the generic sitewide description instead of their own. */
    gameId?: number;
    howToSteps?: HowToStep[];
    faq?: FaqItem[];
    noIndex?: boolean;
}

// Broad high-volume base keywords present on every page
const BASE_KEYWORDS = [
    'free online tools',
    'developer tools',
    'youtube downloader',
    'AI image detector',
    'pdf to word converter',
    'image compressor',
    'OCR online',
    'text to speech free',
    'QR code generator',
    'expectexception',
    'expectexception.com',
];

const Seo: React.FC<SeoProps> = ({
    title,
    description,
    keywords = [],
    image = '/logo512.png',
    type = 'website',
    date,
    author = 'ExpectException',
    structuredData,
    toolId,
    gameId,
    howToSteps,
    faq,
    noIndex = false,
}) => {
    const location = useLocation();
    const isLocal =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const siteUrl = isLocal
        ? window.location.origin
        : process.env.REACT_APP_SITE_URL || 'https://expectexception.com';
    const currentUrl = `${siteUrl}${location.pathname}`;
    const imageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;

    // Admin-editable override for this route (SeoKeywordOverride) — takes
    // precedence over the hardcoded title/description/keywords below when
    // set, so an admin can chase a trending search term without a
    // code change + redeploy.
    const seoOverrides = useSeoOverrides();
    const override = seoOverrides?.[location.pathname];

    // Resolve tool/game data
    const tool = toolId ? toolsData.find(t => t.id === toolId) : null;
    const game = gameId ? gamesData.find(g => g.id === gameId) : null;
    const finalDescription =
        override?.description ||
        description ||
        tool?.description ||
        game?.description ||
        'Free online developer tools and utilities by ExpectException. No sign-up required.';
    const finalTitle = override?.title || title;

    // Merged keyword list — deduplicated
    const toolKeywords: string[] = (tool as any)?.keywords || [];
    const gameKeywords: string[] = (game as any)?.keywords || [];
    const overrideKeywords: string[] = override?.keywords || [];
    const allKeywords = Array.from(
        new Set([...BASE_KEYWORDS, ...keywords, ...toolKeywords, ...gameKeywords, ...overrideKeywords])
    ).join(', ');

    // ── Structured Data ──────────────────────────────────────────────
    let finalJsonLd: object = structuredData || {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'ExpectException',
        url: siteUrl,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${siteUrl}/search?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };

    if (tool && !structuredData) {
        finalJsonLd = {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: tool.title,
            description: finalDescription,
            url: currentUrl,
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'Any',
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
            },
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: (tool as any).popularity ? (tool as any).popularity * 12 : 120,
            },
        };
    } else if (game && !structuredData) {
        finalJsonLd = {
            '@context': 'https://schema.org',
            '@type': 'VideoGame',
            name: game.title,
            description: finalDescription,
            url: currentUrl,
            applicationCategory: 'GameApplication',
            operatingSystem: 'Any',
            genre: (game as any).category,
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
            },
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.7',
                ratingCount: 90,
            },
        };
    }

    // HowTo schema — shows as rich results in Google
    const howToJsonLd =
        howToSteps && howToSteps.length > 0
            ? {
                  '@context': 'https://schema.org',
                  '@type': 'HowTo',
                  name: `How to use ${finalTitle}`,
                  description: finalDescription,
                  step: howToSteps.map((step, i) => ({
                      '@type': 'HowToStep',
                      position: i + 1,
                      name: step.name,
                      text: step.text,
                  })),
                  tool: {
                      '@type': 'HowToTool',
                      name: finalTitle,
                  },
              }
            : null;

    // FAQPage schema — Google shows this as expandable Q&A in search results
    const faqJsonLd =
        faq && faq.length > 0
            ? {
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: faq.map(item => ({
                      '@type': 'Question',
                      name: item.question,
                      acceptedAnswer: {
                          '@type': 'Answer',
                          text: item.answer,
                      },
                  })),
              }
            : null;

    const fullTitle = finalTitle.includes('ExpectException')
        ? finalTitle
        : `${finalTitle} | ExpectException`;

    return (
        <Helmet>
            {/* Core */}
            <title>{fullTitle}</title>
            <meta name="description" content={finalDescription} />
            <meta name="keywords" content={allKeywords} />
            <link rel="canonical" href={currentUrl} />
            <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
            <meta name="author" content={author} />
            {date && <meta name="date" content={date} />}

            {/* Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={finalDescription} />
            <meta property="og:image" content={imageUrl} />
            <meta property="og:image:width" content="512" />
            <meta property="og:image:height" content="512" />
            <meta property="og:site_name" content="ExpectException" />
            <meta property="og:locale" content="en_US" />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={currentUrl} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={finalDescription} />
            <meta name="twitter:image" content={imageUrl} />
            <meta name="twitter:creator" content="@expectexception" />

            {/* Primary JSON-LD */}
            <script type="application/ld+json">{JSON.stringify(finalJsonLd)}</script>

            {/* HowTo rich result */}
            {howToJsonLd && (
                <script type="application/ld+json">{JSON.stringify(howToJsonLd)}</script>
            )}

            {/* FAQPage rich result */}
            {faqJsonLd && (
                <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
            )}
        </Helmet>
    );
};

export default Seo;
