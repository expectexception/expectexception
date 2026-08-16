import React, { useState, useCallback, useRef } from 'react';
import {
    Box, Card, CardContent, Typography, Button, Alert, Chip, Table, TableBody,
    TableCell, TableRow, TableHead, Divider, Stack, useTheme, alpha, Paper, Link,
} from '@mui/material';
import { PermMedia, Upload, Download, LocationOff, Warning } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* ------------------------------------------------------------------ *
 * EXIF parsing
 *
 * Deliberately hand-rolled rather than pulled from a library: the whole
 * point of this tool is that the photo never leaves the browser, and a
 * dependency-free parser keeps that claim easy to verify. JPEG layout is
 * a marker stream — 0xFFD8 (SOI), then segments of [0xFF, marker, u16
 * length, payload...]. EXIF rides in APP1 (0xFFE1) as "Exif\0\0" followed
 * by a TIFF header and its IFD chain.
 * ------------------------------------------------------------------ */

interface ExifTag {
    label: string;
    value: string;
    group: 'Camera' | 'Capture' | 'Image' | 'Location' | 'Other';
}

const TIFF_TAGS: Record<number, string> = {
    0x010e: 'Description', 0x010f: 'Camera Make', 0x0110: 'Camera Model',
    0x0112: 'Orientation', 0x011a: 'X Resolution', 0x011b: 'Y Resolution',
    0x0131: 'Software', 0x0132: 'Date/Time', 0x013b: 'Artist',
    0x8298: 'Copyright', 0x0100: 'Image Width', 0x0101: 'Image Height',
};

const EXIF_TAGS: Record<number, string> = {
    0x829a: 'Exposure Time', 0x829d: 'F Number', 0x8827: 'ISO',
    0x9003: 'Date Taken', 0x9004: 'Date Digitized', 0x9201: 'Shutter Speed',
    0x9202: 'Aperture', 0x9204: 'Exposure Bias', 0x9207: 'Metering Mode',
    0x9209: 'Flash', 0x920a: 'Focal Length', 0xa402: 'Exposure Mode',
    0xa403: 'White Balance', 0xa406: 'Scene Type', 0xa002: 'Pixel X Dimension',
    0xa003: 'Pixel Y Dimension', 0x9286: 'User Comment', 0xa430: 'Camera Owner',
    0xa433: 'Lens Make', 0xa434: 'Lens Model', 0xa435: 'Lens Serial',
    0xc62f: 'Body Serial',
};

const GPS_TAGS: Record<number, string> = {
    0x0000: 'GPS Version', 0x0001: 'Latitude Ref', 0x0002: 'Latitude',
    0x0003: 'Longitude Ref', 0x0004: 'Longitude', 0x0005: 'Altitude Ref',
    0x0006: 'Altitude', 0x0007: 'GPS Time', 0x0012: 'Map Datum',
    0x001d: 'GPS Date',
};

/** Bytes per component, indexed by the TIFF type code. */
const TYPE_SIZES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

interface RawEntry {
    tag: number;
    type: number;
    values: (number | string)[];
}

function readEntryValues(view: DataView, tiffStart: number, entryOffset: number, little: boolean): RawEntry | null {
    const tag = view.getUint16(entryOffset, little);
    const type = view.getUint16(entryOffset + 2, little);
    const count = view.getUint32(entryOffset + 4, little);
    const size = TYPE_SIZES[type];
    if (!size || count > 4096) return null;

    const total = size * count;
    // Values up to 4 bytes are stored inline in the entry; anything larger is
    // stored elsewhere in the TIFF block and referenced by offset.
    const valueOffset = total <= 4 ? entryOffset + 8 : tiffStart + view.getUint32(entryOffset + 8, little);
    if (valueOffset + total > view.byteLength) return null;

    const values: (number | string)[] = [];
    if (type === 2) {
        let str = '';
        for (let i = 0; i < count; i++) {
            const c = view.getUint8(valueOffset + i);
            if (c === 0) break;
            str += String.fromCharCode(c);
        }
        values.push(str.trim());
    } else {
        for (let i = 0; i < count; i++) {
            const at = valueOffset + i * size;
            switch (type) {
                case 1: case 7: values.push(view.getUint8(at)); break;
                case 3: values.push(view.getUint16(at, little)); break;
                case 4: values.push(view.getUint32(at, little)); break;
                case 6: values.push(view.getInt8(at)); break;
                case 8: values.push(view.getInt16(at, little)); break;
                case 9: values.push(view.getInt32(at, little)); break;
                case 5: {
                    const n = view.getUint32(at, little), d = view.getUint32(at + 4, little);
                    values.push(d === 0 ? 0 : n / d);
                    break;
                }
                case 10: {
                    const n = view.getInt32(at, little), d = view.getInt32(at + 4, little);
                    values.push(d === 0 ? 0 : n / d);
                    break;
                }
                default: values.push(view.getUint8(at));
            }
        }
    }
    return { tag, type, values };
}

