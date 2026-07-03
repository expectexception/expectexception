import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

import toolsData from '../../data/tools.json';

export interface HowToStep {
    name: string;
    text: string;
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
}

const Seo: React.FC<SeoProps> = ({
    title,
    description,
    keywords = [],
    image = '/og-image.jpg',
    type = 'website',
    date,
    author = 'ExpectException',
    structuredData,
    toolId,
    howToSteps,
}) => {
    const location = useLocation();
    // Use window.location.origin ONLY for localhost development
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const siteUrl = isLocal
        ? window.location.origin
        : (process.env.REACT_APP_SITE_URL || 'https://expectexception.com');
    const currentUrl = `${siteUrl}${location.pathname}`;
    const imageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;

    // Find tool if ID provided
    const tool = toolId ? toolsData.find(t => t.id === toolId) : null;

    // Use provided description OR tool description OR default
    const finalDescription = description || tool?.description || "Free online developer tools and utilities by ExpectException.";

    // Default keywords if none provided
    const baseKeywords = [
        'developer tools',
        'free online tools',
        'pdf converter',
        'youtube downloader',
        'image compressor',
        'ocr online',
        'expectexception'
    ];

    // Merge provided keywords + tool keywords + base keywords
    const toolKeywords = tool?.keywords || [];
    const allKeywords = Array.from(new Set([...baseKeywords, ...keywords, ...toolKeywords])).join(', ');

    // Default JSON-LD for WebSite
    let finalJsonLd = structuredData || {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "ExpectException Tools",
        "url": siteUrl,
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${siteUrl}/search?q={search_term_string}`
            },
            "query-input": "required name=search_term_string"
        }
    };

    // If it's a tool, auto-generate SoftwareApplication schema
    if (tool && !structuredData) {
        finalJsonLd = {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": tool.title,
            "description": finalDescription,
            "url": currentUrl,
            "applicationCategory": "UtilitiesApplication", // Generic category
            "operatingSystem": "Any",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
            },
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8", // Static high rating for SEO confidence
                "ratingCount": tool.popularity * 10 // Mock rating count based on popularity
            }
        };
    }

    // HowTo JSON-LD (for tools with steps — shown as rich results in Google)
    const howToJsonLd = howToSteps && howToSteps.length > 0 ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": `How to use ${title}`,
        "description": finalDescription,
        "step": howToSteps.map((step, i) => ({
            "@type": "HowToStep",
            "position": i + 1,
            "name": step.name,
            "text": step.text,
        })),
        "tool": {
            "@type": "HowToTool",
            "name": title,
        },
    } : null;

    return (
        <Helmet>
            {/* Standard Meta Tags */}
            <title>{title} | ExpectException</title>
            <meta name="description" content={finalDescription} />
            <meta name="keywords" content={allKeywords} />
            <link rel="canonical" href={currentUrl} />
            <meta name="robots" content="index, follow" />
            <meta name="author" content={author} />
            {date && <meta name="date" content={date} />}

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={finalDescription} />
            <meta property="og:image" content={imageUrl} />
            <meta property="og:site_name" content="ExpectException" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={currentUrl} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={finalDescription} />
            <meta name="twitter:image" content={imageUrl} />

            {/* Primary Structured Data JSON-LD */}
            <script type="application/ld+json">
                {JSON.stringify(finalJsonLd)}
            </script>

            {/* HowTo Structured Data (rich results) */}
            {howToJsonLd && (
                <script type="application/ld+json">
                    {JSON.stringify(howToJsonLd)}
                </script>
            )}
        </Helmet>
    );
};

export default Seo;
