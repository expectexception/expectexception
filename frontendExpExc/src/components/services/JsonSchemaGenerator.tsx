import React, { useMemo, useState } from 'react';
import {
    Card, CardContent, Box, Typography, TextField, Grid, Paper, Alert, Switch,
    FormControlLabel, IconButton, Tooltip,
} from '@mui/material';
import { Schema as SchemaIcon, ContentCopy, Check } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** The subset of JSON Schema this tool can produce. Everything is optional
 * because a schema for a bare scalar carries nothing but `type`. */
interface InferredSchema {
    type?: string;
    format?: string;
    properties?: { [key: string]: InferredSchema };
    required?: string[];
    items?: InferredSchema;
    anyOf?: InferredSchema[];
    examples?: JsonValue[];
}

interface InferOptions {
    includeRequired: boolean;
    inferFormats: boolean;
    includeExamples: boolean;
}

const DIALECT = 'https://json-schema.org/draft/2020-12/schema';

/* Deliberately strict patterns, anchored at both ends. A loose pattern that
 * tags "12:30" as a date-time or "a:b" as a uri produces a schema that rejects
 * perfectly good future data, so each of these matches only the full,
 * well-formed shape and nothing near it. Order matters: date-time is tried
 * before date, and uri last. */
const FORMAT_PATTERNS: ReadonlyArray<{ format: string; pattern: RegExp }> = [
    {
        format: 'date-time',
        pattern: /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])[Tt](?:[01]\d|2[0-3]):[0-5]\d:(?:[0-5]\d|60)(?:\.\d+)?(?:[Zz]|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/,
    },
    {
        format: 'date',
        pattern: /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/,
    },
    {
        format: 'uuid',
        pattern: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    },
    {
        format: 'email',
        pattern: /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/,
    },
    {
        format: 'uri',
        pattern: /^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s/?#]+\S*$/,
    },
];

const MAX_EXAMPLES = 5;

/** Key-sorted serialisation, used only to tell two schemas apart when
 * deduplicating. Plain JSON.stringify would call {"a":1,"b":2} and
 * {"b":2,"a":1} different schemas. */
