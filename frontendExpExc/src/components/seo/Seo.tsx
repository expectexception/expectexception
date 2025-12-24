import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SeoProps {
    title: string;
    description: string;
    keywords?: string[];
    image?: string;
    type?: 'website' | 'article' | 'application';
    date?: string;
    author?: string;
    structuredData?: object;
}

const Seo: React.FC<SeoProps> = ({
    title,
    description,
    keywords = [],
    image = '/og-image.jpg', // Default OG image
    type = 'website',
    date,
    author = 'ExpectException',
    structuredData
}) => {
    const location = useLocation();
    const siteUrl = window.location.origin;
    const currentUrl = `${siteUrl}${location.pathname}`;
    const imageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;

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

    const allKeywords = Array.from(new Set([...baseKeywords, ...keywords])).join(', ');

    // Default JSON-LD for WebSite
    const defaultJsonLd = {
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

    const finalJsonLd = structuredData || defaultJsonLd;

    return (
        <Helmet>
            {/* Standard Meta Tags */}
            <title>{title} | ExpectException</title>
            <meta name="description" content={description} />
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
