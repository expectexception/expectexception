import React, { useState } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { ContentCopy, Check } from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
    code: string;
    language?: string;
    showLineNumbers?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
    code,
    language = 'javascript',
    showLineNumbers = true
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <Box
            sx={{
                position: 'relative',
                my: 3,
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: 2,
                border: 1,
                borderColor: 'divider',
            }}
        >
            {/* Header with language badge and copy button */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: '#1e1e1e',
                    px: 2,
                    py: 1,
                    borderBottom: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        color: '#9cdcfe',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                    }}
                >
                    {language}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                    <IconButton
                        size="small"
                        onClick={handleCopy}
                        sx={{
                            color: copied ? '#4ec9b0' : '#cccccc',
                            '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.1)',
                            },
                        }}
                    >
                        {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Code content */}
            <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                showLineNumbers={showLineNumbers}
                customStyle={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    maxHeight: '500px',
                    overflow: 'auto',
                }}
                codeTagProps={{
                    style: {
                        fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
                    },
                }}
            >
                {code}
            </SyntaxHighlighter>
        </Box>
    );
};

export default CodeBlock;
