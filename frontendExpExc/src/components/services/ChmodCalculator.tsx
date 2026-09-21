import React, { useCallback, useState } from 'react';
import {
    Card, CardContent, Box, Typography, TextField, Checkbox, FormControlLabel,
    IconButton, Tooltip, Divider, useTheme,
} from '@mui/material';
import { FolderShared, ContentCopy, Check } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

/* A permission mode is held as a single integer in the same 12-bit layout the
 * kernel uses: bits 9-11 are the special bits (setuid 4, setgid 2, sticky 1),
 * then three bits each for owner, group and other, in that order. Every
 * representation on screen is derived from that one number, which is what
 * keeps the checkboxes, the octal field and the symbolic field in agreement. */

const CLASS_LABELS = ['Owner', 'Group', 'Other'] as const;
const PERM_LABELS = ['Read', 'Write', 'Execute'] as const;

/** setuid, setgid, sticky: the value each contributes to the leading digit. */
const SPECIAL_VALUES = [4, 2, 1] as const;
const SPECIAL_LABELS = ['setuid (4000)', 'setgid (2000)', 'sticky (1000)'] as const;

function splitDigits(mode: number): [number, number, number, number] {
    return [(mode >> 9) & 7, (mode >> 6) & 7, (mode >> 3) & 7, mode & 7];
}

function formatOctal(mode: number): string {
    const [special, owner, group, other] = splitDigits(mode);
    const base = `${owner}${group}${other}`;
    return special === 0 ? base : `${special}${base}`;
}

/** One rwx triplet. `specialChar` is 's' for setuid/setgid and 't' for sticky,
 * or null when that bit is clear. When the special bit is set it replaces the
 * execute character, and it is uppercased if the underlying execute bit is
 * NOT set, which is the same convention `ls -l` uses. */
function formatTriplet(bits: number, specialChar: 's' | 't' | null): string {
    const r = (bits & 4) !== 0 ? 'r' : '-';
    const w = (bits & 2) !== 0 ? 'w' : '-';
    const executable = (bits & 1) !== 0;
    let x: string;
    if (specialChar !== null) {
        x = executable ? specialChar : specialChar.toUpperCase();
    } else {
        x = executable ? 'x' : '-';
    }
    return `${r}${w}${x}`;
}

function formatSymbolic(mode: number): string {
    const [special, owner, group, other] = splitDigits(mode);
    return formatTriplet(owner, (special & 4) !== 0 ? 's' : null)
        + formatTriplet(group, (special & 2) !== 0 ? 's' : null)
        + formatTriplet(other, (special & 1) !== 0 ? 't' : null);
}

/** Accepts 1 to 4 octal digits. `chmod` pads a shorter number on the left with
 * zeros, so "7" really means 0007, and this does the same. */
function parseOctal(text: string): number | null {
    const trimmed = text.trim();
    if (!/^[0-7]{1,4}$/.test(trimmed)) return null;
    return parseInt(trimmed.padStart(4, '0'), 8);
}

/** Accepts a 9-character rwx string, optionally prefixed with the file-type
 * character from `ls -l` so a pasted "drwxr-xr-x" works as-is. */
function parseSymbolic(text: string): number | null {
    let body = text.trim();
    if (body.length === 10 && /^[-dlbcpsD]/.test(body)) body = body.slice(1);
    if (body.length !== 9) return null;

    let mode = 0;
    for (let i = 0; i < 3; i++) {
        const r = body[i * 3];
        const w = body[i * 3 + 1];
        const x = body[i * 3 + 2];

        let bits = 0;
        if (r === 'r') bits |= 4;
        else if (r !== '-') return null;
        if (w === 'w') bits |= 2;
        else if (w !== '-') return null;

        const special = i === 2 ? 't' : 's';
        if (x === 'x') {
            bits |= 1;
        } else if (x === special) {
            bits |= 1;
            mode |= SPECIAL_VALUES[i] << 9;
        } else if (x === special.toUpperCase()) {
            mode |= SPECIAL_VALUES[i] << 9;
        } else if (x !== '-') {
            return null;
        }

        mode |= bits << ((2 - i) * 3);
    }
    return mode;
}

function describeBits(bits: number): string {
    const parts: string[] = [];
    if ((bits & 4) !== 0) parts.push('read');
    if ((bits & 2) !== 0) parts.push('write');
    if ((bits & 1) !== 0) parts.push('execute');
    if (parts.length === 0) return 'no access';
    if (parts.length === 1) return parts[0];
    return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function describeMode(mode: number): string {
    const [, owner, group, other] = splitDigits(mode);
    return `Owner: ${describeBits(owner)}. Group: ${describeBits(group)}. Others: ${describeBits(other)}.`;
}

const boxSx = {
    p: 1.5,
    borderRadius: '10px',
    bgcolor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)',
};