function readIfd(view: DataView, tiffStart: number, ifdOffset: number, little: boolean): RawEntry[] {
    const entries: RawEntry[] = [];
    if (ifdOffset + 2 > view.byteLength) return entries;
    const count = view.getUint16(ifdOffset, little);
    if (count > 512) return entries;
    for (let i = 0; i < count; i++) {
        const entry = readEntryValues(view, tiffStart, ifdOffset + 2 + i * 12, little);
        if (entry) entries.push(entry);
    }
    return entries;
}

/** Turn the GPS IFD's [deg, min, sec] rationals plus a N/S/E/W ref into a
 * single signed decimal degree, which is what a map link needs. */
function toDecimalDegrees(parts: (number | string)[], ref: string): number | null {
    if (parts.length < 3) return null;
    const [d, m, s] = parts.map(Number);
    if ([d, m, s].some(n => Number.isNaN(n))) return null;
    const sign = ref === 'S' || ref === 'W' ? -1 : 1;
    return sign * (d + m / 60 + s / 3600);
}

interface ParseResult {
    tags: ExifTag[];
    coords: { lat: number; lon: number } | null;
    hasExif: boolean;
}

function parseExif(buffer: ArrayBuffer): ParseResult {
    const view = new DataView(buffer);
    const empty: ParseResult = { tags: [], coords: null, hasExif: false };

    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return empty;

    // Walk the marker chain looking for APP1/Exif.
    let offset = 2;
    let tiffStart = -1;
    while (offset + 4 < view.byteLength) {
        if (view.getUint8(offset) !== 0xff) break;
        const marker = view.getUint8(offset + 1);
        if (marker === 0xda) break; // start of scan — pixel data follows
        const length = view.getUint16(offset + 2);
        if (marker === 0xe1 && offset + 10 < view.byteLength) {
            let sig = '';
            for (let i = 0; i < 4; i++) sig += String.fromCharCode(view.getUint8(offset + 4 + i));
            if (sig === 'Exif') { tiffStart = offset + 10; break; }
        }
        offset += 2 + length;
    }
    if (tiffStart < 0 || tiffStart + 8 > view.byteLength) return empty;

    const byteOrder = view.getUint16(tiffStart);
    if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return empty;
    const little = byteOrder === 0x4949;
    if (view.getUint16(tiffStart + 2, little) !== 42) return empty;

    const ifd0Offset = tiffStart + view.getUint32(tiffStart + 4, little);
    const ifd0 = readIfd(view, tiffStart, ifd0Offset, little);

    const tags: ExifTag[] = [];
    let exifIfdOffset = 0;
    let gpsIfdOffset = 0;

    const push = (label: string, value: string, group: ExifTag['group']) => {
        if (value !== '' && value !== undefined) tags.push({ label, value, group });
    };

    for (const e of ifd0) {
        if (e.tag === 0x8769) { exifIfdOffset = Number(e.values[0]); continue; }
        if (e.tag === 0x8825) { gpsIfdOffset = Number(e.values[0]); continue; }
        const label = TIFF_TAGS[e.tag];
        if (label) {
            const group = label.startsWith('Camera') || label === 'Software' ? 'Camera' : 'Image';
            push(label, String(e.values.join(', ')), group);
        }
    }

    if (exifIfdOffset) {
        for (const e of readIfd(view, tiffStart, tiffStart + exifIfdOffset, little)) {
            const label = EXIF_TAGS[e.tag];
            if (!label) continue;
            let value = String(e.values.join(', '));
            // A few values are far more readable in their conventional form.
            if (e.tag === 0x829a && typeof e.values[0] === 'number' && e.values[0] > 0 && e.values[0] < 1) {
                value = `1/${Math.round(1 / (e.values[0] as number))} s`;
            } else if (e.tag === 0x829d) value = `f/${value}`;
            else if (e.tag === 0x920a) value = `${value} mm`;
            push(label, value, 'Capture');
        }
    }

    let coords: { lat: number; lon: number } | null = null;
    if (gpsIfdOffset) {
        const gps = readIfd(view, tiffStart, tiffStart + gpsIfdOffset, little);
        const byTag = new Map(gps.map(e => [e.tag, e]));
        for (const e of gps) {
            const label = GPS_TAGS[e.tag];
            if (label) push(label, String(e.values.join(', ')), 'Location');
        }
        const latEntry = byTag.get(0x0002), lonEntry = byTag.get(0x0004);
        const latRef = String(byTag.get(0x0001)?.values[0] ?? 'N');
        const lonRef = String(byTag.get(0x0003)?.values[0] ?? 'E');
        if (latEntry && lonEntry) {
            const lat = toDecimalDegrees(latEntry.values, latRef);
            const lon = toDecimalDegrees(lonEntry.values, lonRef);
            if (lat !== null && lon !== null) coords = { lat, lon };
        }
    }

    return { tags, coords, hasExif: tags.length > 0 };
}

