import React, { useMemo, useState } from 'react';
import { Card, CardContent, Box, Typography, TextField, Button, Grid, Chip, Alert, Stack, useTheme, alpha } from '@mui/material';
import { Colorize, ContentCopy } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/** The 147 CSS3 extended color keywords (the standard named-color list used
 * by every modern browser), name -> hex. Embedded directly since it's a
 * fixed, well-documented reference table rather than something worth
 * fetching. */
const CSS_COLORS: Record<string, string> = {
    aliceblue: '#F0F8FF', antiquewhite: '#FAEBD7', aqua: '#00FFFF', aquamarine: '#7FFFD4', azure: '#F0FFFF',
    beige: '#F5F5DC', bisque: '#FFE4C4', black: '#000000', blanchedalmond: '#FFEBCD', blue: '#0000FF',
    blueviolet: '#8A2BE2', brown: '#A52A2A', burlywood: '#DEB887', cadetblue: '#5F9EA0', chartreuse: '#7FFF00',
    chocolate: '#D2691E', coral: '#FF7F50', cornflowerblue: '#6495ED', cornsilk: '#FFF8DC', crimson: '#DC143C',
    cyan: '#00FFFF', darkblue: '#00008B', darkcyan: '#008B8B', darkgoldenrod: '#B8860B', darkgray: '#A9A9A9',
    darkgreen: '#006400', darkgrey: '#A9A9A9', darkkhaki: '#BDB76B', darkmagenta: '#8B008B', darkolivegreen: '#556B2F',
    darkorange: '#FF8C00', darkorchid: '#9932CC', darkred: '#8B0000', darksalmon: '#E9967A', darkseagreen: '#8FBC8F',
    darkslateblue: '#483D8B', darkslategray: '#2F4F4F', darkslategrey: '#2F4F4F', darkturquoise: '#00CED1', darkviolet: '#9400D3',
    deeppink: '#FF1493', deepskyblue: '#00BFFF', dimgray: '#696969', dimgrey: '#696969', dodgerblue: '#1E90FF',
    firebrick: '#B22222', floralwhite: '#FFFAF0', forestgreen: '#228B22', fuchsia: '#FF00FF', gainsboro: '#DCDCDC',
    ghostwhite: '#F8F8FF', gold: '#FFD700', goldenrod: '#DAA520', gray: '#808080', green: '#008000',
    greenyellow: '#ADFF2F', grey: '#808080', honeydew: '#F0FFF0', hotpink: '#FF69B4', indianred: '#CD5C5C',
    indigo: '#4B0082', ivory: '#FFFFF0', khaki: '#F0E68C', lavender: '#E6E6FA', lavenderblush: '#FFF0F5',
    lawngreen: '#7CFC00', lemonchiffon: '#FFFACD', lightblue: '#ADD8E6', lightcoral: '#F08080', lightcyan: '#E0FFFF',
    lightgoldenrodyellow: '#FAFAD2', lightgray: '#D3D3D3', lightgreen: '#90EE90', lightgrey: '#D3D3D3', lightpink: '#FFB6C1',
    lightsalmon: '#FFA07A', lightseagreen: '#20B2AA', lightskyblue: '#87CEFA', lightslategray: '#778899', lightslategrey: '#778899',
    lightsteelblue: '#B0C4DE', lightyellow: '#FFFFE0', lime: '#00FF00', limegreen: '#32CD32', linen: '#FAF0E6',
    magenta: '#FF00FF', maroon: '#800000', mediumaquamarine: '#66CDAA', mediumblue: '#0000CD', mediumorchid: '#BA55D3',
    mediumpurple: '#9370DB', mediumseagreen: '#3CB371', mediumslateblue: '#7B68EE', mediumspringgreen: '#00FA9A', mediumturquoise: '#48D1CC',
    mediumvioletred: '#C71585', midnightblue: '#191970', mintcream: '#F5FFFA', mistyrose: '#FFE4E1', moccasin: '#FFE4B5',
    navajowhite: '#FFDEAD', navy: '#000080', oldlace: '#FDF5E6', olive: '#808000', olivedrab: '#6B8E23',
    orange: '#FFA500', orangered: '#FF4500', orchid: '#DA70D6', palegoldenrod: '#EEE8AA', palegreen: '#98FB98',
    paleturquoise: '#AFEEEE', palevioletred: '#DB7093', papayawhip: '#FFEFD5', peachpuff: '#FFDAB9', peru: '#CD853F',
    pink: '#FFC0CB', plum: '#DDA0DD', powderblue: '#B0E0E6', purple: '#800080', rebeccapurple: '#663399',
    red: '#FF0000', rosybrown: '#BC8F8F', royalblue: '#4169E1', saddlebrown: '#8B4513', salmon: '#FA8072',
    sandybrown: '#F4A460', seagreen: '#2E8B57', seashell: '#FFF5EE', sienna: '#A0522D', silver: '#C0C0C0',
    skyblue: '#87CEEB', slateblue: '#6A5ACD', slategray: '#708090', slategrey: '#708090', snow: '#FFFAFA',
    springgreen: '#00FF7F', steelblue: '#4682B4', tan: '#D2B48C', teal: '#008080', thistle: '#D8BFD8',
    tomato: '#FF6347', turquoise: '#40E0D0', violet: '#EE82EE', wheat: '#F5DEB3', white: '#FFFFFF',
    whitesmoke: '#F5F5F5', yellow: '#FFFF00', yellowgreen: '#9ACD32',
};