const ChmodCalculator: React.FC = () => {
    const theme = useTheme();
    const [mode, setMode] = useState(0o755);
    const [octalText, setOctalText] = useState('755');
    const [symbolicText, setSymbolicText] = useState('rwxr-xr-x');
    const [octalError, setOctalError] = useState('');
    const [symbolicError, setSymbolicError] = useState('');
    const [target, setTarget] = useState('filename');
    const [copied, setCopied] = useState(false);

    /** Single entry point for "the mode changed": re-derives both text fields
     * so the three views can never drift out of sync. */
    const applyMode = useCallback((next: number) => {
        setMode(next);
        setOctalText(formatOctal(next));
        setSymbolicText(formatSymbolic(next));
        setOctalError('');
        setSymbolicError('');
    }, []);

    const togglePerm = useCallback((classIndex: number, permIndex: number) => {
        const bit = 1 << ((2 - classIndex) * 3 + (2 - permIndex));
        applyMode(mode ^ bit);
    }, [mode, applyMode]);

    const toggleSpecial = useCallback((index: number) => {
        applyMode(mode ^ (SPECIAL_VALUES[index] << 9));
    }, [mode, applyMode]);

    const onOctalChange = useCallback((value: string) => {
        setOctalText(value);
        const parsed = parseOctal(value);
        if (parsed === null) {
            setOctalError('Use 1 to 4 octal digits, each from 0 to 7, for example 755 or 4755.');
            return;
        }
        setOctalError('');
        setMode(parsed);
        setSymbolicText(formatSymbolic(parsed));
        setSymbolicError('');
    }, []);

    const onSymbolicChange = useCallback((value: string) => {
        setSymbolicText(value);
        const parsed = parseSymbolic(value);
        if (parsed === null) {
            setSymbolicError('Use 9 characters: rwx, rws/rwS for the owner and group, rwt/rwT for others, and a dash where a bit is off.');
            return;
        }
        setSymbolicError('');
        setMode(parsed);
        setOctalText(formatOctal(parsed));
        setOctalError('');
    }, []);

    const command = `chmod ${formatOctal(mode)} ${target.trim() || 'filename'}`;

    const copyCommand = () => {
        navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const [special] = splitDigits(mode);

    return (
        <ServicePageShell
            icon={FolderShared}
            title="Chmod Permission Calculator"
            subtitle="Convert between the checkbox grid, the octal number and the rwx symbolic string, including the setuid, setgid and sticky bits"
            maxWidth="md"
            toolId={101}
            seoTitle="Chmod Calculator | Unix File Permission Octal & Symbolic Converter"
            seoDescription="Free chmod calculator. Tick read, write and execute for owner, group and other to get the octal mode and the rwx symbolic string, or type either one and watch the rest update. Handles setuid, setgid and the sticky bit, and runs entirely in your browser."
            keywords={['chmod calculator', 'file permission calculator', 'unix permissions calculator', 'octal permission converter', 'chmod 755', 'rwx to octal', 'setuid setgid sticky bit calculator', 'linux file permissions']}
            about="Unix file permissions have three equivalent faces: a grid of nine on/off bits, a three or four digit octal number, and the rwxr-xr-x string that ls -l prints. This tool keeps all three in step, so you can tick a box, type 644, or paste a permission string from a terminal and immediately read the other two forms. It covers the special bits as well, which is where most permission calculators quietly go wrong: setuid, setgid and the sticky bit appear as a fourth leading octal digit and replace the execute character in the symbolic form, uppercased when the underlying execute bit is off. Everything runs in your browser, and nothing is sent anywhere."
            howToSteps={[
                { name: 'Tick the permissions you want', text: 'The grid has a row for owner, group and other, and a column for read, write and execute. Tick the boxes that should be allowed.' },
                { name: 'Or type a mode directly', text: 'Type an octal value like 644 into the octal field, or paste a string like rwxr-xr-x (or drwxr-xr-x straight from ls -l) into the symbolic field. The other two views follow along.' },
                { name: 'Add special bits if you need them', text: 'setuid, setgid and the sticky bit sit below the grid. Turning any of them on adds the fourth leading octal digit and changes the matching execute character.' },
                { name: 'Copy the command', text: 'Set the file or directory name and copy the finished chmod command straight into your terminal.' },
            ]}
            faq={[
                {
                    question: 'Do read, write and execute mean the same thing for a directory as for a file?',
                    answer: 'No, and this catches people out constantly. On a file the three bits are what you would expect: read lets you see the contents, write lets you change them, execute lets you run the file as a program or script. On a directory the meanings shift. Read lets you list the names inside it. Write lets you create, rename and delete entries in it, which means write permission on a directory is enough to delete a file you have no write permission on. Execute, often called the search bit here, lets you traverse into the directory and reach things by path. A directory with read but no execute lets you see a list of names while every attempt to open one fails, and a directory with execute but no read lets you open a path you already know while ls comes back empty. That is why directories almost always want the execute bit set wherever read is set, which is where 755 for directories and 644 for files comes from.',
                },
                {
                    question: 'What do setuid, setgid and the sticky bit actually do?',
                    answer: 'setuid on an executable makes it run as the file owner rather than as whoever launched it, which is how a program like passwd can update a root-owned file on your behalf. setgid does the same for the group, and on a directory it does something different and rather useful: new files created inside inherit the directory group instead of the creator\'s primary group, which is the usual way of keeping a shared project directory tidy. The sticky bit on a directory restricts deletion to the owner of each file, the directory owner, or root, which is why anyone can create files in /tmp but nobody can remove someone else\'s.',
                },
                {
                    question: 'Why does the symbolic form sometimes show a capital S or T?',
                    answer: 'The special bits have no column of their own in a nine-character string, so they are folded into the execute position of the class they affect. Lowercase means the special bit and the execute bit are both set. Uppercase means the special bit is set while execute is not. So rwsr-xr-x has setuid on an owner-executable file, while rwSr-xr-x has setuid on something the owner cannot execute, which is normally a mistake worth looking at. The same pairing applies to setgid in the group triplet and to the sticky bit as t and T in the last triplet.',
                },
                {
                    question: 'Why is 777 almost always the wrong fix?',
                    answer: 'It works, which is exactly the problem: it stops the error message without telling you what the real permission mismatch was. 777 grants write and execute to every account on the machine, so any compromised process, any other tenant on a shared host, and any service running as a different user can rewrite your files or drop an executable in place. Web servers and SSH are also entitled to refuse world-writable content: sshd ignores an authorized_keys file with loose permissions, and many PHP and CGI setups refuse world-writable scripts. The fix that actually holds is to work out which user or group needs the access, set ownership with chown or chgrp, and grant the narrowest mode that satisfies it, usually 755 for directories and executables and 644 for ordinary files.',
                },
                {
                    question: 'Does the mode I set here fully decide who can open the file?',
                    answer: 'It decides the traditional permission check, but a few other things sit alongside it. Every directory on the path needs execute permission before the file is reachable at all. Your umask subtracts bits from the mode new files are created with, though it has no effect on an explicit chmod. And POSIX ACLs, SELinux or AppArmor policy, and mount options such as ro or noexec can all deny something the mode allows. A plus sign at the end of the ls -l permission string is the hint that an ACL is present and getfacl is worth a look.',
                },
            ]}
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
                <CardContent sx={{ p: 1 }}>
                    <Box sx={{ ...boxSx, p: 2 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '80px repeat(3, 1fr)', alignItems: 'center', rowGap: 0.5 }}>
                            <Box />
                            {PERM_LABELS.map(perm => (
                                <Typography key={perm} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                                    {perm}
                                </Typography>
                            ))}

                            {CLASS_LABELS.map((cls, classIndex) => (
                                <React.Fragment key={cls}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{cls}</Typography>
                                    {PERM_LABELS.map((perm, permIndex) => {
                                        const bit = 1 << ((2 - classIndex) * 3 + (2 - permIndex));
                                        return (
                                            <Box key={perm} sx={{ textAlign: 'center' }}>
                                                <Checkbox
                                                    checked={(mode & bit) !== 0}
                                                    onChange={() => togglePerm(classIndex, permIndex)}
                                                    inputProps={{ 'aria-label': `${cls} ${perm}` }}
                                                />
                                            </Box>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </Box>

                        <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0, sm: 2 } }}>
                            {SPECIAL_LABELS.map((label, index) => (
                                <FormControlLabel
                                    key={label}
                                    control={
                                        <Checkbox
                                            size="small"
                                            checked={(special & SPECIAL_VALUES[index]) !== 0}
                                            onChange={() => toggleSpecial(index)}
                                        />
                                    }
                                    label={<Typography variant="body2">{label}</Typography>}
                                />
                            ))}
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                        <TextField
                            label="Octal"
                            value={octalText}
                            onChange={e => onOctalChange(e.target.value)}
                            error={octalError !== ''}
                            helperText={octalError || 'Three digits, or four when a special bit is set'}
                            sx={{ flex: '1 1 180px' }}
                            inputProps={{ spellCheck: false, style: { fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.1em' } }}
                        />
                        <TextField
                            label="Symbolic"
                            value={symbolicText}
                            onChange={e => onSymbolicChange(e.target.value)}
                            error={symbolicError !== ''}
                            helperText={symbolicError || 'The nine-character rwx string, as printed by ls -l'}
                            sx={{ flex: '2 1 260px' }}
                            inputProps={{ spellCheck: false, style: { fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.1em' } }}
                        />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        {describeMode(mode)}
                    </Typography>

                    <TextField
                        fullWidth
                        size="small"
                        label="File or directory"
                        value={target}
                        onChange={e => setTarget(e.target.value)}
                        sx={{ mt: 2 }}
                        inputProps={{ spellCheck: false, style: { fontFamily: 'monospace' } }}
                    />

                    <Box sx={{ ...boxSx, mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography sx={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: theme.palette.primary.main,
                            wordBreak: 'break-all',
                        }}>
                            {command}
                        </Typography>
                        <Tooltip title={copied ? 'Copied' : 'Copy command'}>
                            <IconButton
                                size="small"
                                onClick={copyCommand}
                                aria-label="Copy chmod command"
                                sx={{ color: copied ? 'success.main' : 'text.secondary', flexShrink: 0 }}
                            >
                                {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default ChmodCalculator;
