import React, { useCallback, useRef, useState } from 'react';
import {
    Alert, Box, Button, Card, IconButton, Stack, TextField, Tabs, Tab, Tooltip, Typography,
} from '@mui/material';
import { Image, ContentCopy, Check, Download, UploadFile } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import ServicePageShell from './ServicePageShell';

const DATA_URI_PATTERN = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+)(?:;charset=[^;]+)?;base64,/i;

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Base64 encodes ~4 bytes for every 3 source bytes (3 bytes -> 4 chars). */
function estimateDecodedBytes(base64Length: number): number {
    return Math.floor((base64Length * 3) / 4);
}

const boxSx = {
    p: 1.5,
    borderRadius: '10px',
    bgcolor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)',
};

const ImageBase64Converter: React.FC = () => {
    const [tab, setTab] = useState<'encode' | 'decode'>('encode');

    // Encode mode
    const [encodedUri, setEncodedUri] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
    const [copied, setCopied] = useState(false);
    const [encodeError, setEncodeError] = useState('');

    // Decode mode
    const [pastedInput, setPastedInput] = useState('');
    const [decodedUri, setDecodedUri] = useState<string | null>(null);
    const [decodeError, setDecodeError] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((file: File) => {
        setEncodeError('');
        if (!file.type.startsWith('image/')) {
            setEncodeError('That file does not look like an image.');
            return;
        }
        setSourceFile(file);
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            setEncodedUri(result);
            const img = new window.Image();
            img.onload = () => setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => setImgDims(null);
            img.src = result;
        };
        reader.onerror = () => setEncodeError('Could not read that file.');
        reader.readAsDataURL(file);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const copyEncoded = useCallback(() => {
        if (!encodedUri) return;
        navigator.clipboard.writeText(encodedUri);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    }, [encodedUri]);

    const decodeInput = useCallback((raw: string) => {
        setPastedInput(raw);
        setDecodeError('');
        setDecodedUri(null);

        const trimmed = raw.trim();
        if (trimmed === '') return;

        let uri = trimmed;
        if (!DATA_URI_PATTERN.test(trimmed)) {
            // Bare base64 with no data URI prefix: guess PNG, since that's the
            // most common case, and let image decoding fail loudly if wrong.
            const looksLikeBase64 = /^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 16;
            if (!looksLikeBase64) {
                setDecodeError("That doesn't look like a data URI or base64 string.");
                return;
            }
            uri = `data:image/png;base64,${trimmed.replace(/\s+/g, '')}`;
        }

        const img = new window.Image();
        img.onload = () => setDecodedUri(uri);
        img.onerror = () => setDecodeError('Could not decode this as an image. Check the base64 data and MIME type.');
        img.src = uri;
    }, []);

    const downloadDecoded = useCallback(() => {
        if (!decodedUri) return;
        const match = DATA_URI_PATTERN.exec(decodedUri);
        const mime = match?.[1] ?? 'image/png';
        const ext = mime.split('/')[1]?.split('+')[0] ?? 'png';
        fetch(decodedUri)
            .then((res) => res.blob())
            .then((blob) => saveAs(blob, `decoded-image.${ext}`));
    }, [decodedUri]);

    const encodedBase64Length = encodedUri ? encodedUri.length - (encodedUri.indexOf(',') + 1) : 0;
    const decodedBase64Length = pastedInput ? pastedInput.replace(DATA_URI_PATTERN, '').trim().length : 0;

    const about = 'A data URI embeds a file\'s content directly inside a string, instead of pointing to a separate file, which lets a browser render an image with no extra network request at all. This tool converts an image into that format (and back), entirely client-side: encoding reads the file with the browser\'s FileReader API, decoding renders the base64 text straight into an <img> to verify it is really valid before offering a download. Nothing is ever uploaded anywhere.';

    const howToSteps = [
        { name: 'Encode an image', text: 'Drag an image file in or click to browse. The data URI appears immediately, ready to copy.' },
        { name: 'Or decode one', text: 'Switch to the Decode tab and paste a data URI or raw base64 string to preview and download it as a file.' },
        { name: 'Check the size', text: 'The encoded size is shown alongside the original, since base64 always inflates the file by roughly a third.' },
    ];

    const faq = [
        {
            question: 'When should I actually use a data URI instead of a normal image file?',
            answer: "It's a good fit for small, frequently-reused images where saving one extra HTTP request matters more than the size overhead: a tiny icon, a logo in an email signature (some email clients block external images anyway, so an inline data URI is the only way to guarantee it shows), or a placeholder/blur-up image embedded directly in CSS or HTML. For anything larger than a few KB, or anything that benefits from browser caching across multiple pages, a normal linked file is almost always the better choice.",
        },
        {
            question: 'Why is the encoded version noticeably bigger than the original file?',
            answer: 'Base64 encodes every 3 bytes of the original binary data as 4 ASCII characters, because it has to represent arbitrary binary data using only printable text-safe characters. That fixed 4-for-3 expansion works out to roughly 33% larger than the source file, before compression. Embedding a large image this way both bloats the surrounding HTML/CSS and defeats normal image caching, which is why it is a poor choice for anything but small assets.',
        },
        {
            question: 'Do all browsers support data URIs the same way?',
            answer: 'Support is universal and has been for a very long time across every modern browser, in <img> tags, CSS background-image, and most places a URL is accepted. The practical limits are size-related rather than compatibility-related: some browsers and email clients cap how large a single data URI can be, and Internet Explorer historically had a strict 32KB limit that modern browsers do not share.',
        },
        {
            question: 'Can an SVG be a data URI too?',
            answer: 'Yes, and SVGs are actually one of the best cases for it, since SVG is already text (XML), it can be embedded either as base64 like any other image or, more efficiently, as a URL-encoded plain-text data URI without the base64 overhead at all. This tool base64-encodes everything uniformly for consistency, but for a hand-written SVG specifically, a plain URL-encoded data URI (no base64 step) is usually smaller.',
        },
        {
            question: 'Why does decoding sometimes fail even though I pasted something that looks right?',
            answer: 'The most common causes are a missing or wrong MIME type prefix (the string needs to start with something like data:image/png;base64, for a browser to know what it is), whitespace or line breaks accidentally included in the copied base64 text, or truncated data from a copy that got cut off partway through. This tool actually loads the result into a real image element and reports failure if the browser itself cannot decode it, rather than just checking that the text looks base64-shaped.',
        },
    ];

    return (
        <ServicePageShell
            icon={Image}
            title="Image to Base64 / Data URI Converter"
            subtitle="Convert an image to a base64 data URI and back, entirely in your browser"
            maxWidth="sm"
            toolId={116}
            seoTitle="Image to Base64 Converter - Free Data URI Generator"
            seoDescription="Convert an image to a base64-encoded data URI, or decode a data URI/base64 string back into an image file. Runs entirely client-side, no upload."
            keywords={['image to base64 converter', 'base64 to image converter', 'data uri generator', 'convert image to data url']}
            about={about}
            howToSteps={howToSteps}
            faq={faq}
        >
            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
                overflowY: 'auto',
            }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="fullWidth">
                    <Tab value="encode" label="Encode (image → base64)" />
                    <Tab value="decode" label="Decode (base64 → image)" />
                </Tabs>

                {tab === 'encode' ? (
                    <Stack spacing={2}>
                        <Box
                            onDrop={onDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => fileInputRef.current?.click()}
                            sx={{
                                ...boxSx,
                                py: 4,
                                textAlign: 'center',
                                cursor: 'pointer',
                                border: '1px dashed rgba(255,255,255,0.2)',
                            }}
                        >
                            <UploadFile sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                                Drag an image here, or click to browse
                            </Typography>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                            />
                        </Box>

                        {encodeError && <Alert severity="error">{encodeError}</Alert>}

                        {encodedUri && (
                            <>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Box component="img" src={encodedUri} alt="preview" sx={{ maxWidth: '100%', maxHeight: 200, borderRadius: '10px' }} />
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                    {sourceFile?.name} · {sourceFile ? formatBytes(sourceFile.size) : ''}
                                    {imgDims ? ` · ${imgDims.w}×${imgDims.h}px` : ''} · encoded: {formatBytes(encodedBase64Length)} ({encodedBase64Length > 0 && sourceFile ? `+${Math.round(((encodedBase64Length - sourceFile.size) / sourceFile.size) * 100)}%` : ''})
                                </Typography>
                                <Box sx={{ ...boxSx, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                                    <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0, maxHeight: 150, overflowY: 'auto' }}>
                                        {encodedUri}
                                    </Typography>
                                    <Tooltip title={copied ? 'Copied' : 'Copy'}>
                                        <IconButton size="small" onClick={copyEncoded} sx={{ color: copied ? 'success.main' : 'text.secondary', flexShrink: 0 }}>
                                            {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </>
                        )}
                    </Stack>
                ) : (
                    <Stack spacing={2}>
                        <TextField
                            label="Data URI or raw base64"
                            value={pastedInput}
                            onChange={(e) => decodeInput(e.target.value)}
                            fullWidth
                            multiline
                            minRows={4}
                            inputProps={{ spellCheck: false, style: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                        />

                        {decodeError && <Alert severity="error">{decodeError}</Alert>}

                        {decodedUri && (
                            <>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Box component="img" src={decodedUri} alt="decoded preview" sx={{ maxWidth: '100%', maxHeight: 200, borderRadius: '10px' }} />
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                    ~{formatBytes(estimateDecodedBytes(decodedBase64Length))} decoded
                                </Typography>
                                <Stack direction="row" justifyContent="center">
                                    <Button size="small" variant="contained" startIcon={<Download />} onClick={downloadDecoded}>
                                        Download image
                                    </Button>
                                </Stack>
                            </>
                        )}
                    </Stack>
                )}
            </Card>
        </ServicePageShell>
    );
};

export default ImageBase64Converter;
