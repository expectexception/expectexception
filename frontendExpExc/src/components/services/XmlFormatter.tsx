import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Card, FormControl, FormControlLabel, InputLabel, MenuItem,
    Select, Snackbar, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { ChevronRight, Code, ContentCopy, ExpandMore } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

type ViewMode = 'formatted' | 'minified' | 'tree';

/* DOMParser is the same well-formedness checker a browser uses to load a
 * real XML document, so anything that formats cleanly here parses the same
 * way everywhere else. It only enforces well-formedness (matched tags, one
 * root, quoted attributes, escaped special characters) - not a schema, DTD
 * or XSD, which is a different and much larger problem. */

function escapeXmlText(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeXmlAttr(text: string): string {
    return escapeXmlText(text).replace(/"/g, '&quot;');
}

/** True for a text node that holds nothing but formatting whitespace - the
 * indentation between sibling tags that pretty-printing already re-creates,
 * as opposed to genuine text content. */
function isBlankText(node: ChildNode): boolean {
    return node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim() === '';
}

function serializeDoctype(doctype: DocumentType): string {
    let out = `<!DOCTYPE ${doctype.name}`;
    if (doctype.publicId) {
        out += ` PUBLIC "${doctype.publicId}"${doctype.systemId ? ` "${doctype.systemId}"` : ''}`;
    } else if (doctype.systemId) {
        out += ` SYSTEM "${doctype.systemId}"`;
    }
    return `${out}>`;
}

function serializeAttrs(el: Element): string {
    return Array.from(el.attributes).map((a) => ` ${a.name}="${escapeXmlAttr(a.value)}"`).join('');
}

/** Pretty-prints one node and everything under it. An element whose only
 * meaningful child is a single text or CDATA node is kept on one line
 * (`<price>44.95</price>`); anything with element children is broken out
 * with one child per line and re-indented by `depth`. */
function serializeFormatted(node: ChildNode, indentSize: number, selfClosingEmpty: boolean, depth: number): string {
    const pad = ' '.repeat(depth * indentSize);

    if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const attrs = serializeAttrs(el);
        const meaningful = Array.from(el.childNodes).filter((c) => !isBlankText(c));

        if (meaningful.length === 0) {
            return selfClosingEmpty ? `${pad}<${el.tagName}${attrs}/>` : `${pad}<${el.tagName}${attrs}></${el.tagName}>`;
        }
        if (meaningful.length === 1 && meaningful[0].nodeType === Node.TEXT_NODE) {
            const text = escapeXmlText((meaningful[0].textContent || '').trim());
            return `${pad}<${el.tagName}${attrs}>${text}</${el.tagName}>`;
        }
        if (meaningful.length === 1 && meaningful[0].nodeType === Node.CDATA_SECTION_NODE) {
            return `${pad}<${el.tagName}${attrs}><![CDATA[${meaningful[0].textContent || ''}]]></${el.tagName}>`;
        }

        const inner = meaningful.map((c) => serializeFormatted(c, indentSize, selfClosingEmpty, depth + 1)).join('\n');
        return `${pad}<${el.tagName}${attrs}>\n${inner}\n${pad}</${el.tagName}>`;
    }

    if (node.nodeType === Node.CDATA_SECTION_NODE) return `${pad}<![CDATA[${node.textContent || ''}]]>`;
    if (node.nodeType === Node.COMMENT_NODE) return `${pad}<!--${node.textContent || ''}-->`;
    if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
        const pi = node as ProcessingInstruction;
        return `${pad}<?${pi.target} ${pi.data}?>`;
    }
    return `${pad}${escapeXmlText((node.textContent || '').trim())}`;
}

function serializeMinified(node: ChildNode, selfClosingEmpty: boolean): string {
    if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const attrs = serializeAttrs(el);
        const meaningful = Array.from(el.childNodes).filter((c) => !isBlankText(c));

        if (meaningful.length === 0) {
            return selfClosingEmpty ? `<${el.tagName}${attrs}/>` : `<${el.tagName}${attrs}></${el.tagName}>`;
        }
        const inner = meaningful.map((c) => serializeMinified(c, selfClosingEmpty)).join('');
        return `<${el.tagName}${attrs}>${inner}</${el.tagName}>`;
    }

    if (node.nodeType === Node.CDATA_SECTION_NODE) return `<![CDATA[${node.textContent || ''}]]>`;
    if (node.nodeType === Node.COMMENT_NODE) return `<!--${node.textContent || ''}-->`;
    if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
        const pi = node as ProcessingInstruction;
        return `<?${pi.target} ${pi.data}?>`;
    }
    return escapeXmlText((node.textContent || '').trim());
}

