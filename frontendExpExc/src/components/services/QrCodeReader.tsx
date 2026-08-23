import React, { useCallback, useRef, useState } from 'react';
import {
    Box, Card, CardContent, Typography, Button, Paper, Alert, Stack,
    Snackbar, useTheme, alpha,
} from '@mui/material';
import { QrCodeScanner, Upload, ContentCopy, OpenInNew } from '@mui/icons-material';
import jsQR from 'jsqr';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * QR decoding.
 *
 * jsQR takes the raw RGBA bytes of a canvas ImageData plus the pixel
 * width/height it corresponds to, so the image first has to be drawn to
 * an off-screen canvas. That same canvas doubles as the preview: when a
 * code is found, its bounding quadrilateral (jsQR's `location` corners)
 * is stroked directly onto it before it's rasterised out as a data URL,
 * so the overlay never needs remapping onto a second, differently-sized
 * element.
 * ------------------------------------------------------------------ */

// Very large photos are downscaled before decoding — jsQR's cost scales
// with pixel count, and a multi-megapixel phone photo decodes just as
// reliably at a more modest resolution.
const MAX_EDGE = 1800;

interface DecodeResult {
    /** Data URL of the (possibly downscaled) image, with the detected
     * code's outline burned in if one was found. */
    previewUrl: string;
    /** Decoded text, or null if no code was found in the image. */
    decoded: string | null;
}

function decodeQr(img: HTMLImageElement, overlayColor: string): DecodeResult {
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas is unavailable in this browser.');

    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });

    if (code && code.data) {
        const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = code.location;
        ctx.strokeStyle = overlayColor;
        ctx.lineWidth = Math.max(3, w / 140);
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(topLeftCorner.x, topLeftCorner.y);
        ctx.lineTo(topRightCorner.x, topRightCorner.y);
        ctx.lineTo(bottomRightCorner.x, bottomRightCorner.y);
        ctx.lineTo(bottomLeftCorner.x, bottomLeftCorner.y);
        ctx.closePath();
        ctx.stroke();
        return { previewUrl: canvas.toDataURL('image/png'), decoded: code.data };
    }

    return { previewUrl: canvas.toDataURL('image/png'), decoded: null };
}

type Status = 'idle' | 'found' | 'not-found';