interface Rgb { r: number; g: number; b: number; }

const EXAMPLES = ['#3b82f6', 'rgb(255, 99, 71)', 'hsl(280, 60%, 55%)', '#6495ed', 'rebeccapurple'];

const hexToRgb = (hex: string): Rgb | null => {
    let m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (m) {
        const n = parseInt(m[1], 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    m = /^#?([0-9a-f]{3})$/i.exec(hex.trim());
    if (m) {
        const [r, g, b] = m[1].split('').map(c => parseInt(c + c, 16));
        return { r, g, b };
    }
    return null;
};

const hslToRgb = (h: number, s: number, l: number): Rgb => {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
};

/** Parses hex (#rgb / #rrggbb), rgb()/rgba(), hsl()/hsla(), or a bare CSS
 * color keyword into an {r,g,b} triple, or null if nothing matches. */
const parseColorInput = (input: string): Rgb | null => {
    const s = input.trim().toLowerCase();
    if (!s) return null;

    const named = CSS_COLORS[s];
    if (named) return hexToRgb(named);

    const hex = hexToRgb(s);
    if (hex) return hex;

    let m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/.exec(s);
    if (m) return { r: Math.min(255, +m[1]), g: Math.min(255, +m[2]), b: Math.min(255, +m[3]) };

    m = /^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*[\d.]+\s*)?\)$/.exec(s);
    if (m) return hslToRgb(+m[1], +m[2] / 100, +m[3] / 100);

    return null;
};