/** Top-level document nodes worth keeping: the doctype, and any comment,
 * processing instruction or the root element itself. A stray text node at
 * document level is never meaningful XML, so it is simply skipped. */
function topLevelNodes(doc: Document): ChildNode[] {
    return Array.from(doc.childNodes).filter((n) => (
        n.nodeType === Node.DOCUMENT_TYPE_NODE
        || n.nodeType === Node.COMMENT_NODE
        || n.nodeType === Node.PROCESSING_INSTRUCTION_NODE
        || n.nodeType === Node.ELEMENT_NODE
    ));
}

function formatDocument(doc: Document, declaration: string | null, indentSize: number, selfClosingEmpty: boolean): string {
    const parts: string[] = [];
    if (declaration) parts.push(declaration);
    topLevelNodes(doc).forEach((node) => {
        parts.push(node.nodeType === Node.DOCUMENT_TYPE_NODE
            ? serializeDoctype(node as DocumentType)
            : serializeFormatted(node, indentSize, selfClosingEmpty, 0));
    });
    return parts.join('\n');
}

function minifyDocument(doc: Document, declaration: string | null, selfClosingEmpty: boolean): string {
    const parts: string[] = [];
    if (declaration) parts.push(declaration);
    topLevelNodes(doc).forEach((node) => {
        parts.push(node.nodeType === Node.DOCUMENT_TYPE_NODE
            ? serializeDoctype(node as DocumentType)
            : serializeMinified(node, selfClosingEmpty));
    });
    return parts.join('');
}

/** Chrome and Firefox both signal a parse failure by embedding a
 * `<parsererror>` element in the returned document, but they phrase the
 * message differently. This pulls a line/column out of either phrasing when
 * present, and falls back to the raw message, or a generic one, otherwise. */
function extractParseError(doc: Document): string | null {
    const errorEl = doc.getElementsByTagName('parsererror')[0];
    if (!errorEl) return null;

    const raw = (errorEl.textContent || '').trim();
    const lineMatch = /line[:\s]+(\d+)/i.exec(raw);
    const colMatch = /column[:\s]+(\d+)/i.exec(raw);
    if (lineMatch) {
        const nonEmptyLines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
        const reasonLine = nonEmptyLines[nonEmptyLines.length - 1] || raw;
        const reason = reasonLine.replace(/^error\s*[:\-]?\s*/i, '');
        return colMatch ? `Line ${lineMatch[1]}, column ${colMatch[1]}: ${reason}` : `Line ${lineMatch[1]}: ${reason}`;
    }
    return raw || 'The XML could not be parsed.';
}

interface ParsedXml {
    doc: Document | null;
    declaration: string | null;
    error: string | null;
}

function parseXml(input: string): ParsedXml {
    if (input.trim() === '') return { doc: null, declaration: null, error: null };

    const doc = new DOMParser().parseFromString(input, 'application/xml');
    const error = extractParseError(doc);
    if (error) return { doc: null, declaration: null, error };
    if (!doc.documentElement) return { doc: null, declaration: null, error: 'The XML could not be parsed.' };

    const declMatch = /^\s*(<\?xml[^?]*\?>)/.exec(input);
    return { doc, declaration: declMatch ? declMatch[1] : null, error: null };
}

