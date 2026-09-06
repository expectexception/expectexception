import React from 'react';
import {
    Container,
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Stack,
    Chip,
    alpha,
    useTheme,
} from '@mui/material';
import Seo from '../components/seo/Seo';
import { AiSvg } from '../components/layout/AnimatedSvgs';
import {
    AccountTree,
    Bolt,
    Memory,
    Gavel,
    Search,
    SupportAgent,
    Description,
    BugReport,
    Inventory,
    ArrowForward,
    CheckCircle,
    Terminal,
    Layers,
    Hub,
    Psychology,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface Capability {
    title: string;
    icon: React.ReactNode;
    desc: string;
    color: string;
}

interface UseCase {
    icon: React.ReactNode;
    title: string;
    desc: string;
}

const AutonomousAIAgentsPage: React.FC = () => {
    const theme = useTheme();
    const primaryColor = theme.palette.primary.main;

    const capabilities: Capability[] = [
        {
            title: 'Multi-Agent Orchestration',
            icon: <AccountTree sx={{ fontSize: 32 }} />,
            desc: 'A planner agent breaks a goal into steps, hands each one to a specialist agent, and checks the results before moving on. This keeps a single prompt from being asked to do too much at once, and makes each stage inspectable on its own.',
            color: primaryColor,
        },
        {
            title: 'Retrieval-Augmented Generation',
            icon: <Search sx={{ fontSize: 32 }} />,
            desc: 'An agent that answers from your actual documents instead of guessing. Content gets embedded into a vector store (pgvector or Pinecone), and a query pulls back the passages that are actually relevant before the model ever sees the question.',
            color: theme.palette.secondary.main,
        },
        {
            title: 'Tool Use & Function Calling',
            icon: <Terminal sx={{ fontSize: 32 }} />,
            desc: 'The model decides when to call a real function: hit an internal API, run a database query, send an email, or trigger a deploy. It reads the result and decides what to do next, rather than just producing text and stopping there.',
            color: '#f59e0b',
        },
        {
            title: 'Long-Running Background Workers',
            icon: <Bolt sx={{ fontSize: 32 }} />,
            desc: 'Not every agent task finishes in a few seconds. A multi-step research or data-processing job runs as a Celery task against Redis, checkpointed so it can resume after a failure instead of starting over from nothing.',
            color: '#ef4444',
        },
        {
            title: 'Memory & State',
            icon: <Memory sx={{ fontSize: 32 }} />,
            desc: 'Short-term memory keeps a single conversation or task coherent across many steps. Long-term memory stores facts learned in one session so a later one can pick up where things left off, rather than starting cold every time.',
            color: '#a855f7',
        },
        {
            title: 'Guardrails & Evaluation',
            icon: <Gavel sx={{ fontSize: 32 }} />,
            desc: 'Output validation, retry logic when a tool call fails or a response comes back malformed, and a human-in-the-loop approval step for anything with real-world consequences, like sending an email or moving money.',
            color: '#0ea5e9',
        },
    ];

    const useCases: UseCase[] = [
        {
            icon: <SupportAgent />,
            title: 'Customer support triage',
            desc: 'An agent reads an incoming ticket, checks it against your docs and past tickets, drafts a reply, and either sends it or escalates to a human when it is not confident.',
        },
        {
            icon: <Description />,
            title: 'Document and contract review',
            desc: 'Pull key terms, flag clauses that deviate from a standard template, and produce a summary a human can approve in minutes instead of reading the whole document cold.',
        },
        {
            icon: <BugReport />,
            title: 'Code review and CI assistants',
            desc: 'An agent reads a diff, runs the test suite, checks it against your team\'s actual conventions, and leaves comments on a pull request instead of a person doing a first pass by hand.',
        },
        {
            icon: <Inventory />,
            title: 'Data pipeline agents',
            desc: 'Watch an inbox, a spreadsheet, or an upload folder, extract and clean the data that lands there, and load it somewhere useful, the kind of task that is usually done by a person copying and pasting.',
        },
    ];

    const stack = [
        'Python', 'LangGraph', 'OpenAI / Anthropic APIs', 'pgvector / Pinecone',
        'Celery + Redis', 'Django / FastAPI', 'Docker', 'PostgreSQL',
    ];

    const processSteps = [
        {
            step: '01',
            title: 'Map the workflow',
            desc: 'We start from the actual manual process, not a blank page. What decision is being made, what information does it need, and where does it currently break down.',
        },
        {
            step: '02',
            title: 'Design the agent graph',
            desc: 'Decide what runs as a single LLM call versus a multi-step agent, where retrieval fits, which actions need a tool call, and where a human should stay in the loop.',
        },
        {
            step: '03',
            title: 'Build and evaluate',
            desc: 'Ship a working version against real examples early, then tighten prompts, retries, and guardrails against the cases where it actually gets something wrong.',
        },
        {
            step: '04',
            title: 'Deploy and monitor',
            desc: 'Runs as a proper background service with logging and alerting, not a notebook someone has to remember to re-run.',
        },
    ];

    return (
        <Box sx={{ minHeight: '100vh', pb: 8, bgcolor: '#050505' }}>
            <Seo
                title="Autonomous AI Agents & Agentic Workflows | ExpectException"
                description="We design and build multi-agent orchestration pipelines, RAG systems, and autonomous background workers that handle real multi-step reasoning, not just a single prompt-response chatbot."
                keywords={['autonomous ai agents', 'agentic workflow', 'ai agent development', 'multi-agent orchestration', 'rag system development', 'langgraph developer', 'llm background workers', 'ai automation agency']}
            />

            {/* Hero */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${alpha(primaryColor, 0.08)} 0%, transparent 100%)`,
                    py: { xs: 8, md: 12 },
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{
                    position: 'absolute',
                    top: '-10%',
                    right: '-10%',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(primaryColor, 0.08)} 0%, transparent 70%)`,
                    filter: 'blur(40px)',
                    pointerEvents: 'none',
                }} />

                <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                    <Grid container spacing={6} alignItems="center">
                        <Grid item xs={12} md={7.5}>
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                                <Chip
                                    icon={<Psychology />}
                                    label="Autonomous AI Agents & RAG"
                                    sx={{
                                        bgcolor: alpha(primaryColor, 0.1),
                                        color: primaryColor,
                                        borderColor: alpha(primaryColor, 0.2),
                                        borderWidth: 1,
                                        borderStyle: 'solid',
                                        fontWeight: 700,
                                        mb: 3,
                                        '& .MuiChip-icon': { color: primaryColor, ml: '10px' },
                                    }}
                                />
                                <Typography
                                    variant="h2"
                                    component="h1"
                                    gutterBottom
                                    fontWeight="900"
                                    sx={{
                                        background: `linear-gradient(135deg, #ffffff 30%, ${primaryColor} 100%)`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        fontSize: { xs: '2.2rem', sm: '3rem', md: '3.75rem' },
                                        lineHeight: 1.1,
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    Agentic Workflows That Actually Finish the Job
                                </Typography>
                                <Typography
                                    variant="h5"
                                    color="text.secondary"
                                    sx={{ mb: 5, fontSize: { xs: '1.05rem', sm: '1.25rem' }, fontWeight: 400, lineHeight: 1.6 }}
                                >
                                    A chatbot answers one question at a time. An agentic workflow plans a task, calls the tools it needs, checks its own work, and keeps going until the task is actually done, running as a real background process instead of a single request-response exchange.
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        endIcon={<ArrowForward />}
                                        component={Link}
                                        to="/hire#contact"
                                        sx={{
                                            px: 4, py: 1.75, borderRadius: '30px', fontWeight: 800, fontSize: '0.95rem',
                                            background: primaryColor, color: '#000000',
                                            '&:hover': { background: alpha(primaryColor, 0.9), boxShadow: `0 8px 25px ${alpha(primaryColor, 0.4)}` },
                                        }}
                                    >
                                        Start a Project
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        component={Link}
                                        to="/services"
                                        sx={{
                                            px: 4, py: 1.75, borderRadius: '30px', fontSize: '0.95rem',
                                            borderColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff',
                                            '&:hover': { borderColor: primaryColor, color: primaryColor, bgcolor: alpha(primaryColor, 0.03) },
                                        }}
                                    >
                                        Try the Free Tools
                                    </Button>
                                </Stack>
                            </motion.div>
                        </Grid>
                        <Grid item xs={12} md={4.5}>
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
                                <Card sx={{
                                    background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.6) 0%, rgba(13, 14, 18, 0.2) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    p: 4, borderRadius: 4, boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                }}>
                                    <Box sx={{ width: 120, height: 120 }}>
                                        <AiSvg />
                                    </Box>
                                    <Stack spacing={2.5} sx={{ width: '100%' }}>
                                        {[
                                            { label: 'Runs as', value: 'Background service' },
                                            { label: 'Not', value: 'A single prompt' },
                                            { label: 'Includes', value: 'Retries & guardrails' },
                                        ].map((row) => (
                                            <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" color="text.secondary" fontWeight={550}>{row.label}</Typography>
                                                <Typography variant="body1" fontWeight={800} color="primary.main">{row.value}</Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Card>
                            </motion.div>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* What is an agentic workflow */}
            <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
                <Typography variant="h6" color="primary.main" fontWeight={700} sx={{ mb: 1, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>
                    What This Actually Means
                </Typography>
                <Typography variant="h3" fontWeight={900} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem' }, letterSpacing: '-0.02em', textAlign: 'center', mb: 4 }}>
                    An agent, plainly, is a loop
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.05rem', lineHeight: 1.9, mb: 3 }}>
                    Give a language model a goal, a set of tools it is allowed to call, and a way to check whether it is making progress. It reads the current state, decides on a next action, calls a tool or asks another agent for help, looks at what came back, and decides what to do next. That loop keeps running until the goal is met, a limit is hit, or a step needs a human to sign off.
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.05rem', lineHeight: 1.9 }}>
                    That is the entire difference from a normal chatbot integration. A chatbot takes one input and produces one output. An agentic workflow keeps state across many steps, can fail partway through and recover, and does real work through tool calls rather than only producing text for a person to act on manually.
                </Typography>
            </Container>

            {/* Capabilities grid */}
            <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
                <Box sx={{ textAlign: 'center', mb: 7 }}>
                    <Typography variant="h3" fontWeight={900} gutterBottom sx={{ fontSize: { xs: '2rem', sm: '2.5rem' }, letterSpacing: '-0.02em' }}>
                        What Goes Into One of These
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 640, mx: 'auto', fontSize: { xs: '1rem', sm: '1.1rem' }, fontWeight: 400 }}>
                        Most real projects use several of these together, not just one.
                    </Typography>
                </Box>

                <Grid container spacing={3.5}>
                    {capabilities.map((cap, index) => (
                        <Grid item xs={12} sm={6} md={4} key={cap.title}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.06 }}
                                whileHover={{ y: -6 }}
                            >
                                <Card sx={{
                                    height: '100%', minHeight: 260,
                                    background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.5) 0%, rgba(13, 14, 18, 0.2) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': { borderColor: alpha(cap.color, 0.35), boxShadow: `0 16px 40px -12px ${alpha(cap.color, 0.2)}` },
                                }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{
                                            width: 52, height: 52, borderRadius: 2, background: alpha(cap.color, 0.1),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: cap.color, mb: 2.5,
                                        }}>
                                            {cap.icon}
                                        </Box>
                                        <Typography variant="h6" fontWeight={800} gutterBottom sx={{ fontSize: '1.05rem' }}>
                                            {cap.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.65 }}>
                                            {cap.desc}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* Use cases */}
            <Box sx={{ bgcolor: '#08090d', py: { xs: 8, md: 12 }, borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 7 }}>
                        <Typography variant="h3" fontWeight={900} gutterBottom sx={{ fontSize: { xs: '2rem', sm: '2.5rem' }, letterSpacing: '-0.02em' }}>
                            Where This Shows Up
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' }, fontWeight: 400 }}>
                            A few shapes this tends to take. Yours probably looks like a mix of two of these.
                        </Typography>
                    </Box>

                    <Grid container spacing={3.5}>
                        {useCases.map((uc, idx) => (
                            <Grid item xs={12} sm={6} key={uc.title}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: idx * 0.08 }}
                                >
                                    <Card sx={{
                                        height: '100%', p: 3.5,
                                        background: 'rgba(13, 14, 18, 0.4)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        transition: 'border-color 0.3s ease',
                                        '&:hover': { borderColor: alpha(primaryColor, 0.3) },
                                        display: 'flex', gap: 2.5,
                                    }}>
                                        <Box sx={{
                                            width: 48, height: 48, borderRadius: 2, flexShrink: 0,
                                            bgcolor: alpha(primaryColor, 0.1), display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', color: primaryColor,
                                        }}>
                                            {uc.icon}
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" fontWeight={800} sx={{ mb: 1, fontSize: '1.05rem' }}>
                                                {uc.title}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.65 }}>
                                                {uc.desc}
                                            </Typography>
                                        </Box>
                                    </Card>
                                </motion.div>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* Stack */}
            <Container maxWidth="md" sx={{ py: { xs: 8, md: 10 }, textAlign: 'center' }}>
                <Typography variant="h6" color="primary.main" fontWeight={700} sx={{ mb: 1, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    The Actual Stack
                </Typography>
                <Typography variant="h3" fontWeight={900} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem' }, letterSpacing: '-0.02em', mb: 4 }}>
                    Tools that hold up in production, not just a demo
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="center" useFlexGap sx={{ gap: 1.5 }}>
                    {stack.map((tech) => (
                        <Chip
                            key={tech}
                            icon={<Hub sx={{ fontSize: 18 }} />}
                            label={tech}
                            sx={{
                                bgcolor: alpha(primaryColor, 0.08),
                                color: '#ffffff',
                                border: `1px solid ${alpha(primaryColor, 0.2)}`,
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                py: 2.5,
                                '& .MuiChip-icon': { color: primaryColor },
                            }}
                        />
                    ))}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 4, fontSize: '0.9rem', maxWidth: 600, mx: 'auto', lineHeight: 1.7 }}>
                    This is the same stack running the background workers behind this site's own AI features, not a list assembled for a pitch deck.
                </Typography>
            </Container>

            {/* Process */}
            <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Typography variant="h3" fontWeight={900} gutterBottom sx={{ fontSize: { xs: '2rem', sm: '2.5rem' }, letterSpacing: '-0.02em' }}>
                        How We Build One
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' }, fontWeight: 400 }}>
                        Four stages, and the second one is where most of the actual design work happens.
                    </Typography>
                </Box>

                <Grid container spacing={4}>
                    {processSteps.map((step, index) => (
                        <Grid item xs={12} sm={6} md={3} key={step.step}>
                            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.12 }}>
                                <Card sx={{
                                    height: '100%', minHeight: 210, textAlign: 'center', p: 3.5,
                                    background: 'rgba(13, 14, 18, 0.3)', border: '1px dashed', borderColor: alpha(primaryColor, 0.2),
                                }}>
                                    <Typography variant="h2" sx={{ color: alpha(primaryColor, 0.2), fontWeight: 900, mb: 1.5, fontSize: '3rem' }}>
                                        {step.step}
                                    </Typography>
                                    <Typography variant="h6" fontWeight={800} gutterBottom sx={{ fontSize: '1.05rem' }}>
                                        {step.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem', lineHeight: 1.6 }}>
                                        {step.desc}
                                    </Typography>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* Closing CTA */}
            <Container maxWidth="md" sx={{ py: { xs: 8, md: 10 } }}>
                <Card sx={{
                    p: { xs: 4, md: 6 },
                    borderRadius: 4,
                    textAlign: 'center',
                    background: `linear-gradient(135deg, ${alpha(primaryColor, 0.1)} 0%, rgba(13, 14, 18, 0.4) 100%)`,
                    border: `1px solid ${alpha(primaryColor, 0.2)}`,
                }}>
                    <Layers sx={{ fontSize: 44, color: primaryColor, mb: 2 }} />
                    <Typography variant="h4" fontWeight={900} gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, letterSpacing: '-0.02em' }}>
                        Have a manual process worth automating?
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.05rem', maxWidth: 520, mx: 'auto' }}>
                        Tell us what it looks like today. We'll tell you honestly whether an agent is the right fit for it, or whether something simpler would do the job just as well.
                    </Typography>
                    <Stack spacing={1.5} sx={{ maxWidth: 380, mx: 'auto', mb: 4, textAlign: 'left' }}>
                        {['Free scoping call before any commitment', 'Runs as a monitored background service', 'Human-in-the-loop where it actually matters'].map((item) => (
                            <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <CheckCircle sx={{ color: primaryColor, fontSize: 18 }} />
                                <Typography variant="body2" fontWeight={600}>{item}</Typography>
                            </Box>
                        ))}
                    </Stack>
                    <Button
                        variant="contained"
                        size="large"
                        endIcon={<ArrowForward />}
                        component={Link}
                        to="/hire#contact"
                        sx={{
                            px: 5, py: 1.75, borderRadius: '30px', fontWeight: 800, fontSize: '0.95rem',
                            background: primaryColor, color: '#000000',
                            '&:hover': { background: alpha(primaryColor, 0.9), boxShadow: `0 8px 25px ${alpha(primaryColor, 0.4)}` },
                        }}
                    >
                        Start a Project
                    </Button>
                </Card>
            </Container>
        </Box>
    );
};

export default AutonomousAIAgentsPage;