const rgbToHex = ({ r, g, b }: Rgb): string =>
    `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

const distance = (a: Rgb, b: Rgb): number =>
    Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

const MAX_DISTANCE = Math.sqrt(3 * 255 ** 2);

const closenessLabel = (d: number): string => {
    if (d === 0) return 'Exact match';
    if (d < 15) return 'Extremely close';
    if (d < 40) return 'Very close';
    if (d < 80) return 'Somewhat close';
    if (d < 150) return 'Loosely similar';
    return 'Quite different';
};

const findNearestColor = (rgb: Rgb): { name: string; hex: string; distance: number } => {
    let best = { name: '', hex: '', distance: Infinity };
    for (const [name, hex] of Object.entries(CSS_COLORS)) {
        const d = distance(rgb, hexToRgb(hex)!);
        if (d < best.distance) best = { name, hex, distance: d };
    }
    return best;
};

const ColorNameFinder: React.FC = () => {
    const theme = useTheme();
    const primary = theme.palette.primary.main;
    const [input, setInput] = useState('#3b82f6');

    const rgb = useMemo(() => parseColorInput(input), [input]);
    const match = useMemo(() => (rgb ? findNearestColor(rgb) : null), [rgb]);

    const copy = (text: string) => navigator.clipboard.writeText(text);

    return (
        <ServicePageShell
            toolId={61}
            icon={Colorize}
            title="Color Name Finder"
            subtitle="Find the closest standard CSS color name for any hex, RGB, or HSL color - matched entirely in your browser."
            maxWidth="md"
            seoTitle="Color Name Finder - Nearest CSS Color Name Matcher"
            keywords={['color name finder', 'nearest css color', 'css color names list', 'hex to color name', 'rgb to color name', 'what color is this hex code']}
            about="Takes any color you enter - a hex code, an rgb()/rgba() value, an hsl()/hsla() value, or even a bare CSS keyword - and finds the closest match among the 147 standard CSS3 extended color keywords (the same named-color list every modern browser recognizes, from aliceblue to yellowgreen). Matching works by converting both colors to RGB and measuring the Euclidean distance between their red, green, and blue components; the smaller the distance, the closer the match. Both your input color and the matched named color are shown as swatches side by side along with the numeric distance, so you can judge at a glance whether the match is essentially exact or just the closest available name. Everything - parsing, distance calculation, and swatch rendering - runs locally in the browser."
            howToSteps={[
                { name: 'Enter a color', text: 'Type a hex code (#3b82f6), an rgb()/rgba() value, an hsl()/hsla() value, or use the color picker.' },
                { name: 'Or pick visually', text: 'Click the color swatch/picker to choose a color visually instead of typing one.' },
                { name: 'Read the match', text: 'The nearest named CSS color appears with its own swatch next to yours, along with the numeric RGB distance between them.' },
                { name: 'Judge the closeness', text: 'A distance of 0 means an exact match; the label under the distance (e.g. "Very close" vs. "Quite different") gives a quick read on how good the match really is.' },
            ]}
            faq={[
                { question: 'Where does the list of color names come from?', answer: 'The 147 CSS3 extended color keywords - the standard named-color list defined by the CSS Color spec and supported by every modern browser, from common names like red and cornflowerblue to less common ones like rebeccapurple and papayawhip.' },
                { question: 'How is the "closest" color determined?', answer: 'By Euclidean distance in RGB space: both colors are converted to red/green/blue components (0-255 each) and the straight-line distance between the two points is calculated. It is a simple, fast approximation of color similarity rather than a perceptual color-difference model, so very occasionally the nearest match by the numbers may not be the one a human eye would pick.' },
                { question: 'What input formats are accepted?', answer: 'Hex (#3b82f6 or the 3-digit shorthand #36f), rgb()/rgba(), hsl()/hsla(), and bare CSS color keywords (e.g. typing "tomato" is valid input too) - or just use the native color picker.' },
                { question: 'Is my color sent anywhere to find a match?', answer: 'No - the color list is embedded directly in the page and every calculation happens locally in your browser; nothing is uploaded.' },
            ]}
        >
            <Card sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>Enter a Color</Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1.5 }}>
                        <input
                            type="color"
                            value={rgb ? rgbToHex(rgb) : '#000000'}
                            onChange={e => setInput(e.target.value)}
                            style={{ width: 56, height: 56, cursor: 'pointer', border: 'none', borderRadius: 8, flexShrink: 0 }}
                        />
                        <TextField
                            fullWidth
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="#3b82f6, rgb(59,130,246), hsl(217,91%,60%), tomato..."
                            inputProps={{ style: { fontFamily: 'monospace' } }}
                        />
                    </Box>

                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
                        {EXAMPLES.map(ex => (
                            <Chip key={ex} label={ex} size="small" onClick={() => setInput(ex)} variant="outlined" sx={{ cursor: 'pointer', fontFamily: 'monospace' }} />
                        ))}
                    </Stack>

                    {!rgb && (
                        <Alert severity="error">Enter a valid hex, rgb(), hsl(), or CSS color name.</Alert>
                    )}

                    {rgb && match && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" fontWeight="700" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                    Your Color
                                </Typography>
                                <Box sx={{ height: 100, borderRadius: 2, bgcolor: rgbToHex(rgb), border: '1px solid rgba(255,255,255,0.1)', mb: 1 }} />
                                <Typography variant="body2" fontFamily="monospace">{rgbToHex(rgb)}</Typography>
                                <Typography variant="caption" color="text.secondary">rgb({rgb.r}, {rgb.g}, {rgb.b})</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" fontWeight="700" color={primary} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                    Nearest Named Color
                                </Typography>
                                <Box sx={{ height: 100, borderRadius: 2, bgcolor: match.hex, border: '1px solid rgba(255,255,255,0.1)', mb: 1 }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" fontWeight={700}>{match.name}</Typography>
                                    <Button size="small" startIcon={<ContentCopy />} onClick={() => copy(match.name)}>Copy</Button>
                                </Box>
                                <Typography variant="caption" color="text.secondary">{match.hex}</Typography>
                            </Grid>

                            <Grid item xs={12}>
                                <Box sx={{ mt: 1, p: 2, borderRadius: 2, bgcolor: alpha(primary, 0.06), border: `1px solid ${alpha(primary, 0.2)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                    <Box>
                                        <Typography variant="caption" fontWeight="700" color={primary} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
                                            RGB Distance
                                        </Typography>
                                        <Typography variant="h6" fontWeight={800}>{match.distance.toFixed(1)} <Typography component="span" variant="caption" color="text.secondary">/ {MAX_DISTANCE.toFixed(0)} max</Typography></Typography>
                                    </Box>
                                    <Chip label={closenessLabel(match.distance)} sx={{ bgcolor: alpha(primary, 0.15), color: primary, fontWeight: 700 }} />
                                </Box>
                            </Grid>
                        </Grid>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default ColorNameFinder;