/** Rebuild the JPEG without APP1..APPn (EXIF/XMP/IPTC vendor blocks).
 *
 * Segments are copied verbatim, so this strips metadata without re-encoding
 * — the image pixels come out bit-identical rather than being recompressed
 * and losing quality, which is what re-drawing via <canvas> would do. */
function stripMetadata(buffer: ArrayBuffer): Blob | null {
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

    const bytes = new Uint8Array(buffer);
    const keep: Uint8Array[] = [bytes.subarray(0, 2)];
    let offset = 2;

    while (offset + 4 <= view.byteLength) {
        if (view.getUint8(offset) !== 0xff) break;
        const marker = view.getUint8(offset + 1);
        if (marker === 0xda) {
            // Scan segment: everything from here to the end is entropy-coded
            // image data, so copy the remainder untouched.
            keep.push(bytes.subarray(offset));
            offset = view.byteLength;
            break;
        }
        const length = view.getUint16(offset + 2);
        const end = offset + 2 + length;
        const isAppSegment = marker >= 0xe0 && marker <= 0xef;
        const isComment = marker === 0xfe;
        if (!isAppSegment && !isComment) keep.push(bytes.subarray(offset, end));
        offset = end;
    }

    return new Blob(keep as BlobPart[], { type: 'image/jpeg' });
}

const GROUP_ORDER: ExifTag['group'][] = ['Location', 'Camera', 'Capture', 'Image', 'Other'];