interface TreeNodeProps {
    node: Element;
    depth: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth }) => {
    const [expanded, setExpanded] = useState(depth < 2);
    const children = Array.from(node.children);
    const attrs = Array.from(node.attributes);
    const text = Array.from(node.childNodes)
        .filter((c) => c.nodeType === Node.TEXT_NODE || c.nodeType === Node.CDATA_SECTION_NODE)
        .map((c) => (c.textContent || '').trim())
        .filter(Boolean)
        .join(' ');
    const hasChildren = children.length > 0;

    return (
        <Box sx={{ ml: depth === 0 ? 0 : 1.25, borderLeft: depth === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)', pl: depth === 0 ? 0 : 1.25 }}>
            <Stack
                direction="row"
                spacing={0.5}
                alignItems="flex-start"
                sx={{ py: 0.25, cursor: hasChildren ? 'pointer' : 'default', userSelect: 'none' }}
                onClick={() => hasChildren && setExpanded((e) => !e)}
            >
                {hasChildren
                    ? (expanded ? <ExpandMore fontSize="small" sx={{ mt: 0.15, opacity: 0.7 }} /> : <ChevronRight fontSize="small" sx={{ mt: 0.15, opacity: 0.7 }} />)
                    : <Box sx={{ width: 20, flexShrink: 0 }} />}
                <Typography component="div" variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
                    <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>{node.tagName}</Box>
                    {attrs.map((a) => (
                        <Box component="span" key={a.name} sx={{ color: 'warning.main' }}>
                            {' '}{a.name}=<Box component="span" sx={{ color: 'success.main' }}>&quot;{a.value}&quot;</Box>
                        </Box>
                    ))}
                    {!hasChildren && text && <Box component="span" sx={{ color: 'text.secondary' }}>{' '}{text}</Box>}
                </Typography>
            </Stack>
            {hasChildren && expanded && (
                <Box>
                    {text && (
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary', ml: 3.5, py: 0.25 }}>
                            {text}
                        </Typography>
                    )}
                    {children.map((child, i) => <TreeNode key={i} node={child} depth={depth + 1} />)}
                </Box>
            )}
        </Box>
    );
};

const SAMPLE_XML = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- A small product catalog -->',
    '<catalog>',
    '  <book id="bk101" available="true">',
    '    <author>Gambardella, Matthew</author>',
    "    <title>XML Developer's Guide</title>",
    '    <price>44.95</price>',
    '    <description><![CDATA[An in-depth look at creating applications with XML, including a <chapter> on parsers.]]></description>',
    '  </book>',
    '  <book id="bk102" available="false">',
    '    <author>Ralls, Kim</author>',
    '    <title>Midnight Rain</title>',
    '    <price>5.95</price>',
    '  </book>',
    '</catalog>',
].join('\n');

