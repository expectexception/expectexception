import React, { useMemo, useState } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { ContentCopy, Refresh, FindReplace } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';

type RegexMatch = {
  index: number;
  text: string;
  groups: Array<string | undefined>;
};

const DEFAULT_PATTERN = '(\\w+)@(\\w+\\.)+\\w+';
const DEFAULT_TEXT = `Emails:\n- alice@example.com\n- bob.smith@sub.domain.org\n\nNot emails:\n- alice(at)example.com\n- bob@domain`;

const cheatSheetSections: Array<{ title: string; items: Array<{ pattern: string; meaning: string }> }> = [
  {
    title: 'Character Classes',
    items: [
      { pattern: '.', meaning: 'Any character' },
      { pattern: '\\d', meaning: 'Digit (0-9)' },
      { pattern: '\\w', meaning: 'Word char' },
      { pattern: '\\s', meaning: 'Whitespace' },
      { pattern: '[abc]', meaning: 'One of a, b, c' },
      { pattern: '[^abc]', meaning: 'Not a, b, c' },
      { pattern: '[a-z]', meaning: 'Range' },
    ],
  },
  {
    title: 'Quantifiers',
    items: [
      { pattern: '*', meaning: '0 or more' },
      { pattern: '+', meaning: '1 or more' },
      { pattern: '?', meaning: '0 or 1' },
      { pattern: '{n}', meaning: 'Exactly n' },
      { pattern: '{n,}', meaning: 'At least n' },
      { pattern: '{n,m}', meaning: 'Between n and m' },
      { pattern: '*?, +?, ??', meaning: 'Lazy versions' },
    ],
  },
  {
    title: 'Anchors',
    items: [
      { pattern: '^', meaning: 'Start of string/line' },
      { pattern: '$', meaning: 'End of string/line' },
      { pattern: '\\b', meaning: 'Word boundary' },
    ],
  },
  {
    title: 'Groups & Alternation',
    items: [
      { pattern: '(...)', meaning: 'Capturing group' },
      { pattern: '(?:...)', meaning: 'Non-capturing group' },
      { pattern: '|', meaning: 'Alternation (OR)' },
    ],
  },
  {
    title: 'Lookarounds',
    items: [
      { pattern: '(?=...)', meaning: 'Positive lookahead' },
      { pattern: '(?!...)', meaning: 'Negative lookahead' },
      { pattern: '(?<=...)', meaning: 'Positive lookbehind' },
      { pattern: '(?<!...)', meaning: 'Negative lookbehind' },
    ],
  },
  {
    title: 'Flags',
    items: [
      { pattern: 'g', meaning: 'Global (find all)' },
      { pattern: 'i', meaning: 'Case-insensitive' },
      { pattern: 'm', meaning: 'Multiline' },
      { pattern: 's', meaning: 'DotAll' },
      { pattern: 'u', meaning: 'Unicode mode' },
      { pattern: 'y', meaning: 'Sticky' },
    ],
  },
];

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

  return (
    <ServicePageShell
      icon={FindReplace}
      title="Regex Tester + Cheat Sheet"
      subtitle="Test JavaScript regular expressions against text and learn common patterns."
      maxWidth="lg"
      about="Tests a JavaScript regular expression against a block of text and highlights every match live as you edit the pattern, text, or flags (g, i, m, s, u, y). It shows each match's position and captured groups, lets you export all matches as JSON, and includes a built-in cheat sheet covering character classes, quantifiers, anchors, groups, alternation, and lookarounds. Matching, highlighting, and JSON export all run locally using the browser's native RegExp engine; nothing is sent anywhere."
      howToSteps={[
        { name: 'Write your pattern', text: 'Enter a regular expression in the Pattern field (without the surrounding slashes) — it loads with an example email-matching pattern.' },
        { name: 'Toggle flags', text: 'Switch on whichever flags you need — g (find all matches), i (case-insensitive), m (multiline), s (dotAll), u (unicode), y (sticky).' },
        { name: 'Paste your test text', text: 'Enter or paste the text to test against in the Text field; matches are highlighted inline immediately.' },
        { name: 'Review matches and groups', text: "Scroll the Results panel to see each match's index, matched text, and any captured groups, or check the built-in cheat sheet below for syntax reference." },
        { name: 'Export matches', text: 'Click Copy Matches JSON to copy every match (with index, text, and groups) as a JSON array.' },
      ]}
      faq={[
        { question: 'What regex flavor does this use?', answer: "Your browser's native JavaScript RegExp engine — the same one used in the browser console, Node.js, and client-side JS. It isn't identical to PCRE (PHP/Perl) or Python's re module; some syntax like recursive patterns or possessive quantifiers isn't supported." },
        { question: 'Is there a limit on how many matches it will compute?', answer: 'Yes — it stops after 500 matches to avoid freezing the tab on a runaway pattern, and only the first 50 are displayed in the results list.' },
        { question: 'Does my pattern or text get sent anywhere?', answer: "No, matching runs entirely client-side against the browser's built-in RegExp implementation — nothing is uploaded or logged." },
        { question: 'What happens with zero-length matches (e.g. a pattern like x*)?', answer: "The tester detects them and manually advances past each one, so a pattern that could match an empty string won't cause the browser to hang in an infinite loop." },
      ]}
    >
      <Seo title="Regex Tester + Cheat Sheet" toolId={24} />

      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Grid item xs={12} md={6} sx={{ display: 'flex', minHeight: 0 }}>
          <Card sx={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Pattern"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder={'e.g. ^(\\w+)$'}
                sx={{ mb: 2, flexShrink: 0 }}
                InputProps={{
                  sx: { fontFamily: 'monospace' },
                }}
              />

              <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', flexShrink: 0 }}>
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
                label="Text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste text to test your regex..."
                sx={{
                  flex: 1,
                  minHeight: 0,
                  '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    height: '100% !important',
                    overflowY: 'auto !important',
                  },
                }}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2, flexShrink: 0 }}>
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

        <Grid item xs={12} md={6} sx={{ display: 'flex', minHeight: 0 }}>
          <Card sx={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, flexShrink: 0 }}>
                Results
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, flexShrink: 0 }}>
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
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.04),
                  border: '1px solid',
                  borderColor: 'divider',
                  flexShrink: 0,
                  maxHeight: '30%',
                  overflowY: 'auto',
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

              <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
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

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                    Cheat Sheet
                  </Typography>
                  <Grid container spacing={1.5}>
                    {cheatSheetSections.map((section) => (
                      <Grid key={section.title} item xs={12} sm={6}>
                        <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
                            {section.title}
                          </Typography>
                          <Stack spacing={0.5}>
                            {section.items.map((item) => (
                              <Box key={`${section.title}-${item.pattern}`} sx={{ display: 'flex', gap: 1 }}>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 64, flexShrink: 0 }}>
                                  {item.pattern}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.meaning}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </ServicePageShell>
  );
};

export default RegexTester;