const ExifViewer: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const inputRef = useRef<HTMLInputElement>(null);

    const [fileName, setFileName] = useState('');
    const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
    const [result, setResult] = useState<ParseResult | null>(null);
    const [preview, setPreview] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const handleFile = useCallback(async (file: File) => {
        setError(null);
        if (!/jpe?g$/i.test(file.name) && file.type !== 'image/jpeg') {
            setError('EXIF data lives in JPEG files — pick a .jpg or .jpeg photo.');
            return;
        }
        try {
            const buf = await file.arrayBuffer();
            setBuffer(buf);
            setFileName(file.name);
            setResult(parseExif(buf));
            setPreview(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return URL.createObjectURL(file);
            });
        } catch {
            setError('Could not read that file.');
        }
    }, []);

    const handleDownloadClean = useCallback(() => {
        if (!buffer) return;
        const blob = stripMetadata(buffer);
        if (!blob) { setError('Could not rewrite this file.'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace(/(\.jpe?g)$/i, '-clean$1') || 'clean.jpg';
        a.click();
        URL.revokeObjectURL(url);
    }, [buffer, fileName]);

    const grouped = GROUP_ORDER
        .map(group => ({ group, items: (result?.tags || []).filter(t => t.group === group) }))
        .filter(g => g.items.length > 0);

    return (
        <ServicePageShell
            icon={PermMedia}
            title="EXIF Metadata Viewer & Stripper"
            subtitle="Inspect the hidden data in your photos — and remove it before you share"
            maxWidth="md"
            seoTitle="EXIF Viewer & Remover | See and Strip Photo Metadata Online"
            seoDescription="View the EXIF metadata hidden in a JPEG — camera, lens, serial number, timestamps and GPS location — then download a copy with all of it removed. Runs entirely in your browser; the photo is never uploaded."
            toolId={62}
            keywords={['exif viewer', 'remove exif data', 'strip photo metadata', 'check photo gps location', 'exif remover online', 'photo metadata viewer', 'delete exif from jpeg', 'privacy photo metadata']}
            about="Photos carry far more than pixels. A JPEG straight from a phone or camera usually records the exact GPS coordinates where it was taken, the date and time, the camera and lens, and often a hardware serial number — all invisible in any normal image viewer. This tool decodes that block and shows you exactly what is in there, then hands back a copy with every metadata segment removed. Both the reading and the stripping happen inside your browser using the File API; the image is never uploaded, which is rather the point for a privacy tool. Stripping copies the compressed image data across untouched, so the cleaned photo is not re-encoded and loses no quality."
            howToSteps={[
                { name: 'Choose a JPEG', text: 'Select a photo from your device. It stays in your browser — nothing is uploaded to a server.' },
                { name: 'Review the metadata', text: 'Read the decoded tags, grouped by camera, capture settings, image and location. Any GPS coordinates are highlighted with a map link.' },
                { name: 'Download a clean copy', text: 'Click "Download stripped copy" to save the same image with every EXIF, XMP and comment segment removed.' },
            ]}
            faq={[
                { question: 'Is my photo uploaded anywhere?', answer: 'No. The file is read locally with the browser File API and parsed in JavaScript on your machine. Nothing is transmitted, which is why this tool also works with no network connection.' },
                { question: 'Does stripping metadata reduce image quality?', answer: 'No. The JPEG is rebuilt by copying its compressed scan data verbatim and dropping only the metadata segments. The pixels are bit-for-bit identical to the original — unlike re-saving through a canvas, which would recompress and degrade the image.' },
                { question: 'Why does my photo show no EXIF data?', answer: 'Many services strip it on upload, so an image saved from social media or a messaging app usually has none left. Screenshots and images exported by editors also often carry nothing.' },
                { question: 'Does this work on PNG or HEIC files?', answer: 'Not currently. EXIF is most commonly carried in JPEG, which is what this parser reads. PNG stores metadata in different chunk types and HEIC uses a different container format.' },
            ]}
        >
            <Card>
                <CardContent sx={{ p: 3 }}>
                    {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,.jpg,.jpeg"
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
                            {fileName || 'Drop a JPEG here, or click to choose'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Processed entirely in your browser — never uploaded
                        </Typography>
                    </Paper>

                    {result && (
                        <Box sx={{ mt: 3 }}>
                            {preview && (
                                <Box
                                    component="img"
                                    src={preview}
                                    alt={fileName}
                                    sx={{ maxWidth: '100%', maxHeight: 220, borderRadius: 2, display: 'block', mx: 'auto', mb: 2 }}
                                />
                            )}

                            {result.coords && (
                                <Alert severity="error" icon={<Warning />} sx={{ mb: 2 }}>
                                    <Typography variant="body2" fontWeight={700}>
                                        This photo reveals where it was taken
                                    </Typography>
                                    <Typography variant="body2">
                                        {result.coords.lat.toFixed(6)}, {result.coords.lon.toFixed(6)}{' '}
                                        <Link
                                            href={`https://www.openstreetmap.org/?mlat=${result.coords.lat}&mlon=${result.coords.lon}#map=16/${result.coords.lat}/${result.coords.lon}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            view on map
                                        </Link>
                                    </Typography>
                                </Alert>
                            )}

                            {!result.hasExif && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    No EXIF metadata found — this image is already clean.
                                </Alert>
                            )}

                            {grouped.map(({ group, items }) => (
                                <Box key={group} sx={{ mb: 2.5 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                        {group === 'Location' && <LocationOff sx={{ fontSize: 18, color: theme.palette.error.main }} />}
                                        <Typography variant="subtitle2" fontWeight={800}>{group}</Typography>
                                        <Chip label={items.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                                    </Stack>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700, width: '40%' }}>Tag</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Value</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {items.map((t, i) => (
                                                <TableRow key={`${t.label}-${i}`}>
                                                    <TableCell sx={{ color: 'text.secondary' }}>{t.label}</TableCell>
                                                    <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>{t.value}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            ))}

                            <Divider sx={{ my: 2 }} />
                            <Button
                                variant="contained"
                                startIcon={<Download />}
                                onClick={handleDownloadClean}
                                fullWidth
                            >
                                Download stripped copy
                            </Button>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                                Removes all EXIF, XMP and comment segments without re-encoding the image.
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default ExifViewer;
