import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

import toolsData from '../../data/tools.json';

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

    // Resolve tool data
    const tool = toolId ? toolsData.find(t => t.id === toolId) : null;
    const finalDescription =
        description ||
        tool?.description ||
        'Free online developer tools and utilities by ExpectException. No sign-up required.';

    // Merged keyword list — deduplicated
    const toolKeywords: string[] = (tool as any)?.keywords || [];
    const allKeywords = Array.from(
        new Set([...BASE_KEYWORDS, ...keywords, ...toolKeywords])
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
    }

    // HowTo schema — shows as rich results in Google
    const howToJsonLd =
        howToSteps && howToSteps.length > 0
            ? {
                  '@context': 'https://schema.org',
                  '@type': 'HowTo',
                  name: `How to use ${title}`,
                  description: finalDescription,
                  step: howToSteps.map((step, i) => ({
                      '@type': 'HowToStep',
                      position: i + 1,
                      name: step.name,
                      text: step.text,
                  })),
                  tool: {
                      '@type': 'HowToTool',
                      name: title,
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

    const fullTitle = title.includes('ExpectException')
        ? title
        : `${title} | ExpectException`;

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