const QrCodeReader: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const inputRef = useRef<HTMLInputElement>(null);

    const [fileName, setFileName] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [decoded, setDecoded] = useState<string | null>(null);
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState(false);

    const handleFile = useCallback((file: File) => {
        setError(null);
        setStatus('idle');
        setDecoded(null);

        if (!file.type.startsWith('image/')) {
            setError('Please choose an image file.');
            return;
        }

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            try {
                const result = decodeQr(img, theme.palette.success.main);
                setPreviewUrl(result.previewUrl);
                setDecoded(result.decoded);
                setStatus(result.decoded !== null ? 'found' : 'not-found');
                setFileName(file.name);
            } catch {
                setError('Could not process that image.');
            } finally {
                URL.revokeObjectURL(url);
            }
        };
        img.onerror = () => {
            setError('Could not decode that image file — it may be corrupt or in an unsupported format.');
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }, [theme]);

    const handleCopy = useCallback(() => {
        if (!decoded) return;
        navigator.clipboard.writeText(decoded);
        setSnackbar(true);
    }, [decoded]);

    const isUrl = decoded !== null && /^https?:\/\//i.test(decoded.trim());

    return (
        <ServicePageShell
            icon={QrCodeScanner}
            title="QR Code Reader"
            subtitle="Decode a QR code from a photo or screenshot — entirely in your browser"
            maxWidth="sm"
            toolId={70}
            keywords={['qr code reader', 'qr code scanner online', 'decode qr code from image', 'read qr code from photo', 'qr code decoder', 'scan qr code online free']}
            about="This tool decodes QR codes from an uploaded image using jsQR, a pure-JavaScript decoding library that runs entirely inside your browser — the image and whatever text it decodes to are never sent anywhere, so it works even with no network connection. Detection quality depends heavily on the source image: a sharp, well-lit, roughly front-on capture decodes reliably, while heavy blur, glare, a steep angle, or a code that takes up only a tiny corner of the frame can cause it to fail even when a human eye can still read the code fine. It reads standard QR codes (ISO/IEC 18004) only — other 2D formats such as Data Matrix, Aztec and PDF417, and 1D barcodes like UPC/EAN, use different encodings and will not decode here."
            howToSteps={[
                { name: 'Upload an image', text: 'Drop in a photo or screenshot containing a QR code, or click to browse for one. It is processed locally and never uploaded.' },
                { name: 'Let it decode automatically', text: 'The image is scanned the moment it loads — no button to press. If a code is found, its outline is drawn on the image and the decoded text appears below.' },
                { name: 'Copy or open the result', text: 'Copy the decoded text to your clipboard, or if it looks like a web link, open it directly with the Open Link button.' },
            ]}
            faq={[
                { question: 'Is my image or the decoded text uploaded anywhere?', answer: 'No. Decoding happens with the jsQR library running entirely in your browser — the image is read locally and the result never leaves your device.' },
                { question: "Why wasn't a QR code found in my photo?", answer: 'Detection depends on image quality: blur, glare, a steep viewing angle, low resolution, or a code that fills only a small part of the frame can all cause a miss even though the code is visible to your eye. Try cropping in tighter, improving the lighting, or reshooting the photo more directly face-on.' },
                { question: 'Does this also read barcodes?', answer: 'No, only standard QR codes. Other 2D formats like Data Matrix, Aztec and PDF417, and 1D barcodes such as UPC or EAN, use different encodings that jsQR does not read.' },
                { question: 'Is it safe to open a link this decodes?', answer: 'This tool only extracts and displays whatever text was encoded into the QR code — it does not check whether a decoded link is safe. Treat it like any unfamiliar URL: check the domain before opening a link decoded from a QR code you do not trust the source of.' },
            ]}
        >
            <Card>
                <CardContent sx={{ p: 3 }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />

                    <Paper
                        onClick={() => inputRef.current?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                        sx={{
                            p: 4, textAlign: 'center', cursor: 'pointer', borderRadius: 2,
                            border: `1px dashed ${alpha(primary, 0.4)}`,
                            bgcolor: alpha(primary, 0.03),
                            '&:hover': { bgcolor: alpha(primary, 0.07) },
                        }}
                    >
                        <Upload sx={{ fontSize: 36, color: primary, mb: 1 }} />
                        <Typography variant="subtitle1" fontWeight={700}>
                            {fileName || 'Drop an image here, or click to choose'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Processed locally — never uploaded
                        </Typography>
                    </Paper>

                    {previewUrl && (
                        <Box sx={{ mt: 3 }}>
                            <Box
                                component="img"
                                src={previewUrl}
                                alt={fileName}
                                sx={{
                                    maxWidth: '100%', maxHeight: 360, borderRadius: 2, display: 'block',
                                    mx: 'auto', mb: 2, border: `1px solid ${alpha(primary, 0.2)}`,
                                }}
                            />

                            {status === 'found' && decoded !== null && (
                                <>
                                    <Alert severity="success" sx={{ mb: 2 }}>QR code detected</Alert>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                        DECODED TEXT
                                    </Typography>
                                    <Box sx={{
                                        p: 2, mt: 0.5, mb: 2, borderRadius: 2,
                                        bgcolor: alpha(primary, 0.07), border: `1px solid ${alpha(primary, 0.2)}`,
                                        fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all',
                                        userSelect: 'text',
                                    }}>
                                        {decoded}
                                    </Box>
                                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                                        <Button variant="contained" startIcon={<ContentCopy />} onClick={handleCopy}>
                                            Copy
                                        </Button>
                                        {isUrl && (
                                            <Button
                                                component="a"
                                                href={decoded}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                variant="outlined"
                                                startIcon={<OpenInNew />}
                                            >
                                                Open Link
                                            </Button>
                                        )}
                                    </Stack>
                                </>
                            )}

                            {status === 'not-found' && (
                                <Alert severity="warning">
                                    No QR code detected in this image. Try a clearer, closer, more head-on photo of the code.
                                </Alert>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>

            <Snackbar
                open={snackbar}
                autoHideDuration={2000}
                onClose={() => setSnackbar(false)}
                message="Copied to clipboard"
            />
        </ServicePageShell>
    );
};

export default QrCodeReader;
