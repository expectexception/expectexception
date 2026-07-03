import React from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Props {
    content: string;
}

const CODE_BLOCK_RE = /```(\w+)?\n([\s\S]*?)```/g;
const INLINE_CODE_RE = /`([^`]+)`/g;
const BOLD_RE = /\*\*(.+?)\*\*/g;
const ITALIC_RE = /\*(.+?)\*/g;

type Segment =
    | { type: 'text'; value: string }
    | { type: 'code'; lang: string; value: string }
    | { type: 'inline-code'; value: string }
    | { type: 'bold'; value: string }
    | { type: 'italic'; value: string };

function parseSegments(text: string): Segment[] {
    const segments: Segment[] = [];
    let last = 0;
    const re = /```(\w+)?\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) {
            segments.push({ type: 'text', value: text.slice(last, m.index) });
        }
        segments.push({ type: 'code', lang: m[1] || 'text', value: m[2] });
        last = m.index + m[0].length;
    }
    if (last < text.length) {
        segments.push({ type: 'text', value: text.slice(last) });
    }
    return segments;
}

function renderInline(text: string, theme: any): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    const primary = theme.palette.primary.main;
    let remaining = text;
    let key = 0;
    while (remaining.length > 0) {
        const inlineCode = /`([^`]+)`/.exec(remaining);
        const bold = /\*\*(.+?)\*\*/.exec(remaining);
        const italic = /\*(.+?)\*/.exec(remaining);
        const candidates = [inlineCode, bold, italic].filter(Boolean) as RegExpExecArray[];
        if (candidates.length === 0) {
            nodes.push(<span key={key++}>{remaining}</span>);
            break;
        }
        const first = candidates.reduce((a, b) => a.index <= b.index ? a : b);
        if (first.index > 0) {
            nodes.push(<span key={key++}>{remaining.slice(0, first.index)}</span>);
        }
        if (first === inlineCode) {
            nodes.push(
                <Box component="code" key={key++} sx={{
                    px: 0.75, py: 0.2, borderRadius: 1, fontSize: '0.85em',
                    bgcolor: alpha(primary, 0.1), color: primary,
                    fontFamily: 'monospace',
                }}>
                    {first[1]}
                </Box>
            );
        } else if (first === bold) {
            nodes.push(<strong key={key++}>{renderInline(first[1], theme)}</strong>);
        } else if (first === italic) {
            nodes.push(<em key={key++}>{renderInline(first[1], theme)}</em>);
        }
        remaining = remaining.slice(first.index + first[0].length);
    }
    return nodes;
}

const MarkdownRenderer: React.FC<Props> = ({ content }) => {
    const theme = useTheme();
    const segments = parseSegments(content);

    return (
        <Box sx={{ lineHeight: 1.7, color: 'text.primary' }}>
            {segments.map((seg, i) => {
                if (seg.type === 'code') {
                    return (
                        <Box key={i} sx={{ my: 1.5, borderRadius: 2, overflow: 'hidden', border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}` }}>
                            {seg.lang && seg.lang !== 'text' && (
                                <Box sx={{
                                    px: 2, py: 0.5,
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                    fontSize: '0.7rem', fontFamily: 'monospace', color: 'text.secondary',
                                }}>
                                    {seg.lang}
                                </Box>
                            )}
                            <SyntaxHighlighter
                                language={seg.lang || 'text'}
                                style={vscDarkPlus}
                                customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.85rem' }}
                                showLineNumbers={seg.value.split('\n').length > 5}
                            >
                                {seg.value.trimEnd()}
                            </SyntaxHighlighter>
                        </Box>
                    );
                }
                if (seg.type === 'text') {
                    return (
                        <Box key={i} component="span">
                            {seg.value.split('\n').map((line, j) => (
                                <React.Fragment key={j}>
                                    {renderInline(line, theme)}
                                    {j < seg.value.split('\n').length - 1 && <br />}
                                </React.Fragment>
                            ))}
                        </Box>
                    );
                }
                return null;
            })}
        </Box>
    );
};

export default MarkdownRenderer;