const XmlFormatter: React.FC = () => {
    const [input, setInput] = useState(SAMPLE_XML);
    const [mode, setMode] = useState<ViewMode>('formatted');
    const [indentSize, setIndentSize] = useState(2);
    const [selfClosingEmpty, setSelfClosingEmpty] = useState(true);
    const [snackbar, setSnackbar] = useState<string | null>(null);

    const parsed = useMemo(() => parseXml(input), [input]);

    const formattedOutput = useMemo(
        () => (parsed.doc ? formatDocument(parsed.doc, parsed.declaration, indentSize, selfClosingEmpty) : ''),
        [parsed, indentSize, selfClosingEmpty],
    );
    const minifiedOutput = useMemo(
        () => (parsed.doc ? minifyDocument(parsed.doc, parsed.declaration, selfClosingEmpty) : ''),
        [parsed, selfClosingEmpty],
    );

    const activeOutput = mode === 'minified' ? minifiedOutput : formattedOutput;

    const copyOutput = useCallback(() => {
        navigator.clipboard.writeText(activeOutput).then(
            () => setSnackbar('Output copied to clipboard'),
            () => setSnackbar('Could not copy to clipboard'),
        );
    }, [activeOutput]);

    const about = "This formatter parses XML with the browser's own DOMParser, the same engine that rejects malformed markup when a real page loads it, so anything that formats cleanly here will parse the same way anywhere else. Pretty-printing rebuilds the tree with consistent indentation while leaving attribute order, CDATA sections, comments and processing instructions exactly as they were; minifying does the same without the added whitespace. The tree view walks the parsed document itself rather than the raw text, so it always reflects what the parser actually understood. Nothing you paste leaves this tab - parsing, formatting and rendering all happen locally.";

    const howToSteps = [
        { name: 'Paste your XML', text: 'Drop a document into the input box. Parsing and formatting run as you type, and any error names the exact line it happened on.' },
        { name: 'Pick formatted, minified or tree', text: 'Switch views with the toggle above the output: an indented layout, a single-line minified version, or a collapsible tree of the parsed elements.' },
        { name: 'Adjust indentation and empty tags', text: 'Choose 2 or 4 space indent, and whether an element with no content is written as a self-closing tag or an explicit open/close pair.' },
        { name: 'Copy the result', text: 'Copy the formatted or minified text straight to your clipboard once it looks right.' },
    ];

    const faq = [
        {
            question: 'What actually makes an XML document invalid?',
            answer: "XML has stricter rules than HTML: there must be exactly one root element, every start tag needs a matching end tag or must be self-closing, tags cannot cross each other, attribute values must be quoted, and a bare & or < inside text has to be escaped or wrapped in CDATA. This tool checks that XML is well-formed by those rules - it does not validate against a schema or DTD, which is a separate, much larger check that compares your document against a set of allowed elements and types.",
        },
        {
            question: "Why does a mismatched tag break XML parsing outright, while a similar mistake in HTML still renders?",
            answer: "Browsers run an elaborate error-recovery algorithm for HTML that guesses what a broken page probably meant, because the web is full of imperfect HTML and breaking it entirely was never an option. XML was designed the opposite way: there is no recovery step, so a parser stops at the first well-formedness violation and reports exactly where it happened, rather than silently guessing at a fix that might hide a real bug in whatever generated the file.",
        },
        {
            question: 'What is the difference between a self-closing tag and an explicit empty tag?',
            answer: '<tag/> and <tag></tag> are exactly equivalent to any XML parser - both mean an element with no children. Which one comes out is purely a formatting preference, controlled by the toggle above the output, and switching it never changes what the document means.',
        },
        {
            question: 'Why is some text wrapped in CDATA instead of just being escaped?',
            answer: 'A CDATA section lets you include characters like < and & literally, without escaping them one at a time, which is convenient when the text itself contains markup-like content such as an embedded code snippet or a snippet of HTML. This tool preserves whichever style the original document used rather than converting between them, because that choice belongs to whoever authored the file.',
        },
        {
            question: 'When does XML make more sense than JSON?',
            answer: "XML is still the better fit when a document is fundamentally text with markup in it - attributes plus mixed text and element content, the way a book description can have an embedded emphasis tag - or when you need namespaces to combine vocabularies from different sources, or when you're working against an existing ecosystem of XSD schemas and XSLT tooling that JSON has no real equivalent for. For plain data structures without mixed content, JSON is usually simpler.",
        },
    ];

    return (
        <ServicePageShell
            icon={Code}
            title="XML Formatter & Validator"
            subtitle="Pretty-print, minify and validate XML with clear parser error locations and a collapsible tree view."
            maxWidth="md"
            toolId={107}
            seoTitle="XML Formatter & Validator - Free Online Pretty Printer"
            seoDescription="Format, minify and validate XML online. Uses the browser's real XML parser to catch malformed documents with a precise line and column, and includes a collapsible tree view. CDATA, comments and processing instructions are preserved. Runs entirely in your browser."
            keywords={['xml formatter', 'xml validator online', 'xml beautifier', 'minify xml', 'xml syntax checker', 'pretty print xml']}
            about={about}
            howToSteps={howToSteps}
            faq={faq}
        >
            <Card sx={{
                background: 'rgba(13, 14, 18, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '20px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                p: 3,
            }}>
                <TextField
                    label="XML input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    fullWidth
                    multiline
                    minRows={8}
                    maxRows={14}
                    placeholder="Paste an XML document here."
                    InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
                    sx={{ mb: 2 }}
                />

                {parsed.error && (
                    <Alert severity="error" sx={{ mb: 2, fontFamily: 'monospace', fontSize: '0.85rem' }}>{parsed.error}</Alert>
                )}

                {parsed.doc && (
                    <>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
                            <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v: ViewMode | null) => v && setMode(v)}>
                                <ToggleButton value="formatted">Formatted</ToggleButton>
                                <ToggleButton value="minified">Minified</ToggleButton>
                                <ToggleButton value="tree">Tree</ToggleButton>
                            </ToggleButtonGroup>

                            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                <FormControl size="small" sx={{ minWidth: 110 }}>
                                    <InputLabel id="xml-indent">Indent</InputLabel>
                                    <Select labelId="xml-indent" label="Indent" value={indentSize} onChange={(e) => setIndentSize(Number(e.target.value))}>
                                        <MenuItem value={2}>2 spaces</MenuItem>
                                        <MenuItem value={4}>4 spaces</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControlLabel
                                    control={<Switch size="small" checked={selfClosingEmpty} onChange={(e) => setSelfClosingEmpty(e.target.checked)} />}
                                    label={<Typography variant="body2">Self-close empty tags</Typography>}
                                />
                            </Stack>
                        </Stack>

                        {mode === 'tree' ? (
                            <Box sx={{
                                p: 1.5,
                                borderRadius: '10px',
                                bgcolor: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                maxHeight: 420,
                                overflow: 'auto',
                            }}>
                                <TreeNode node={parsed.doc.documentElement} depth={0} />
                            </Box>
                        ) : (
                            <>
                                <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                                    <Button size="small" startIcon={<ContentCopy />} onClick={copyOutput}>Copy</Button>
                                </Stack>
                                <TextField
                                    value={activeOutput}
                                    fullWidth
                                    multiline
                                    minRows={8}
                                    maxRows={16}
                                    InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
                                />
                            </>
                        )}
                    </>
                )}
            </Card>

            <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar(null)} message={snackbar || ''} />
        </ServicePageShell>
    );
};

export default XmlFormatter;
