import React, { useCallback, useMemo, useState } from 'react';
import {
    Box, Button, Card, Checkbox, FormControlLabel, FormGroup, Snackbar,
    Stack, TextField, Typography,
} from '@mui/material';
import { ContentCopy, Download, GitHub } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

type Category = 'Languages & frameworks' | 'Tools' | 'Editors & IDEs' | 'Operating systems';

interface Template {
    id: string;
    label: string;
    category: Category;
    patterns: string[];
}

/** Patterns are the standard ones each ecosystem's own tooling (or GitHub's
 * own gitignore template collection) produces - not exhaustive, but the
 * generated artifacts and local-only files that show up in nearly every
 * project of that kind. */
const TEMPLATES: Template[] = [
    {
        id: 'node', label: 'Node.js', category: 'Languages & frameworks', patterns: [
            'node_modules/', 'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*',
            '.pnpm-debug.log*', 'dist/', 'build/', 'coverage/', '.env', '.env.local',
            '.env.*.local', '*.tsbuildinfo',
        ],
    },
    {
        id: 'nextjs', label: 'Next.js', category: 'Languages & frameworks', patterns: [
            '.next/', 'out/', 'next-env.d.ts', '.vercel/',
        ],
    },
    {
        id: 'python', label: 'Python', category: 'Languages & frameworks', patterns: [
            '__pycache__/', '*.py[cod]', '*$py.class', '*.egg-info/', '.eggs/', 'dist/',
            'build/', '.venv/', 'venv/', 'env/', '.mypy_cache/', '.pytest_cache/', '.tox/',
            '*.sqlite3', '.coverage', 'htmlcov/',
        ],
    },
    {
        id: 'java', label: 'Java', category: 'Languages & frameworks', patterns: [
            '*.class', '*.jar', '*.war', '*.ear', 'target/', '.gradle/', 'build/', 'hs_err_pid*',
        ],
    },
    {
        id: 'go', label: 'Go', category: 'Languages & frameworks', patterns: [
            '*.exe', '*.exe~', '*.dll', '*.so', '*.dylib', '*.test', '*.out', 'vendor/', 'go.work',
        ],
    },
    {
        id: 'rust', label: 'Rust', category: 'Languages & frameworks', patterns: [
            '/target/', '**/*.rs.bk', '*.pdb',
        ],
    },
    {
        id: 'ruby', label: 'Ruby', category: 'Languages & frameworks', patterns: [
            '*.gem', '*.rbc', '/.config', '/coverage/', '/pkg/', '/spec/reports/',
            '/spec/examples.txt', '/test/tmp/', '/test/version_tmp/', '/tmp/', '.bundle/',
            'vendor/bundle', 'log/*.log',
        ],
    },
    {
        id: 'php', label: 'PHP', category: 'Languages & frameworks', patterns: [
            '/vendor/', 'composer.phar', '.env', '.phpunit.result.cache', '*.log',
        ],
    },
    {
        id: 'cpp', label: 'C / C++', category: 'Languages & frameworks', patterns: [
            '*.o', '*.obj', '*.out', '*.a', '*.lib', '*.so', '*.dll', '*.dylib', '*.exe',
            'CMakeFiles/', 'CMakeCache.txt', 'cmake-build-*/',
        ],
    },
    {
        id: 'dotnet', label: '.NET', category: 'Languages & frameworks', patterns: [
            'bin/', 'obj/', '*.user', '*.suo', '.vs/', '*.pdb', 'packages/',
        ],
    },
    {
        id: 'android', label: 'Android', category: 'Languages & frameworks', patterns: [
            '*.apk', '*.aab', '*.ap_', '*.dex', 'local.properties', '.gradle/', 'build/',
            'captures/', '.externalNativeBuild/', '.cxx/',
        ],
    },
    {
        id: 'terraform', label: 'Terraform', category: 'Tools', patterns: [
            '**/.terraform/*', '*.tfstate', '*.tfstate.*', 'crash.log', 'crash.*.log',
            '*.tfvars', '*.tfvars.json', 'override.tf', 'override.tf.json', '*_override.tf',
            '.terraformrc', 'terraform.rc',
        ],
    },
    {
        id: 'vscode', label: 'VS Code', category: 'Editors & IDEs', patterns: [
            '.vscode/*', '!.vscode/settings.json', '!.vscode/tasks.json', '!.vscode/launch.json',
            '!.vscode/extensions.json', '.history/', '*.vsix',
        ],
    },
    {
        id: 'intellij', label: 'IntelliJ / JetBrains', category: 'Editors & IDEs', patterns: [
            '.idea/', '*.iml', '*.ipr', '*.iws', 'out/',
        ],
    },
    {
        id: 'vim', label: 'Vim', category: 'Editors & IDEs', patterns: [
            '*.swp', '*.swo', '*~', 'Session.vim', '.netrwhist',
        ],
    },
    {
        id: 'sublime', label: 'Sublime Text', category: 'Editors & IDEs', patterns: [
            '*.sublime-workspace', '*.sublime-project',
        ],
    },
    {
        id: 'macos', label: 'macOS', category: 'Operating systems', patterns: [
            '.DS_Store', '.AppleDouble', '.LSOverride', '._*', '.Spotlight-V100', '.Trashes',
        ],
    },
    {
        id: 'windows', label: 'Windows', category: 'Operating systems', patterns: [
            'Thumbs.db', 'ehthumbs.db', 'Desktop.ini', '$RECYCLE.BIN/', '*.lnk',
        ],
    },
    {
        id: 'linux', label: 'Linux', category: 'Operating systems', patterns: [
            '*~', '.fuse_hidden*', '.directory', '.Trash-*', '.nfs*',
        ],
    },
];