function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    const obj = value as { [key: string]: unknown };
    return `{${Object.keys(obj).sort().map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function dedupe(schemas: InferredSchema[]): InferredSchema[] {
    const seen: { [key: string]: true } = {};
    const out: InferredSchema[] = [];
    for (const schema of schemas) {
        const key = stableStringify(schema);
        if (!seen[key]) {
            seen[key] = true;
            out.push(schema);
        }
    }
    return out;
}

/** Pulls the branches of a nested anyOf up into the pool, so merging an array
 * of already-merged schemas never nests anyOf inside anyOf. */
function flattenAnyOf(schemas: InferredSchema[]): InferredSchema[] {
    const out: InferredSchema[] = [];
    for (const schema of schemas) {
        if (schema.anyOf && Object.keys(schema).length === 1) out.push(...schema.anyOf);
        else out.push(schema);
    }
    return out;
}

function collectExamples(group: InferredSchema[]): JsonValue[] {
    const seen: { [key: string]: true } = {};
    const out: JsonValue[] = [];
    for (const schema of group) {
        if (!schema.examples) continue;
        for (const example of schema.examples) {
            if (out.length >= MAX_EXAMPLES) return out;
            const key = stableStringify(example);
            if (!seen[key]) {
                seen[key] = true;
                out.push(example);
            }
        }
    }
    return out;
}

/** Combines the schemas inferred from several array elements into one schema
 * that accepts all of them. */
function mergeSchemas(input: InferredSchema[]): InferredSchema {
    let pool = dedupe(flattenAnyOf(input));
    if (pool.length === 1) return pool[0];

    // Every integer is also a valid number, so a mix of the two collapses
    // rather than becoming an anyOf of two overlapping numeric types.
    if (pool.some(s => s.type === 'integer') && pool.some(s => s.type === 'number')) {
        pool = dedupe(pool.map(s => (s.type === 'integer' ? { ...s, type: 'number' } : s)));
        if (pool.length === 1) return pool[0];
    }

    const order: string[] = [];
    const byType: { [type: string]: InferredSchema[] } = {};
    for (const schema of pool) {
        const type = schema.type || '';
        if (!byType[type]) {
            byType[type] = [];
            order.push(type);
        }
        byType[type].push(schema);
    }

    const merged = order.map(type => {
        const group = byType[type];
        return group.length === 1 ? group[0] : mergeSameType(type, group);
    });

    if (merged.length === 1) return merged[0];
    return { anyOf: dedupe(merged) };
}

function mergeSameType(type: string, group: InferredSchema[]): InferredSchema {
    if (type === 'object') {
        const propOrder: string[] = [];
        const collected: { [key: string]: InferredSchema[] } = {};
        for (const schema of group) {
            if (!schema.properties) continue;
            for (const key of Object.keys(schema.properties)) {
                if (!collected[key]) {
                    collected[key] = [];
                    propOrder.push(key);
                }
                collected[key].push(schema.properties[key]);
            }
        }
        const properties: { [key: string]: InferredSchema } = {};
        for (const key of propOrder) properties[key] = mergeSchemas(collected[key]);

        const out: InferredSchema = { type: 'object', properties };

        // A key that is missing from even one of the sampled objects cannot be
        // required, so the merged `required` list is the intersection.
        const requiredLists = group.map(s => s.required);
        if (requiredLists.length > 0 && requiredLists.every(list => list !== undefined)) {
            const shared = propOrder.filter(key => requiredLists.every(list => (list as string[]).indexOf(key) !== -1));
            if (shared.length > 0) out.required = shared;
        }
        return out;
    }

    if (type === 'array') {
        const itemSchemas: InferredSchema[] = [];
        for (const schema of group) {
            if (schema.items) itemSchemas.push(schema.items);
        }
        if (itemSchemas.length === 0) return { type: 'array' };
        return { type: 'array', items: mergeSchemas(itemSchemas) };
    }

    const out: InferredSchema = {};
    if (type !== '') out.type = type;
    // A format survives the merge only if every sample carried the same one.
    const formats = group.map(s => s.format);
    if (formats[0] !== undefined && formats.every(f => f === formats[0])) out.format = formats[0];
    const examples = collectExamples(group);
    if (examples.length > 0) out.examples = examples;
    return out;
}

function withExamples(schema: InferredSchema, value: JsonValue, options: InferOptions): InferredSchema {
    if (!options.includeExamples) return schema;
    return { ...schema, examples: [value] };
}

function inferSchema(value: JsonValue, options: InferOptions): InferredSchema {
    if (value === null) return withExamples({ type: 'null' }, value, options);

    if (Array.isArray(value)) {
        // Nothing can honestly be said about the items of an empty array, so
        // no `items` keyword is emitted at all.
        if (value.length === 0) return { type: 'array' };
        return { type: 'array', items: mergeSchemas(value.map(item => inferSchema(item, options))) };
    }

    if (typeof value === 'object') {
        const obj = value as { [key: string]: JsonValue };
        const keys = Object.keys(obj);
        const properties: { [key: string]: InferredSchema } = {};
        for (const key of keys) properties[key] = inferSchema(obj[key], options);
        const schema: InferredSchema = { type: 'object', properties };
        if (options.includeRequired && keys.length > 0) schema.required = keys.slice();
        return schema;
    }

    if (typeof value === 'string') {
        const schema: InferredSchema = { type: 'string' };
        if (options.inferFormats) {
            for (const candidate of FORMAT_PATTERNS) {
                if (candidate.pattern.test(value)) {
                    schema.format = candidate.format;
                    break;
                }
            }
        }
        return withExamples(schema, value, options);
    }

    if (typeof value === 'number') {
        return withExamples({ type: Number.isInteger(value) ? 'integer' : 'number' }, value, options);
    }

    return withExamples({ type: 'boolean' }, value, options);
}

/** Rebuilds the schema as a plain object with the keywords in conventional
 * reading order, since JSON.stringify follows insertion order. */
function toOrderedObject(schema: InferredSchema): { [key: string]: unknown } {
    const out: { [key: string]: unknown } = {};
    if (schema.type !== undefined) out.type = schema.type;
    if (schema.format !== undefined) out.format = schema.format;
    if (schema.properties !== undefined) {
        const properties: { [key: string]: unknown } = {};
        for (const key of Object.keys(schema.properties)) properties[key] = toOrderedObject(schema.properties[key]);
        out.properties = properties;
    }
    if (schema.required !== undefined) out.required = schema.required;
    if (schema.items !== undefined) out.items = toOrderedObject(schema.items);
    if (schema.anyOf !== undefined) out.anyOf = schema.anyOf.map(toOrderedObject);
    if (schema.examples !== undefined) out.examples = schema.examples;
    return out;
}

function generateSchema(text: string, options: InferOptions): { schema: string; error: string } {
    if (text.trim() === '') return { schema: '', error: '' };
    let parsed: JsonValue;
    try {
        // JSON.parse is declared as returning `any`. The value really can be
        // any JSON, so it is narrowed to JsonValue here and after this point
        // is only inspected through typeof and Array.isArray.
        parsed = JSON.parse(text) as JsonValue;
    } catch (err) {
        return { schema: '', error: err instanceof Error ? err.message : String(err) };
    }
    const root = toOrderedObject(inferSchema(parsed, options));
    return { schema: JSON.stringify({ $schema: DIALECT, ...root }, null, 2), error: '' };
}

const SAMPLE = `{
  "id": 4815,
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "score": 91.5,
  "active": true,
  "nickname": null,
  "homepage": "https://example.com/ada",
  "createdAt": "2024-03-11T09:30:00Z",
  "tags": ["engineer", "author"],
  "readings": [10, 20.5],
  "history": [],
  "address": {
    "city": "London",
    "postcode": "NW1 4RY"
  },
  "logins": [
    { "ip": "10.0.0.1", "ok": true },
    { "ip": "10.0.0.2", "ok": false, "note": "retried" }
  ],
  "mixed": [1, "two", null]
}`;

const JsonSchemaGenerator: React.FC = () => {
    const [input, setInput] = useState(SAMPLE);
    const [includeRequired, setIncludeRequired] = useState(true);
    const [inferFormats, setInferFormats] = useState(false);
    const [includeExamples, setIncludeExamples] = useState(false);
    const [copied, setCopied] = useState(false);

    const { schema, error } = useMemo(
        () => generateSchema(input, { includeRequired, inferFormats, includeExamples }),
        [input, includeRequired, inferFormats, includeExamples],
    );

    const copy = () => {
        navigator.clipboard.writeText(schema);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    return (
        <ServicePageShell
            icon={SchemaIcon}
            title="JSON Schema Generator"
            subtitle="Paste a sample JSON document and get a draft 2020-12 schema inferred from it, with real array merging and optional format detection"
            maxWidth="md"
            toolId={102}
            seoTitle="JSON Schema Generator | Infer Draft 2020-12 Schema from Sample JSON"
            seoDescription="Free JSON Schema generator. Paste a sample JSON document and get a draft 2020-12 schema with types, properties, required keys and merged array item schemas. Optional format and examples inference, all in your browser."
            keywords={['json schema generator', 'json to json schema', 'infer json schema', 'draft 2020-12 schema generator', 'json schema from sample', 'generate json schema online', 'json schema inference']}
            about="Give it a representative JSON document and it walks the whole structure, assigning a type to every value and building the matching JSON Schema in the draft 2020-12 dialect. Objects become properties with a required list, arrays get an items schema merged from every element that was present, and nesting is followed to any depth. Where array elements disagree it does the honest thing: same-type elements have their properties unioned, differing types become an anyOf of the distinct alternatives, and an empty array gets no items keyword because there is nothing there to infer from. Format detection and examples are both off by default, since a guess baked into a schema is harder to notice than one you asked for."
            howToSteps={[
                { name: 'Paste your JSON', text: 'Drop a sample document into the input panel. It can be an object, an array, or a bare value, and it can nest as deeply as you like.' },
                { name: 'Choose your options', text: 'Keep the required list or drop it, turn on format detection for strings that look like dates, emails, UUIDs or URIs, and add examples carrying the sampled values.' },
                { name: 'Review and copy', text: 'The schema regenerates as you type. Read it over, tighten anything the sample could not tell you, and copy it out.' },
            ]}
            faq={[
                {
                    question: 'How accurate is an inferred schema?',
                    answer: 'It is an accurate description of the document you pasted and a first draft of everything else. Inference can only see one sample, so it will confidently make claims your real data does not support. A field that happens to be present becomes required, even if it is optional three quarters of the time. A price that happens to arrive as 40 is typed integer, and the first 40.50 that comes along fails validation. A string field gives you nothing about length, allowed values or pattern. Treat the output as scaffolding: run it past a second and third real payload, relax the required list, widen integer to number where the value is a quantity rather than a count, and add the constraints only a human knows about.',
                },
                {
                    question: 'What happens when the elements of an array are not all the same shape?',
                    answer: 'Each element is inferred separately and the results are merged. Identical schemas collapse into one. Elements that share a type are merged in place: two objects become a single object schema whose properties are the union of both, with required narrowed to the keys present in every element, so a key that appeared in only one of them stays optional. Nested arrays merge their item schemas the same way, recursively. Integer and number are treated as overlapping and collapse to number. Only when the types actually differ do you get {"anyOf": [...]} listing the distinct alternatives, so [1, "two", null] produces three named branches instead of a schema that gives up and accepts anything.',
                },
                {
                    question: 'Why is format detection turned off by default?',
                    answer: 'Because a wrong format is worse than no format. It is silently permissive in most validators and quietly wrong in the strict ones, and either way it is easy to miss in review. The patterns here are anchored and have to match the entire string: date-time wants a full RFC 3339 timestamp with an offset or a Z, date wants a calendar date with a real month and day range, uuid wants the exact 8-4-4-4-12 hex layout, and uri insists on a scheme followed by a proper authority so that a value like "note: see below" is never mistaken for one. Anything short of a full match is left as a plain string.',
                },
                {
                    question: 'Why does an empty array come out with no items keyword?',
                    answer: 'There is no evidence in an empty array about what belongs in it. Emitting something like {"type": "array", "items": {}} would look more complete while saying nothing, and emitting a guess would be an invention. So the output stops at {"type": "array"}, which validates any array, and leaves a visible gap for you to fill once you know what the list actually holds.',
                },
                {
                    question: 'Which dialect does it emit, and will it work with my validator?',
                    answer: 'Draft 2020-12, declared with the $schema keyword at the top. The keywords used here (type, properties, required, items, anyOf, format, examples) all behave the same way in draft 07 as well, so if your tooling is pinned to an older draft you can usually change the $schema line and carry on. Ajv, python-jsonschema and the Go and Rust implementations all read the output as-is.',
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
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0, sm: 2 }, mb: 1.5 }}>
                        <FormControlLabel
                            control={<Switch size="small" checked={includeRequired} onChange={e => setIncludeRequired(e.target.checked)} />}
                            label={<Typography variant="body2">Include required</Typography>}
                        />
                        <FormControlLabel
                            control={<Switch size="small" checked={inferFormats} onChange={e => setInferFormats(e.target.checked)} />}
                            label={<Typography variant="body2">Infer string formats</Typography>}
                        />
                        <FormControlLabel
                            control={<Switch size="small" checked={includeExamples} onChange={e => setIncludeExamples(e.target.checked)} />}
                            label={<Typography variant="body2">Include examples</Typography>}
                        />
                    </Box>

                    {error !== '' && (
                        <Alert severity="error" sx={{ mb: 1.5 }}>
                            Could not parse that as JSON. {error}
                        </Alert>
                    )}

                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                Sample JSON
                            </Typography>
                            <TextField
                                multiline
                                rows={18}
                                fullWidth
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                error={error !== ''}
                                placeholder="Paste a JSON document here"
                                inputProps={{ spellCheck: false, style: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                    JSON Schema (draft 2020-12)
                                </Typography>
                                {schema !== '' && (
                                    <Tooltip title={copied ? 'Copied' : 'Copy schema'}>
                                        <IconButton
                                            size="small"
                                            onClick={copy}
                                            aria-label="Copy generated schema"
                                            sx={{ color: copied ? 'success.main' : 'text.secondary' }}
                                        >
                                            {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Box>
                            <Paper sx={{
                                p: 2,
                                bgcolor: '#0d1117',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.06)',
                                height: 430,
                                overflow: 'auto',
                            }}>
                                <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#c9d1d9', m: 0, whiteSpace: 'pre' }}>
                                    {schema || <span style={{ color: '#64748b' }}>The generated schema will appear here.</span>}
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default JsonSchemaGenerator;
