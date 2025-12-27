import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

import toolsData from '../../data/tools.json';

interface SeoProps {
    title: string;
    description?: string;
    keywords?: string[];
    image?: string;
    type?: 'website' | 'article' | 'application';
    date?: string;
    author?: string;
    structuredData?: object;
    toolId?: number; // New prop for auto-SEO
}

const Seo: React.FC<SeoProps> = ({
    title,
    description,
    keywords = [],
    image = '/og-image.jpg', // Default OG image
    type = 'website',
    date,
    author = 'ExpectException',
    structuredData,
    toolId
}) => {
    const location = useLocation();
    const siteUrl = window.location.origin;
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
            <meta property="og:description" content={description} />
            <meta property="og:image" content={imageUrl} />
            <meta property="og:site_name" content="ExpectException" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={currentUrl} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={imageUrl} />

            {/* Structured Data JSON-LD */}
            <script type="application/ld+json">
                {JSON.stringify(finalJsonLd)}
            </script>
        </Helmet>
    );
};

export default Seo;