const CATEGORY_ORDER: Category[] = ['Languages & frameworks', 'Tools', 'Editors & IDEs', 'Operating systems'];

/** Merges the selected templates in a fixed order, section by section, with
 * a `# Label` header above each one. A pattern already emitted by an earlier
 * section is dropped from a later one so the same line never appears twice. */
function buildGitignore(selectedIds: string[], custom: string): string {
    const seen = new Set<string>();
    const sections: string[] = [];

    TEMPLATES.forEach((tpl) => {
        if (!selectedIds.includes(tpl.id)) return;
        const patterns = tpl.patterns.filter((p) => {
            if (seen.has(p)) return false;
            seen.add(p);
            return true;
        });
        if (patterns.length === 0) return;
        sections.push(`# ${tpl.label}\n${patterns.join('\n')}`);
    });

    const customLines = custom.split('\n').map((l) => l.trim()).filter(Boolean);
    if (customLines.length > 0) sections.push(`# Custom\n${customLines.join('\n')}`);

    return sections.join('\n\n');
}

const DEFAULT_SELECTED = ['node', 'macos', 'vscode'];

const GitignoreGenerator: React.FC = () => {
    const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);
    const [custom, setCustom] = useState('');
    const [snackbar, setSnackbar] = useState<string | null>(null);

    const output = useMemo(() => buildGitignore(selected, custom), [selected, custom]);

    const toggle = useCallback((id: string) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }, []);

    const copyOutput = useCallback(() => {
        navigator.clipboard.writeText(output).then(
            () => setSnackbar('.gitignore copied to clipboard'),
            () => setSnackbar('Could not copy to clipboard'),
        );
    }, [output]);

    const download = useCallback(() => {
        const blob = new Blob([`${output}\n`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '.gitignore';
        a.click();
        URL.revokeObjectURL(url);
    }, [output]);

    const about = "Pick every language, framework, editor and OS your project touches and this generates one merged .gitignore, built from the patterns each ecosystem's own tooling and GitHub's own template collection use - node_modules for Node, __pycache__ for Python, .DS_Store for macOS, and so on. Selections merge into sectioned output with a comment header per source and no duplicate lines, and a free-text box at the bottom lets you add anything specific to your own project underneath a Custom header. Nothing here talks to your repository; it just builds a file you copy or download.";

    const howToSteps = [
        { name: 'Tick what your project uses', text: 'Select every language, framework, editor and operating system that applies. Most projects want at least one language and one OS.' },
        { name: 'Add anything project-specific', text: 'Use the custom patterns box for files unique to your setup, like a local config or a generated report directory.' },
        { name: 'Check the preview', text: 'The merged file updates live below, grouped into a labelled section per selection with duplicates removed.' },
        { name: 'Copy or download', text: 'Copy the text into an existing .gitignore, or download it directly as a new one for the root of your repository.' },
    ];

    const faq = [
        {
            question: 'Why is a file still showing up in git status after I added it to .gitignore?',
            answer: ".gitignore only affects files Git doesn't know about yet - it has no effect on a file that's already tracked. If something slipped into a commit before you ignored it, add the pattern here as usual, then run git rm -r --cached . followed by git add . to re-stage everything according to the current ignore rules, and commit that. The file stays on disk; only the tracking stops.",
        },
        {
            question: 'Are these patterns relative to the repository root?',
            answer: "It depends on the pattern. One starting with a leading slash, like /vendor/, matches only at the same level as the .gitignore file. A pattern with no leading slash, like *.log, matches at any depth in the tree below it. Some of the patterns bundled here use a leading slash deliberately, because a name like /coverage/ would otherwise also hide an unrelated coverage/ folder nested somewhere inside your own source tree.",
        },
        {
            question: 'What does a line starting with ! do?',
            answer: "It negates a pattern, re-including something that an earlier, broader pattern excluded - that's exactly how the VS Code section here works: .vscode/* ignores the whole folder, and the !.vscode/settings.json lines carve specific files back out so a team's shared editor settings can still be committed. Negation can't re-include a file inside a directory that was itself ignored, only files directly excluded by a pattern.",
        },
        {
            question: 'Why bother with a .gitignore instead of just being careful about what I git add?',
            answer: 'Because "being careful" fails exactly once, and that once is usually a credentials file or a multi-gigabyte build folder committed by accident and then very awkward to fully remove from history afterward. Setting one up before the first commit costs a minute and means git status and git add . only ever show you things you actually meant to track.',
        },
        {
            question: 'Is anything I type here uploaded anywhere?',
            answer: 'No. The template patterns are bundled into this page and the merge happens in your browser; nothing about your project or your custom patterns is sent anywhere.',
        },
    ];

    return (
        <ServicePageShell
            icon={GitHub}
            title=".gitignore Generator"
            subtitle="Pick your languages, frameworks and editors and generate a merged .gitignore."
            maxWidth="md"
            toolId={109}
            seoTitle=".gitignore Generator - Free Online Tool for Any Stack"
            seoDescription="Generate a .gitignore file for Node, Python, Java, Go, Rust, and more, plus VS Code, JetBrains, macOS, Windows and Linux. Merges your selections into one deduplicated file with a section per source, no signup, runs entirely in your browser."
            keywords={['.gitignore generator', 'generate gitignore online', 'gitignore template', '.gitignore for node python java', 'create gitignore file']}
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
                <Stack spacing={2} sx={{ mb: 2.5 }}>
                    {CATEGORY_ORDER.map((category) => (
                        <Box key={category}>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {category}
                            </Typography>
                            <FormGroup row sx={{ mt: 0.25 }}>
                                {TEMPLATES.filter((t) => t.category === category).map((t) => (
                                    <FormControlLabel
                                        key={t.id}
                                        control={<Checkbox size="small" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} />}
                                        label={<Typography variant="body2">{t.label}</Typography>}
                                        sx={{ mr: 2 }}
                                    />
                                ))}
                            </FormGroup>
                        </Box>
                    ))}
                </Stack>

                <TextField
                    label="Custom patterns (one per line)"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={4}
                    placeholder="notes.txt&#10;/local-only/"
                    InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                    sx={{ mb: 2.5 }}
                />

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Preview {selected.length > 0 ? `(${selected.length} selected)` : ''}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Button size="small" startIcon={<ContentCopy />} onClick={copyOutput} disabled={!output}>
                            Copy
                        </Button>
                        <Button size="small" variant="outlined" startIcon={<Download />} onClick={download} disabled={!output}>
                            Download
                        </Button>
                    </Stack>
                </Stack>

                <TextField
                    value={output}
                    fullWidth
                    multiline
                    minRows={10}
                    maxRows={18}
                    placeholder="Select at least one language, tool, editor or OS above."
                    InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
                />
            </Card>

            <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar(null)} message={snackbar || ''} />
        </ServicePageShell>
    );
};

export default GitignoreGenerator;
