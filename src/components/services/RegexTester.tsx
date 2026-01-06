import React, { useMemo, useState } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { ContentCopy, Refresh } from '@mui/icons-material';
import Seo from '../seo/Seo';

type RegexMatch = {
  index: number;
  text: string;
  groups: Array<string | undefined>;
};

const DEFAULT_PATTERN = '(\\w+)@(\\w+\\.)+\\w+';
const DEFAULT_TEXT = `Emails:\n- alice@example.com\n- bob.smith@sub.domain.org\n\nNot emails:\n- alice(at)example.com\n- bob@domain`;

const RegexTester: React.FC = () => {
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [text, setText] = useState(DEFAULT_TEXT);

  const [flagGlobal, setFlagGlobal] = useState(true);
  const [flagIgnoreCase, setFlagIgnoreCase] = useState(false);
  const [flagMultiline, setFlagMultiline] = useState(true);
  const [flagDotAll, setFlagDotAll] = useState(false);
  const [flagUnicode, setFlagUnicode] = useState(false);
  const [flagSticky, setFlagSticky] = useState(false);

  const flags = useMemo(() => {
    const parts: string[] = [];
    if (flagGlobal) parts.push('g');
    if (flagIgnoreCase) parts.push('i');
    if (flagMultiline) parts.push('m');
    if (flagDotAll) parts.push('s');
    if (flagUnicode) parts.push('u');
    if (flagSticky) parts.push('y');
    return parts.join('');
  }, [flagDotAll, flagGlobal, flagIgnoreCase, flagMultiline, flagSticky, flagUnicode]);

  const { regex, error } = useMemo(() => {
    if (!pattern.trim()) {
      return { regex: null as RegExp | null, error: 'Enter a regex pattern.' };
    }

    try {
      return { regex: new RegExp(pattern, flags), error: null as string | null };
    } catch (e) {
      return { regex: null as RegExp | null, error: (e as Error).message };
    }
  }, [pattern, flags]);

  const matches: RegexMatch[] = useMemo(() => {
    if (!regex) return [];

    // Prevent huge work on accidental patterns.
    const MAX_MATCHES = 500;
    const results: RegexMatch[] = [];

    if (!regex.global) {
      const m = regex.exec(text);
      if (!m || typeof m.index !== 'number') return [];
      results.push({
        index: m.index,
        text: m[0] ?? '',
        groups: m.slice(1),
      });
      return results;
    }

    // Use exec loop (ES5-friendly) instead of matchAll.
    const r = new RegExp(regex.source, regex.flags);
    r.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = r.exec(text)) !== null) {
      if (typeof m.index === 'number') {
        results.push({
          index: m.index,
          text: m[0] ?? '',
          groups: m.slice(1),
        });
      }

      if (results.length >= MAX_MATCHES) break;

      // Prevent infinite loops on zero-length matches.
      if (m[0] === '') {
        r.lastIndex += 1;
      }
    }

    return results;
  }, [regex, text]);

  const highlightedText = useMemo(() => {
    if (!matches.length) return null;

    const ranges = matches
      .map((m) => ({ start: m.index, end: m.index + m.text.length }))
      .filter((r) => r.end > r.start)
      .sort((a, b) => a.start - b.start);

    // Merge overlapping ranges (rare but possible).
    const merged: Array<{ start: number; end: number }> = [];
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (!last || r.start > last.end) {
        merged.push({ ...r });
      } else {
        last.end = Math.max(last.end, r.end);
      }
    }

    const parts: Array<{ text: string; match: boolean }> = [];
    let cursor = 0;
    for (const r of merged) {
      if (cursor < r.start) {
        parts.push({ text: text.slice(cursor, r.start), match: false });
      }
      parts.push({ text: text.slice(r.start, r.end), match: true });
      cursor = r.end;
    }
    if (cursor < text.length) {
      parts.push({ text: text.slice(cursor), match: false });
    }

    return (
      <Box
        component="pre"
        sx={{
          m: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          lineHeight: 1.6,
          color: 'text.primary',
        }}
      >
        {parts.map((p, idx) =>
          p.match ? (
            <Box
              key={idx}
              component="mark"
              sx={{
                bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.35 : 0.25),
                color: 'text.primary',
                px: 0.25,
                borderRadius: 0.5,
              }}
            >
              {p.text}
            </Box>
          ) : (
            <React.Fragment key={idx}>{p.text}</React.Fragment>
          )
        )}
      </Box>
    );
  }, [matches, text]);

  const handleReset = () => {
    setPattern(DEFAULT_PATTERN);
    setText(DEFAULT_TEXT);
    setFlagGlobal(true);
    setFlagIgnoreCase(false);
    setFlagMultiline(true);
    setFlagDotAll(false);
    setFlagUnicode(false);
    setFlagSticky(false);
  };

  const handleCopyMatches = async () => {
    const payload = matches.map((m) => ({ index: m.index, match: m.text, groups: m.groups }));
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  };

  const cheatSheetSections: Array<{ title: string; items: Array<{ pattern: string; meaning: string; example?: string }> }> = [
    {
      title: 'Character Classes',
      items: [
        { pattern: '.', meaning: 'Any character (except newline unless /s)', example: 'a.c matches abc' },
        { pattern: '\\d', meaning: 'Digit (0-9)', example: '\\d{4} matches 2025' },
        { pattern: '\\w', meaning: 'Word char (A-Z a-z 0-9 _)', example: '\\w+ matches user_name' },
        { pattern: '\\s', meaning: 'Whitespace', example: '\\s+ matches spaces/tabs' },
        { pattern: '[abc]', meaning: 'One of a, b, c', example: 'gr[ae]y matches gray/grey' },
        { pattern: '[^abc]', meaning: 'Not a, b, c', example: '[^0-9] matches non-digits' },
        { pattern: '[a-z]', meaning: 'Range', example: '[a-f] matches hex letters' },
      ],
    },
    {
      title: 'Quantifiers',
      items: [
        { pattern: '*', meaning: '0 or more', example: 'a* matches "", a, aaaa' },
        { pattern: '+', meaning: '1 or more', example: 'a+ matches a, aa' },
        { pattern: '?', meaning: '0 or 1', example: 'colou?r matches color/colour' },
        { pattern: '{n}', meaning: 'Exactly n', example: '\\d{2} matches 42' },
        { pattern: '{n,}', meaning: 'At least n', example: 'a{2,} matches aa, aaa' },
        { pattern: '{n,m}', meaning: 'Between n and m', example: '\\d{1,3} matches 7, 42, 999' },
        { pattern: '*?, +?, ??', meaning: 'Lazy versions', example: '.*? is minimal match' },
      ],
    },
    {
      title: 'Anchors',
      items: [
        { pattern: '^', meaning: 'Start of string/line (with /m)', example: '^Hello' },
        { pattern: '$', meaning: 'End of string/line (with /m)', example: 'world$' },
        { pattern: '\\b', meaning: 'Word boundary', example: '\\bcat\\b matches "cat" not "concatenate"' },
      ],
    },
    {
      title: 'Groups & Alternation',
      items: [
        { pattern: '(...)', meaning: 'Capturing group', example: '(\\d+)-(\\d+)' },
        { pattern: '(?:...)', meaning: 'Non-capturing group', example: '(?:https?)://' },
        { pattern: '|', meaning: 'Alternation (OR)', example: 'cat|dog' },
      ],
    },
    {
      title: 'Lookarounds (JS supports)',
      items: [
        { pattern: '(?=...)', meaning: 'Positive lookahead', example: 'q(?=u) matches q in "quick"' },
        { pattern: '(?!...)', meaning: 'Negative lookahead', example: 'q(?!u) matches q in "Iraq"' },
        { pattern: '(?<=...)', meaning: 'Positive lookbehind', example: '(?<=#)\\w+ matches tag in #hello' },
        { pattern: '(?<!...)', meaning: 'Negative lookbehind', example: '(?<!#)\\w+' },
      ],
    },
    {
      title: 'Flags (JavaScript)',
      items: [
        { pattern: 'g', meaning: 'Global (find all matches)' },
        { pattern: 'i', meaning: 'Case-insensitive' },
        { pattern: 'm', meaning: 'Multiline (^ and $ work per line)' },
        { pattern: 's', meaning: 'DotAll (. matches newline)' },
        { pattern: 'u', meaning: 'Unicode mode' },
        { pattern: 'y', meaning: 'Sticky (match at lastIndex)' },
      ],
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Seo title="Regex Tester + Cheat Sheet" toolId={24} />

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
        Regex Tester + Cheat Sheet
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Test JavaScript regular expressions against text and learn common patterns.
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Pattern"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder={'e.g. ^(\\w+)$'}
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { fontFamily: 'monospace' },
                }}
              />

              <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <FormControlLabel control={<Switch checked={flagGlobal} onChange={(e) => setFlagGlobal(e.target.checked)} />} label="g" />
                <FormControlLabel control={<Switch checked={flagIgnoreCase} onChange={(e) => setFlagIgnoreCase(e.target.checked)} />} label="i" />
                <FormControlLabel control={<Switch checked={flagMultiline} onChange={(e) => setFlagMultiline(e.target.checked)} />} label="m" />
                <FormControlLabel control={<Switch checked={flagDotAll} onChange={(e) => setFlagDotAll(e.target.checked)} />} label="s" />
                <FormControlLabel control={<Switch checked={flagUnicode} onChange={(e) => setFlagUnicode(e.target.checked)} />} label="u" />
                <FormControlLabel control={<Switch checked={flagSticky} onChange={(e) => setFlagSticky(e.target.checked)} />} label="y" />
              </Stack>

              <TextField
                fullWidth
                multiline
                minRows={14}
                label="Text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste text to test your regex..."
                InputProps={{
                  sx: { fontFamily: 'monospace', fontSize: '0.9rem' },
                }}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                <Button variant="outlined" startIcon={<Refresh />} onClick={handleReset}>
                  Reset Example
                </Button>
                <Button variant="outlined" startIcon={<ContentCopy />} onClick={handleCopyMatches} disabled={!matches.length}>
                  Copy Matches JSON
                </Button>
                <Box sx={{ flex: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Flags: <Box component="span" sx={{ fontFamily: 'monospace' }}>{flags || '(none)'}</Box>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Results
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {regex ? (
                  matches.length ? (
                    <>
                      Found <b>{matches.length}</b> match{matches.length === 1 ? '' : 'es'}.
                      {!flagGlobal && ' (Only the first match is shown because g is off.)'}
                    </>
                  ) : (
                    'No matches.'
                  )
                ) : (
                  'Fix the pattern to see matches.'
                )}
              </Typography>

              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.04),
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {highlightedText || (
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      color: 'text.primary',
                    }}
                  >
                    {text}
                  </Box>
                )}
              </Box>

              <Stack spacing={1.5}>
                {matches.slice(0, 50).map((m, idx) => (
                  <Box
                    key={`${m.index}-${idx}`}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      #{idx + 1} @ {m.index}: <b>{m.text || '(empty)'}</b>
                    </Typography>
                    {!!m.groups.length && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Groups: {m.groups.map((g, i) => `(${i + 1}) ${g ?? ''}`).join(' · ')}
                      </Typography>
                    )}
                  </Box>
                ))}

                {matches.length > 50 && (
                  <Typography variant="caption" color="text.secondary">
                    Showing first 50 matches.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 800 }}>
          Cheat Sheet
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {cheatSheetSections.map((section) => (
            <Grid key={section.title} item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {section.title}
                  </Typography>

                  <Stack spacing={1}>
                    {section.items.map((item) => (
                      <Box key={`${section.title}-${item.pattern}`}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {item.pattern}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.meaning}
                          {item.example ? (
                            <>
                              {' '}
                              <Box component="span" sx={{ fontFamily: 'monospace' }}>
                                ({item.example})
                              </Box>
                            </>
                          ) : null}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default RegexTester;
