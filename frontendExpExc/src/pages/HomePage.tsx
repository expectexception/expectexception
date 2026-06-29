import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Stack,
  IconButton,
  useTheme,
  alpha,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Slider,
} from '@mui/material';
import {
  RocketLaunch,
  Download,
  QrCode,
  Code,
  ArrowForward,
  TrendingUp,
  Security,
  Speed,
  Newspaper,
  VolumeUp,
  Compress,
  Movie,
  Psychology,
  NetworkCheck,
  ColorLens,
  TouchApp,
  CheckCircle,
  Message,
  Terminal,
  Dns,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { Post } from '../types';
import Seo from '../components/seo/Seo';
import { staticServices, staticStats } from '../data/StaticData';
import { isReactSnap } from '../utils/isReactSnap';
import { excerptFromHtml } from '../utils/text';
import { useCustomTheme } from '../context/CustomThemeContext';
import { WebDevSvg, BackendSvg, FullStackSvg, AiSvg, PlanningAgentSvg, CodingAgentSvg, TestingAgentSvg, DeployAgentSvg } from '../components/layout/AnimatedSvgs';
import { ChatbotPreview, CompressorPreview, PdfPreview, UrlPreview } from '../components/layout/MiniPreviews';

// --- Reusable Border Beam Effect ---
const BorderBeam: React.FC<{ activeColor?: string }> = ({ activeColor }) => {
  const theme = useTheme();
  const color = activeColor || theme.palette.primary.main;
  
  return (
    <Box
      className="border-beam-overlay"
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        border: '1.5px solid transparent',
        background: `linear-gradient(90deg, ${color}, #00e5ff) border-box`,
        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        opacity: 0,
        pointerEvents: 'none',
        transition: 'opacity 0.4s ease',
        zIndex: 10,
        backgroundSize: '200% 200%',
        '@keyframes rotateGradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        animation: 'rotateGradient 4s linear infinite',
      }}
    />
  );
};

// --- Interactive Canvas Background/Graphic ---
const InteractiveCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = 70;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1,
      });
    }

    let mouse = { x: -1000, y: -1000, active: false };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.active = false;
    };

    const handleCanvasClick = () => {
      if (!mouse.active) return;
      for (let i = 0; i < 6; i++) {
        particles.push({
          x: mouse.x,
          y: mouse.y,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          radius: Math.random() * 1.5 + 1,
        });
        if (particles.length > 120) particles.shift();
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleCanvasClick);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            p.x += dx * 0.008;
            p.y += dy * 0.008;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor;
        ctx.fill();

        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = alpha(primaryColor, (80 - dist) / 80 * 0.15);
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
        canvas.removeEventListener('click', handleCanvasClick);
      }
    };
  }, [primaryColor]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
};

// --- Interactive Physics Sandbox ---
const PhysicsSandbox: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const gravity = 0.3;
    const friction = 0.98;

    interface Ball {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
    }

    const balls: Ball[] = [];

    const spawnBall = (x: number, y: number) => {
      balls.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 2) * 4,
        radius: Math.random() * 12 + 8,
        color: Math.random() > 0.4 ? primaryColor : '#00e5ff',
      });
      if (balls.length > 35) balls.shift();
    };

    for (let i = 0; i < 5; i++) {
      spawnBall(width / 2 + (Math.random() - 0.5) * 80, height / 3 + (Math.random() - 0.5) * 40);
    }

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spawnBall(x, y);
    };

    canvas.addEventListener('mousedown', handleMouseDown);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = alpha('#ffffff', 0.25);
      ctx.font = '13px Outfit, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Click inside to spawn bouncing gravity balls', width / 2, 25);

      balls.forEach((ball) => {
        ball.vy += gravity;
        ball.vx *= friction;
        ball.vy *= friction;

        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.y + ball.radius > height) {
          ball.y = height - ball.radius;
          ball.vy = -ball.vy * 0.72;
          ball.vx *= 0.95;
        }

        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius;
          ball.vy = -ball.vy * 0.72;
        }

        if (ball.x + ball.radius > width) {
          ball.x = width - ball.radius;
          ball.vx = -ball.vx * 0.72;
        } else if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx = -ball.vx * 0.72;
        }

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;

        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('mousedown', handleMouseDown);
      }
    };
  }, [primaryColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '240px',
        display: 'block',
        cursor: 'crosshair',
        background: 'rgba(13, 14, 18, 0.4)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}
    />
  );
};

// --- Main HomePage Component ---

const skillsData = [
  {
    category: 'Frontend Engineering',
    color: '#3dfc55', // Neon Green
    icon: <Code sx={{ fontSize: 24 }} />,
    level: 95,
    desc: 'Crafting pixel-perfect, highly interactive, and responsive user interfaces using modern web frameworks.',
    techs: ['React.js', 'Next.js', 'TypeScript', 'Framer Motion', 'MUI', 'TailwindCSS', 'Three.js']
  },
  {
    category: 'Backend Systems',
    color: '#00e5ff', // Neon Cyan
    icon: <Terminal sx={{ fontSize: 24 }} />,
    level: 90,
    desc: 'Designing robust, scalable, and high-performance server architectures, RESTful APIs, and database schemas.',
    techs: ['Python', 'Django', 'Node.js', 'Express.js', 'PostgreSQL', 'Redis', 'GraphQL']
  },
  {
    category: 'AI & Automation',
    color: '#a855f7', // Neon Purple
    icon: <Psychology sx={{ fontSize: 24 }} />,
    level: 88,
    desc: 'Running local LLMs, building ensemble computer-vision models, and wiring real backend tools into agentic chat workflows.',
    techs: ['Ollama', 'Hugging Face Transformers', 'PyTorch', 'Celery', 'Agentic Tool-Calling', 'Prompt Engineering']
  },
  {
    category: 'DevOps & Cloud',
    color: '#f97316', // Neon Orange
    icon: <Dns sx={{ fontSize: 24 }} />,
    level: 85,
    desc: 'Automating deployments, containerizing services, configuring reverse proxies, and maintaining cloud infrastructure.',
    techs: ['Docker', 'Docker Compose', 'Nginx', 'Cloudflare Tunnels', 'AWS', 'CI/CD', 'Linux']
  }
];


interface AgenticWorkflowVisualizerProps {
  activeStep: number | null;
  simulationActive: boolean;
}

const AgenticWorkflowVisualizer: React.FC<AgenticWorkflowVisualizerProps> = ({ activeStep, simulationActive }) => {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const secondaryColor = '#00e5ff'; // Cyan
  
  const nodes = [
    { step: 0, label: 'Planning Agent', color: primaryColor, icon: '📋', desc: 'Step 1: Analyze & Plan' },
    { step: 1, label: 'Coding Agent', color: secondaryColor, icon: '💻', desc: 'Step 2: Generate Code' },
    { step: 2, label: 'Testing Agent', color: '#a855f7', icon: '⚡', desc: 'Step 3: Verify & Test' },
    { step: 3, label: 'Deploy Agent', color: '#f97316', icon: '🚀', desc: 'Step 4: Package & Ship' },
  ];

  return (
    <Box sx={{ 
      width: '100%', 
      mb: 8, 
      p: { xs: 3, md: 5 }, 
      bgcolor: 'rgba(13, 14, 18, 0.4)', 
      borderRadius: '24px', 
      border: '1px solid rgba(255, 255, 255, 0.05)', 
      position: 'relative', 
      overflow: 'hidden' 
    }}>
      <BorderBeam activeColor={simulationActive ? primaryColor : undefined} />
      
      {/* Background Grid Pattern */}
      <Box sx={{ 
        position: 'absolute', 
        inset: 0, 
        opacity: 0.07, 
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)', 
        backgroundSize: '24px 24px', 
        pointerEvents: 'none' 
      }} />

      <Typography variant="h5" fontWeight="800" sx={{ mb: 4, textAlign: 'center', color: '#ffffff', letterSpacing: '-0.01em' }}>
        Live Execution Pipeline
      </Typography>
      
      {/* Pipeline Container */}
      <Box sx={{ 
        position: 'relative', 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        px: { xs: 2, md: 6 },
        gap: { xs: 6, md: 2 }
      }}>
        
        {/* SVG connection lines for Desktop */}
        <Box sx={{ 
          position: 'absolute', 
          left: 0, 
          top: '30px', 
          width: '100%', 
          height: '4px', 
          display: { xs: 'none', md: 'block' },
          pointerEvents: 'none', 
          zIndex: 1 
        }}>
          <svg width="100%" height="4" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={primaryColor} />
                <stop offset="50%" stopColor={secondaryColor} />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            
            {/* Base Line */}
            <line x1="12.5%" y1="2" x2="87.5%" y2="2" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="3" />
            
            {/* Animated Active Line */}
            {simulationActive && activeStep !== null && (
              <motion.line 
                x1="12.5%" 
                y1="2" 
                x2={`${12.5 + (activeStep * 25)}%`} 
                y2="2" 
                stroke="url(#line-grad)" 
                strokeWidth="3.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5 }}
                style={{ filter: 'drop-shadow(0 0 6px ' + primaryColor + ')' }}
              />
            )}
          </svg>
        </Box>

        {/* Nodes */}
        {nodes.map((node, index) => {
          const isActive = activeStep === node.step;
          const isCompleted = activeStep !== null && activeStep > node.step;
          
          return (
            <Box 
              key={node.step} 
              sx={{ 
                position: 'relative', 
                zIndex: 2, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                flex: 1
              }}
            >
              {/* Outer Pulsing Ring */}
              <motion.div
                animate={{
                  scale: isActive ? [1, 1.15, 1] : 1,
                  borderColor: isActive ? node.color : isCompleted ? alpha(node.color, 0.6) : 'rgba(255, 255, 255, 0.05)',
                  boxShadow: isActive 
                    ? `0 0 30px ${alpha(node.color, 0.4)}, inset 0 0 15px ${alpha(node.color, 0.2)}` 
                    : isCompleted 
                    ? `0 0 15px ${alpha(node.color, 0.1)}`
                    : 'none'
                }}
                transition={{
                  repeat: isActive ? Infinity : 0,
                  duration: 2,
                  ease: 'easeInOut'
                }}
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  background: '#0d0e12',
                  border: '2px solid',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
              >
                {/* Active step progress border */}
                {isActive && (
                  <motion.div
                    style={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: '50%',
                      border: `2px solid ${node.color}`,
                      borderTopColor: 'transparent',
                      borderLeftColor: 'transparent',
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  />
                )}
                {node.icon}
              </motion.div>
              
              <Typography 
                variant="subtitle2" 
                fontWeight="850" 
                sx={{ 
                  mt: 2, 
                  color: isActive ? '#ffffff' : isCompleted ? node.color : 'text.secondary',
                  letterSpacing: '0.02em',
                  fontSize: '0.9rem',
                  transition: 'color 0.3s ease'
                }}
              >
                {node.label}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  mt: 0.5, 
                  color: isActive ? node.color : 'text.secondary',
                  opacity: 0.7,
                  fontSize: '0.75rem'
                }}
              >
                {node.desc}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const HomePage: React.FC = () => {
  const theme = useTheme();
  const { primaryColor, setPrimaryColor, resetTheme } = useCustomTheme();
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [services, setServices] = useState<any[]>(staticServices);
  const [stats, setStats] = useState(staticStats);

  // --- Agentic Simulation State ---
  const [simulationActive, setSimulationActive] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [plannerProgress, setPlannerProgress] = useState(0);
  const [coderProgress, setCoderProgress] = useState(0);
  const [testerProgress, setTesterProgress] = useState(0);
  const [deployerProgress, setDeployerProgress] = useState(0);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs]);

  const runSimulation = () => {
    if (simulationActive) return;
    setSimulationActive(true);
    setActiveStep(0);
    setLogs(['[SYSTEM] Initializing Agentic Task: "Develop & Deploy Secure Feedback Portal"...']);
    setPlannerProgress(0);
    setCoderProgress(0);
    setTesterProgress(0);
    setDeployerProgress(0);

    // Step 0: Planning (Duration: 3s)
    let planningInterval = setInterval(() => {
      setPlannerProgress(prev => {
        if (prev >= 100) {
          clearInterval(planningInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 250);

    setTimeout(() => {
      setLogs(prev => [
        ...prev,
        '[PLANNER] Task analyzed. Created execution path:',
        '  - Task 1: Generate schema & routes (Coder)',
        '  - Task 2: Build frontend portal interface (Coder)',
        '  - Task 3: Execute vulnerability scanning (Tester)',
        '  - Task 4: Package docker container & deploy (Deployer)',
        '[SYSTEM] Handing over control to CODING_AGENT.'
      ]);
      setActiveStep(1);

      // Step 1: Coding (Duration: 4s)
      let codingInterval = setInterval(() => {
        setCoderProgress(prev => {
          if (prev >= 100) {
            clearInterval(codingInterval);
            return 100;
          }
          return prev + 8;
        });
      }, 300);

      setTimeout(() => {
        setLogs(prev => [
          ...prev,
          '[CODER] Generated database schema (PostgreSQL)',
          '[CODER] Created React frontend components in src/components/FeedbackPortal.tsx',
          '[CODER] Created Django API views in feedback/views.py',
          '[CODER] Codebase built successfully.',
          '[SYSTEM] Handing over control to TESTING_AGENT.'
        ]);
        setActiveStep(2);

        // Step 2: Testing (Duration: 3s)
        let testingInterval = setInterval(() => {
          setTesterProgress(prev => {
            if (prev >= 100) {
              clearInterval(testingInterval);
              return 100;
            }
            return prev + 10;
          });
        }, 250);

        setTimeout(() => {
          setLogs(prev => [
            ...prev,
            '[TESTER] Running unit tests: 14/14 passed.',
            '[TESTER] Running security vulnerability check: 0 warnings.',
            '[TESTER] UI responsiveness test: PASS',
            '[SYSTEM] Handing over control to DEPLOY_AGENT.'
          ]);
          setActiveStep(3);

          // Step 3: Deploying (Duration: 3.5s)
          let deployingInterval = setInterval(() => {
            setDeployerProgress(prev => {
              if (prev >= 100) {
                clearInterval(deployingInterval);
                return 100;
              }
              return prev + 10;
            });
          }, 300);

          setTimeout(() => {
            setLogs(prev => [
              ...prev,
              '[DEPLOYER] Building production bundle...',
              '[DEPLOYER] Pushing docker container to AWS ECS registry...',
              '[DEPLOYER] SSL Certificate initialized.',
              '[SYSTEM] DEPLOYMENT SUCCESSFUL! Live at https://feedback.expexc.ai',
              '[SYSTEM] Workflow complete. Idle.'
            ]);
            setActiveStep(null);
            setSimulationActive(false);
          }, 3500);
        }, 3000);
      }, 4000);
    }, 3000);
  };

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "ExpectException Portfolio & Developer Tools",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Premium developer portfolio showcasing advanced frontend, backend, and AI capabilities, coupled with an active suite of free utility applications.",
  };

  useEffect(() => {
    if (isReactSnap()) {
      setLoadingPosts(false);
      return;
    }
    fetchLatestPosts();
    fetchServices();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get(endpoints.services.downloadStats);
      if (response.data) {
        setStats(response.data);
      }
    } catch (e) {
      console.error('Failed to fetch stats', e);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await apiClient.get(endpoints.services.tools);
      const results = (response.data.results || response.data).slice(0, 4);
      if (results && results.length > 0) {
        setServices(results);
      }
    } catch (e) {
      console.error('Failed to fetch services', e);
    }
  };

  const fetchLatestPosts = async () => {
    try {
      const response = await apiClient.get(endpoints.blog.posts);
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setLatestPosts(data.slice(0, 3));
    } catch (e) {
      console.error('Failed to fetch posts', e);
    } finally {
      setLoadingPosts(false);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Download': return <Download fontSize="medium" />;
      case 'Movie': return <Movie fontSize="medium" />;
      case 'QrCode': return <QrCode fontSize="medium" />;
      case 'Code': return <Code fontSize="medium" />;
      case 'VolumeUp': return <VolumeUp fontSize="medium" />;
      case 'Compress': return <Compress fontSize="medium" />;
      case 'Psychology': return <Psychology fontSize="medium" />;
      case 'RocketLaunch': return <RocketLaunch fontSize="medium" />;
      case 'NetworkCheck': return <NetworkCheck fontSize="medium" />;
      default: return <Code fontSize="medium" />;
    }
  };

  const offerServices = [
    {
      title: 'Software Development (Full Stack)',
      desc: 'Engineered with strict TypeScript and robust architectures. We build highly interactive user interfaces in React and Next.js paired with concurrent, optimized backends in Python (FastAPI/Django) and Node.js. Designed for fast TTFB, clean state management, and strict relational database integrity.',
      tags: ['Next.js / React', 'TypeScript', 'FastAPI / Django', 'PostgreSQL / Redis'],
      icon: <FullStackSvg />
    },
    {
      title: 'Workflow Automation & Pipelines',
      desc: 'Eliminate repetitive manual operations. We build custom web scraping systems, automated data processing pipelines, automated testing suites, and self-monitoring background workers. Integrated with Docker, serverless task queues, and CI/CD pipelines.',
      tags: ['CI/CD Pipelines', 'Custom Web Scrapers', 'Celery / Redis', 'Docker Orchestration'],
      icon: <BackendSvg />
    },
    {
      title: 'Autonomous AI Agents & RAG',
      desc: 'Next-generation cognitive automation. We architect multi-agent orchestration pipelines, custom RAG (Retrieval-Augmented Generation) systems with vector databases (Pinecone/pgvector), and intelligent LLM background workers that handle complex, multi-step reasoning.',
      tags: ['Multi-Agent Workflows', 'Cognitive RAG', 'Vector DBs', 'Semantic Search'],
      icon: <AiSvg />
    },
  ];

  const presetColors = ['#3dfc55', '#00e5ff', '#ff007f', '#ffaa00', '#a855f7', '#ffffff'];

  return (
    <Box sx={{ minHeight: '100vh', pb: 8, bgcolor: '#050505', color: '#ffffff' }}>
      <Seo
        title="Premium Portfolio & Developer Tools"
        description="Explore the premium portfolio of RJT, showcasing advanced frontend interactive canvases, custom web engineering, and a functional suite of developer tools."
        keywords={['portfolio', 'developer portfolio', 'frontend engineer', 'react developer', 'creative frontend', 'expectexception', 'interactive canvas']}
        structuredData={appSchema}
      />

      {/* --- HERO SECTION --- */}
      <Box
        sx={{
          minHeight: { xs: 'auto', md: '90vh' },
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          pt: { xs: 8, md: 10 },
          pb: { xs: 8, md: 12 },
        }}
      >
        {/* Sliding background outline text */}
        <Box
          sx={{
            position: 'absolute',
            top: '25%',
            left: 0,
            width: '100%',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 0,
            opacity: 0.015,
          }}
        >
          <motion.div
            animate={{ x: [0, -1200] }}
            transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
            style={{
              fontSize: '10rem',
              fontWeight: 900,
              color: '#ffffff',
              WebkitTextStroke: '2.5px #ffffff',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'monospace',
              display: 'inline-block',
            }}
          >
            EXPECT EXCEPTION • CREATIVE PORTFOLIO • FULL STACK • AI SOLUTIONS • EXPECT EXCEPTION • CREATIVE PORTFOLIO • FULL STACK • AI SOLUTIONS •
          </motion.div>
        </Box>

        {/* Ambient glow backgrounds */}
        <Box sx={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(primaryColor, 0.08)} 0%, transparent 70%)`,
          filter: 'blur(40px)',
          zIndex: 0,
        }} />
        <Box sx={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.05)} 0%, transparent 70%)`,
          filter: 'blur(60px)',
          zIndex: 0,
        }} />

        {/* Scroll Indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '4%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            style={{
              width: 18,
              height: 28,
              borderRadius: 9,
              border: '1.5px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              justifyContent: 'center',
              paddingTop: 5,
            }}
          >
            <motion.div
              animate={{ y: [0, 5, 0], opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              style={{
                width: 3,
                height: 6,
                borderRadius: 1.5,
                backgroundColor: primaryColor,
              }}
            />
          </motion.div>
        </Box>

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6.5}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Chip
                  label="● Available for new projects"
                  sx={{
                    bgcolor: alpha(primaryColor, 0.1),
                    color: primaryColor,
                    borderColor: alpha(primaryColor, 0.2),
                    borderWidth: 1,
                    borderStyle: 'solid',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    mb: 4,
                    boxShadow: `0 0 15px ${alpha(primaryColor, 0.15)}`,
                    '& .MuiChip-label': { px: 2 }
                  }}
                />

                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: '2.8rem', sm: '3.8rem', md: '4.8rem' },
                    lineHeight: 1.05,
                    mb: 3,
                    letterSpacing: '-0.03em',
                  }}
                >
                  Architecting the <br />
                  <span style={{
                    background: `linear-gradient(135deg, #ffffff 30%, ${primaryColor} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    Modern Web
                  </span>
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    color: '#94a3b8',
                    fontWeight: 400,
                    lineHeight: 1.6,
                    mb: 5,
                    maxWidth: '560px',
                    fontSize: { xs: '1.05rem', sm: '1.25rem' }
                  }}
                >
                  Hi, I'm RJT. Specializing in modern web engineering, custom AI integrations, and high-performance interactive interfaces, I turn complex concepts into responsive, elegant digital experiences.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    component={Link}
                    to="/services"
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    sx={{
                      borderRadius: '30px',
                      px: 4,
                      py: 1.75,
                      fontWeight: 800,
                      background: primaryColor,
                      color: '#000000',
                      '&:hover': {
                        background: alpha(primaryColor, 0.9),
                        boxShadow: `0 8px 25px ${alpha(primaryColor, 0.4)}`,
                      }
                    }}
                  >
                    EXPLORE SERVICES
                  </Button>
                  <Button
                    component={Link}
                    to="/hire"
                    variant="outlined"
                    size="large"
                    sx={{
                      borderRadius: '30px',
                      px: 4,
                      py: 1.75,
                      fontWeight: 700,
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      '&:hover': {
                        borderColor: primaryColor,
                        color: primaryColor,
                        bgcolor: alpha(primaryColor, 0.03),
                      }
                    }}
                  >
                    LET'S TALK
                  </Button>
                </Stack>
              </motion.div>
            </Grid>

            {/* Interactive Canvas Box */}
            <Grid item xs={12} md={5.5}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: { xs: '320px', sm: '400px', md: '450px' },
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(13, 14, 18, 0.3)',
                    backdropFilter: 'blur(20px)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    '&:hover': {
                      borderColor: alpha(primaryColor, 0.2),
                      boxShadow: `0 20px 50px ${alpha(primaryColor, 0.05)}`,
                    }
                  }}
                >
                  {/* Canvas Background */}
                  <Box sx={{ flexGrow: 1, position: 'relative' }}>
                    <InteractiveCanvas />
                    <Box sx={{
                      position: 'absolute',
                      bottom: 16,
                      left: 16,
                      bgcolor: 'rgba(5, 5, 5, 0.6)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '20px',
                      px: 2,
                      py: 0.75,
                      pointerEvents: 'none',
                    }}>
                      <Typography variant="caption" sx={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TouchApp sx={{ fontSize: 14, color: primaryColor }} />
                        Move mouse & click to interact
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* --- TECH STACK MARQUEE --- */}
      <Box sx={{
        py: 4,
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        bgcolor: '#08090d',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <Box sx={{
          display: 'flex',
          width: '200%',
          animation: 'marquee 25s linear infinite',
          whiteSpace: 'nowrap',
          '@keyframes marquee': {
            '0%': { transform: 'translateX(0%)' },
            '100%': { transform: 'translateX(-50%)' },
          },
        }}>
          {/* Double list of technologies for infinite loop */}
          {Array(2).fill([
            'React.js', 'Next.js', 'TypeScript', 'Node.js', 'Django', 'Python', 'Three.js',
            'PostgreSQL', 'Docker', 'AWS', 'TailwindCSS', 'REST APIs', 'GraphQL', 'PWA'
          ]).flat().map((tech, idx) => (
            <Typography
              key={idx}
              variant="h6"
              sx={{
                mx: 4,
                fontWeight: 700,
                color: '#4f5666',
                letterSpacing: '0.05em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                '&::after': {
                  content: '""',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: primaryColor,
                  display: 'inline-block',
                  ml: 3
                }
              }}
            >
              {tech}
            </Typography>
          ))}
        </Box>
      </Box>

      {/* --- ABOUT SECTION --- */}
      <Container maxWidth="xl" sx={{ py: { xs: 8, md: 16 } }}>
        <Grid container spacing={8} alignItems="center">
          <Grid item xs={12} md={5}>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Box sx={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                aspectRatio: '4/5',
                background: 'rgba(13, 14, 18, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  border: `2px solid ${alpha(primaryColor, 0.3)}`,
                  borderRadius: '24px',
                  margin: '12px',
                  pointerEvents: 'none',
                }
              }}>
                {/* Abstract graphic representing a developer */}
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <Box sx={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    border: `3px solid ${primaryColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                    bgcolor: alpha(primaryColor, 0.05),
                    boxShadow: `0 0 20px ${alpha(primaryColor, 0.2)}`,
                    color: primaryColor,
                  }}>
                    <Code sx={{ fontSize: 48 }} />
                  </Box>
                  <Typography variant="h4" fontWeight="800" gutterBottom>RJT</Typography>
                  <Typography variant="subtitle1" color="primary.main" fontWeight="600" sx={{ mb: 2 }}>
                    Full Stack Developer & AI Architect
                  </Typography>
                  <Typography variant="body2" color="#94a3b8" sx={{ maxWidth: '280px', mx: 'auto' }}>
                    Engineering high-performance, exception-free digital solutions.
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={7}>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Typography variant="h6" color="primary.main" fontWeight="700" sx={{ mb: 1, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                About Me
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 800, mb: 4, letterSpacing: '-0.02em' }}>
                Specializing in Modern Web Technologies
              </Typography>
              <Typography variant="body1" sx={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.8, mb: 4 }}>
                I believe that a great frontend is more than just styling—it is a conversation between the user and code. My engineering focus centers around high performance, robust state management, responsive layouts, and seamless animations.
              </Typography>
              <Typography variant="body1" sx={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.8, mb: 6 }}>
                By pairing interactive React/TypeScript frontends with secure Django or Node.js backends, I construct full-stack solutions designed to scale. I also design and deploy custom AI automation systems and conversational agents that optimize workflows.
              </Typography>

              <Grid container spacing={4}>
                {[
                  { value: '50+', label: 'Projects Completed' },
                  { value: '99.9%', label: 'Uptime Achieved' },
                  { value: '100%', label: 'Client Satisfaction' },
                  { value: '25+', label: 'Integrated Tools' },
                ].map((stat, idx) => (
                  <Grid item xs={6} sm={3} key={idx}>
                    <Typography variant="h3" sx={{ fontWeight: 900, color: '#ffffff', mb: 0.5 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                      {stat.label}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </motion.div>
          </Grid>
        </Grid>
      </Container>

      {/* --- CREATIVE SKILLS SHOWCASE --- */}
      <Container maxWidth="xl" sx={{ py: { xs: 8, md: 14 } }}>
        <Box sx={{ mb: 8, textAlign: 'center' }}>
          <Typography variant="h6" color="primary.main" fontWeight="700" sx={{ mb: 1, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            My Toolkit
          </Typography>
          <Typography variant="h2" sx={{ fontWeight: 800, mb: 2, letterSpacing: '-0.02em' }}>
            Creative Skills & Core Proficiencies
          </Typography>
          <Typography variant="h6" color="#94a3b8" sx={{ maxWidth: '700px', mx: 'auto', fontWeight: 400 }}>
            An interactive breakdown of my engineering capabilities. Hover over each domain to see sub-technologies and proficiency levels.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {skillsData.map((skill, idx) => (
            <Grid item xs={12} sm={6} lg={3} key={idx}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover="hover"
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card
                  sx={{
                    height: '100%',
                    p: 4,
                    background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.6) 0%, rgba(13, 14, 18, 0.3) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: `radial-gradient(circle at 50% 0%, ${alpha(skill.color, 0.08)} 0%, transparent 70%)`,
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      borderColor: alpha(skill.color, 0.4),
                      boxShadow: `0 20px 40px -15px ${alpha(skill.color, 0.15)}`,
                      transform: 'translateY(-6px)',
                    },
                    '&:hover .border-beam-overlay': {
                      opacity: 1,
                    }
                  }}
                >
                  <BorderBeam activeColor={skill.color} />
                  <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Header: Icon & Category */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                      <Box sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        border: `1px solid ${alpha(skill.color, 0.2)}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(skill.color, 0.04),
                        color: skill.color,
                        boxShadow: `0 0 15px ${alpha(skill.color, 0.15)}`,
                      }}>
                        {skill.icon}
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: skill.color }}>
                          {skill.level}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight="700">
                          PROFICIENCY
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="h5" fontWeight="800" sx={{ mb: 1.5, color: '#ffffff' }}>
                      {skill.category}
                    </Typography>
                    <Typography variant="body2" color="#94a3b8" sx={{ mb: 4, lineHeight: 1.6, flexGrow: 1 }}>
                      {skill.desc}
                    </Typography>

                    {/* Progress Bar */}
                    <Box sx={{ width: '100%', bgcolor: 'rgba(255, 255, 255, 0.05)', height: 6, borderRadius: 3, mb: 3.5, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${skill.level}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                        style={{
                          height: '100%',
                          backgroundColor: skill.color,
                          boxShadow: `0 0 10px ${skill.color}`,
                          borderRadius: 3
                        }}
                      />
                    </Box>

                    {/* Tags */}
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      {skill.techs.map((tech) => (
                        <Chip
                          key={tech}
                          label={tech}
                          size="small"
                          sx={{
                            bgcolor: alpha(skill.color, 0.06),
                            color: '#e2e8f0',
                            border: `1px solid ${alpha(skill.color, 0.12)}`,
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: skill.color,
                              color: '#000000',
                              fontWeight: 700,
                              boxShadow: `0 0 10px ${alpha(skill.color, 0.4)}`,
                            }
                          }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* --- CREATIVE LAB (INTERACTIVE PLAYGROUND) --- */}
      <Box sx={{ py: { xs: 8, md: 14 }, bgcolor: '#08090d', borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
        <Container maxWidth="xl">
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="primary.main" fontWeight="700" sx={{ mb: 1, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Creative Lab
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 800, mb: 2, letterSpacing: '-0.02em' }}>
              Interactive Playground
            </Typography>
            <Typography variant="h6" color="#94a3b8" sx={{ maxWidth: '700px', mx: 'auto', fontWeight: 400 }}>
              The web is an interactive canvas. Experience real-time customization and physics simulations in the sandbox below.
            </Typography>
          </Box>

          <Grid container spacing={6}>
            {/* Color Changer Control */}
            <Grid item xs={12} md={5}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 4, background: 'rgba(13, 14, 18, 0.5)' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight="800" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ColorLens sx={{ color: primaryColor }} /> Accent Customizer
                  </Typography>
                  <Typography variant="body2" color="#94a3b8" sx={{ mb: 4, lineHeight: 1.6 }}>
                    Click a preset color or select a custom hue. The primary accent color of the entire website will update instantly in real-time.
                  </Typography>

                  <Typography variant="subtitle2" fontWeight="750" color="#ffffff" sx={{ mb: 2 }}>
                    Preset Accent Colors
                  </Typography>
                  <Stack direction="row" spacing={1.5} sx={{ mb: 5, flexWrap: 'wrap', gap: 1.5 }}>
                    {presetColors.map((color) => (
                      <Box
                        key={color}
                        onClick={() => setPrimaryColor(color)}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: color,
                          cursor: 'pointer',
                          border: primaryColor === color ? '3px solid #ffffff' : '2px solid transparent',
                          boxShadow: primaryColor === color ? `0 0 15px ${color}` : 'none',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'scale(1.1)',
                          }
                        }}
                      />
                    ))}
                  </Stack>

                  <Button
                    onClick={resetTheme}
                    variant="outlined"
                    size="small"
                    sx={{
                      borderRadius: '8px',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      '&:hover': {
                        borderColor: primaryColor,
                        color: primaryColor,
                      }
                    }}
                  >
                    Reset Default Theme
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Physics Sandbox */}
            <Grid item xs={12} md={7}>
              <Card sx={{ p: 3, background: 'rgba(13, 14, 18, 0.5)' }}>
                <CardContent>
                  <Typography variant="h5" fontWeight="800" sx={{ mb: 3 }}>
                    Physics Sandbox Simulation
                  </Typography>
                  <PhysicsSandbox />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* --- SERVICES / OFFER SECTION --- */}
      <Container maxWidth="xl" sx={{ py: { xs: 8, md: 16 } }}>
        <Box sx={{ textAlign: 'center', mb: 10 }}>
          <Typography variant="h6" color="primary.main" fontWeight="700" sx={{ mb: 1, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            My Expertise
          </Typography>
          <Typography variant="h2" sx={{ fontWeight: 800, mb: 2, letterSpacing: '-0.02em' }}>
            Services I Offer
          </Typography>
          <Typography variant="h6" color="#94a3b8" sx={{ maxWidth: '600px', mx: 'auto', fontWeight: 400 }}>
            Delivering high-performance digital solutions across the full development stack.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {offerServices.map((service, idx) => (
            <Grid item xs={12} md={4} key={idx}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover="hover"
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card
                  sx={{
                    height: '100%',
                    p: { xs: 2.5, md: 4 },
                    background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.6) 0%, rgba(13, 14, 18, 0.3) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '4px',
                      height: '100%',
                      background: primaryColor,
                      opacity: 0.3,
                      transition: 'opacity 0.3s',
                    },
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: alpha(primaryColor, 0.25),
                      boxShadow: `0 15px 35px -10px ${alpha(primaryColor, 0.1)}`,
                      '&::before': {
                        opacity: 1,
                      }
                    },
                    '&:hover .border-beam-overlay': {
                      opacity: 1,
                    }
                  }}
                >
                  <BorderBeam />
                  <CardContent sx={{ p: 0 }}>
                    <Box sx={{ color: '#94a3b8', mb: 3, display: 'inline-block' }}>
                      {service.icon}
                    </Box>
                    <Typography variant="h4" fontWeight="800" sx={{ mb: 2, fontSize: '1.5rem', color: '#ffffff' }}>
                      {service.title}
                    </Typography>
                    <Typography variant="body2" color="#94a3b8" sx={{ mb: 4, lineHeight: 1.7, fontSize: '0.95rem' }}>
                      {service.desc}
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      {service.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{
                            bgcolor: alpha(primaryColor, 0.08),
                            color: primaryColor,
                            border: `1px solid ${alpha(primaryColor, 0.15)}`,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* --- FEATURED WORK (LIVE PRODUCTS) --- */}
      <Box sx={{ py: { xs: 8, md: 14 }, bgcolor: '#08090d', borderTop: '1px solid rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'flex-end' }, mb: 8 }}>
            <Box>
              <Typography variant="h6" color="primary.main" fontWeight="700" sx={{ mb: 1, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Featured Work
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 800, mb: 2, letterSpacing: '-0.02em' }}>
                Live Functional Products
              </Typography>
              <Typography variant="h6" color="#94a3b8" sx={{ maxWidth: '600px', fontWeight: 400 }}>
                I build production-grade, client-side tools. Try them out in real-time right here.
              </Typography>
            </Box>
            <Button
              component={Link}
              to="/services"
              variant="outlined"
              endIcon={<ArrowForward />}
              sx={{
                mt: { xs: 3, md: 0 },
                borderRadius: '20px',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                '&:hover': {
                  borderColor: primaryColor,
                  color: primaryColor,
                }
              }}
            >
              EXPLORE ALL {stats.total_tools || 25} TOOLS
            </Button>
          </Box>

          <Grid container spacing={4}>
            {/* AI Chatbot */}
            <Grid item xs={12} sm={6} md={3}>
              <motion.div
                whileHover="hover"
                style={{ height: '100%' }}
              >
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: alpha('#f43f5e', 0.25),
                    boxShadow: `0 15px 35px -10px ${alpha('#f43f5e', 0.15)}`,
                  },
                  '&:hover .border-beam-overlay': {
                    opacity: 1,
                  }
                }}>
                  <BorderBeam activeColor="#f43f5e" />
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3.5 }}>
                    {/* Live Preview Header */}
                    <Box sx={{ 
                      height: 120, 
                      mb: 3, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      borderRadius: 2, 
                      bgcolor: 'rgba(0,0,0,0.2)', 
                      border: '1px solid rgba(255,255,255,0.03)' 
                    }}>
                      <ChatbotPreview />
                    </Box>
                    <Typography variant="h5" fontWeight="800" sx={{ mb: 1.5, fontSize: '1.25rem' }}>
                      ExpExc AI Chatbot
                    </Typography>
                    <Typography variant="body2" color="#94a3b8" sx={{ mb: 4, lineHeight: 1.6, flexGrow: 1, fontSize: '0.875rem' }}>
                      Conversational AI client designed with distinct assistant personas and real-time streaming responses.
                    </Typography>
                    <Button
                      component={Link}
                      to="/chat"
                      variant="contained"
                      size="small"
                      sx={{ 
                        alignSelf: 'flex-start',
                        bgcolor: '#f43f5e',
                        color: '#000000',
                        fontWeight: 750,
                        borderRadius: '20px',
                        px: 3,
                        '&:hover': { bgcolor: alpha('#f43f5e', 0.8) }
                      }}
                    >
                      Open Chatbot
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* Image Compressor */}
            <Grid item xs={12} sm={6} md={3}>
              <motion.div
                whileHover="hover"
                style={{ height: '100%' }}
              >
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: alpha('#3dfc55', 0.25),
                    boxShadow: `0 15px 35px -10px ${alpha('#3dfc55', 0.15)}`,
                  },
                  '&:hover .border-beam-overlay': {
                    opacity: 1,
                  }
                }}>
                  <BorderBeam activeColor="#3dfc55" />
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3.5 }}>
                    {/* Live Preview Header */}
                    <Box sx={{ 
                      height: 120, 
                      mb: 3, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      borderRadius: 2, 
                      bgcolor: 'rgba(0,0,0,0.2)', 
                      border: '1px solid rgba(255,255,255,0.03)' 
                    }}>
                      <CompressorPreview />
                    </Box>
                    <Typography variant="h5" fontWeight="800" sx={{ mb: 1.5, fontSize: '1.25rem' }}>
                      Image Compressor
                    </Typography>
                    <Typography variant="body2" color="#94a3b8" sx={{ mb: 4, lineHeight: 1.6, flexGrow: 1, fontSize: '0.875rem' }}>
                      Reduce file size of your images in batch by up to 90% while retaining high-fidelity visual quality.
                    </Typography>
                    <Button
                      component={Link}
                      to="/services/image-compressor"
                      variant="contained"
                      size="small"
                      sx={{ 
                        alignSelf: 'flex-start',
                        bgcolor: '#3dfc55',
                        color: '#000000',
                        fontWeight: 750,
                        borderRadius: '20px',
                        px: 3,
                        '&:hover': { bgcolor: alpha('#3dfc55', 0.8) }
                      }}
                    >
                      Open Compressor
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* PDF Merger */}
            <Grid item xs={12} sm={6} md={3}>
              <motion.div
                whileHover="hover"
                style={{ height: '100%' }}
              >
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: alpha('#00e5ff', 0.25),
                    boxShadow: `0 15px 35px -10px ${alpha('#00e5ff', 0.15)}`,
                  },
                  '&:hover .border-beam-overlay': {
                    opacity: 1,
                  }
                }}>
                  <BorderBeam activeColor="#00e5ff" />
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3.5 }}>
                    {/* Live Preview Header */}
                    <Box sx={{ 
                      height: 120, 
                      mb: 3, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      borderRadius: 2, 
                      bgcolor: 'rgba(0,0,0,0.2)', 
                      border: '1px solid rgba(255, 255, 255, 0.03)' 
                    }}>
                      <PdfPreview />
                    </Box>
                    <Typography variant="h5" fontWeight="800" sx={{ mb: 1.5, fontSize: '1.25rem' }}>
                      PDF Merger Tool
                    </Typography>
                    <Typography variant="body2" color="#94a3b8" sx={{ mb: 4, lineHeight: 1.6, flexGrow: 1, fontSize: '0.875rem' }}>
                      Merge multiple PDF documents or split pages with drag-and-drop ease, entirely client-side.
                    </Typography>
                    <Button
                      component={Link}
                      to="/services/pdf-merger"
                      variant="contained"
                      size="small"
                      sx={{ 
                        alignSelf: 'flex-start',
                        bgcolor: '#00e5ff',
                        color: '#000000',
                        fontWeight: 750,
                        borderRadius: '20px',
                        px: 3,
                        '&:hover': { bgcolor: alpha('#00e5ff', 0.8) }
                      }}
                    >
                      Open Merger
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* URL Shortener */}
            <Grid item xs={12} sm={6} md={3}>
              <motion.div
                whileHover="hover"
                style={{ height: '100%' }}
              >
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: alpha(primaryColor, 0.25),
                    boxShadow: `0 15px 35px -10px ${alpha(primaryColor, 0.15)}`,
                  },
                  '&:hover .border-beam-overlay': {
                    opacity: 1,
                  }
                }}>
                  <BorderBeam activeColor={primaryColor} />
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3.5 }}>
                    {/* Live Preview Header */}
                    <Box sx={{ 
                      height: 120, 
                      mb: 3, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      borderRadius: 2, 
                      bgcolor: 'rgba(0,0,0,0.2)', 
                      border: '1px solid rgba(255, 255, 255, 0.03)' 
                    }}>
                      <UrlPreview />
                    </Box>
                    <Typography variant="h5" fontWeight="800" sx={{ mb: 1.5, fontSize: '1.25rem' }}>
                      URL Converter & Shortener
                    </Typography>
                    <Typography variant="body2" color="#94a3b8" sx={{ mb: 4, lineHeight: 1.6, flexGrow: 1, fontSize: '0.875rem' }}>
                      Transform messy tracking links into short, clean, sharing-optimized URLs instantly.
                    </Typography>
                    <Button
                      component={Link}
                      to="/services/url-downloader"
                      variant="contained"
                      size="small"
                      sx={{ 
                        alignSelf: 'flex-start',
                        bgcolor: primaryColor,
                        color: '#000000',
                        fontWeight: 750,
                        borderRadius: '20px',
                        px: 3,
                        '&:hover': { bgcolor: alpha(primaryColor, 0.8) }
                      }}
                    >
                      Open Converter
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* --- AGENTIC WORKFLOWS SECTION --- */}
      <Box sx={{ py: { xs: 8, md: 14 }, bgcolor: '#08090d', borderTop: '1px solid rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
        <Container maxWidth="xl">
          <Box sx={{ textAlign: 'center', mb: 10 }}>
            <Typography variant="h6" color="primary.main" fontWeight="700" sx={{ mb: 1, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              AI Orchestration
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 800, mb: 2, letterSpacing: '-0.02em' }}>
              Autonomous Agentic Workflows
            </Typography>
            <Typography variant="h6" color="#94a3b8" sx={{ maxWidth: '700px', mx: 'auto', fontWeight: 400 }}>
              Our multi-agent system collaborates in real time, executing complex tasks through specialized planning, development, testing, and deployment loops.
            </Typography>
          </Box>

          <AgenticWorkflowVisualizer activeStep={activeStep} simulationActive={simulationActive} />

          <Grid container spacing={4} alignItems="stretch">
            {/* Left side: The 4 Agents Grid */}
            <Grid item xs={12} lg={6}>
              <Grid container spacing={3}>
                {[
                  { step: 0, title: 'Planning Agent', desc: 'Analyzes user prompts, breaks down tasks, and formulates step-by-step technical execution plans.', svg: <PlanningAgentSvg />, progress: plannerProgress },
                  { step: 1, title: 'Coding Agent', desc: 'Generates high-quality React, Node.js, or Django code. Adheres strictly to predefined design systems.', svg: <CodingAgentSvg />, progress: coderProgress },
                  { step: 2, title: 'Testing Agent', desc: 'Runs automated unit tests, performs security vulnerability checks, and validates responsive design.', svg: <TestingAgentSvg />, progress: testerProgress },
                  { step: 3, title: 'Deploy Agent', desc: 'Packages applications inside Docker containers, configures SSL/DNS, and deploys to AWS/GCP clouds.', svg: <DeployAgentSvg />, progress: deployerProgress }
                ].map((agent) => (
                  <Grid item xs={12} sm={6} key={agent.step}>
                    <Card sx={{
                      height: '100%',
                      p: 3,
                      bgcolor: activeStep === agent.step ? alpha(primaryColor, 0.05) : 'rgba(13, 14, 18, 0.3)',
                      borderColor: activeStep === agent.step ? primaryColor : 'rgba(255, 255, 255, 0.05)',
                      borderStyle: 'solid',
                      borderWidth: '1px',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      boxShadow: activeStep === agent.step ? `0 0 20px ${alpha(primaryColor, 0.1)}` : 'none',
                      '&:hover': {
                        borderColor: alpha(primaryColor, 0.3),
                      }
                    }}>
                      <BorderBeam activeColor={activeStep === agent.step ? primaryColor : undefined} />
                      <Box sx={{ color: activeStep === agent.step ? primaryColor : '#ffffff', mb: 2 }}>
                        {agent.svg}
                      </Box>
                      <Typography variant="h5" fontWeight="800" sx={{ mb: 1 }}>
                        {agent.title}
                      </Typography>
                      <Typography variant="body2" color="#94a3b8" sx={{ mb: 3, lineHeight: 1.6 }}>
                        {agent.desc}
                      </Typography>

                      {/* Progress Bar */}
                      <Box sx={{ width: '100%', bgcolor: 'rgba(255, 255, 255, 0.05)', height: 4, borderRadius: 2, overflow: 'hidden' }}>
                        <motion.div
                          animate={{ width: `${agent.progress}%` }}
                          transition={{ duration: 0.2 }}
                          style={{
                            height: '100%',
                            backgroundColor: primaryColor,
                            boxShadow: `0 0 8px ${primaryColor}`
                          }}
                        />
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Right side: The Realtime Terminal Console */}
            <Grid item xs={12} lg={6}>
              <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#030406',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                overflow: 'hidden'
              }}>
                {/* Console Header */}
                <Box sx={{ px: 3, py: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f56' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#27c93f' }} />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#94a3b8', ml: 2, fontWeight: 700 }}>
                      agentic-orchestrator.log
                    </Typography>
                  </Stack>
                  <Chip
                    label={simulationActive ? "RUNNING" : "IDLE"}
                    size="small"
                    sx={{
                      bgcolor: simulationActive ? alpha(primaryColor, 0.15) : 'rgba(255,255,255,0.05)',
                      color: simulationActive ? primaryColor : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.75rem'
                    }}
                  />
                </Box>

                {/* Console Log Area */}
                <Box
                  ref={logTerminalRef}
                  sx={{
                    flexGrow: 1,
                    p: 3,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.875rem',
                    color: '#e2e8f0',
                    overflowY: 'auto',
                    minHeight: '320px',
                    maxHeight: '420px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    bgcolor: '#030406',
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }
                  }}
                >
                  {logs.length === 0 ? (
                    <Box sx={{ m: 'auto', textAlign: 'center', color: '#64748b' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                        Console ready. Trigger an autonomous task to view orchestration logs.
                      </Typography>
                    </Box>
                  ) : (
                    logs.map((log, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          color: log.startsWith('[SYSTEM]') ? primaryColor : log.startsWith('[PLANNER]') ? '#38bdf8' : log.startsWith('[CODER]') ? '#fbbf24' : log.startsWith('[TESTER]') ? '#f87171' : log.startsWith('[DEPLOYER]') ? '#c084fc' : '#e2e8f0',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {log}
                      </motion.div>
                    ))
                  )}
                </Box>

                {/* Console Controls */}
                <Box sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.05)', bgcolor: 'rgba(255, 255, 255, 0.01)' }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={runSimulation}
                    disabled={simulationActive}
                    sx={{
                      bgcolor: primaryColor,
                      color: '#000000',
                      fontWeight: 800,
                      borderRadius: '8px',
                      py: 1.5,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      '&:hover': { bgcolor: alpha(primaryColor, 0.8) },
                      '&.Mui-disabled': { bgcolor: 'rgba(255, 255, 255, 0.05)', color: '#64748b' }
                    }}
                  >
                    {simulationActive ? "Executing Agent Loop..." : "Trigger Autonomous Task"}
                  </Button>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* --- AWARDS & MILESTONES --- */}
      <Container maxWidth="xl" sx={{ py: { xs: 8, md: 16 } }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h6" color="primary.main" fontWeight="700" sx={{ mb: 1, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Milestones
          </Typography>
          <Typography variant="h2" sx={{ fontWeight: 800, mb: 2, letterSpacing: '-0.02em' }}>
            Awards & Recognition
          </Typography>
        </Box>

        <TableContainer component={Paper} sx={{
          bgcolor: 'transparent',
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          boxShadow: 'none',
          overflow: 'hidden'
        }}>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(13, 14, 18, 0.4)' }}>
              <TableRow>
                <TableCell sx={{ color: '#ffffff', fontWeight: 700, borderColor: 'rgba(255, 255, 255, 0.05)', py: 2.5 }} width="15%">Year</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 700, borderColor: 'rgba(255, 255, 255, 0.05)', py: 2.5 }} width="45%">Award / Certification</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 700, borderColor: 'rgba(255, 255, 255, 0.05)', py: 2.5 }} width="25%">Provider</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 700, borderColor: 'rgba(255, 255, 255, 0.05)', py: 2.5 }} width="15%">Category</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                { year: '2026', title: 'Excellence in Web Engineering', provider: 'ExpectException', category: 'Portfolio Showcase' },
                { year: '2025', title: 'Advanced AI & Chatbot Integrator', provider: 'ExpExc platform', category: 'AI Automation' },
                { year: '2025', title: 'Full Stack Development Certification', provider: 'Developer Alliance', category: 'Mastery' },
                { year: '2024', title: 'Technical Leadership Award', provider: 'Open Source Guild', category: 'Contribution' },
              ].map((row, idx) => (
                <TableRow key={idx} sx={{
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.015)' },
                  transition: 'background-color 0.2s'
                }}>
                  <TableCell sx={{ color: primaryColor, fontWeight: 700, borderColor: 'rgba(255, 255, 255, 0.05)', py: 2.5 }}>{row.year}</TableCell>
                  <TableCell sx={{ color: '#ffffff', fontWeight: 600, borderColor: 'rgba(255, 255, 255, 0.05)', py: 2.5 }}>{row.title}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: 'rgba(255, 255, 255, 0.05)', py: 2.5 }}>{row.provider}</TableCell>
                  <TableCell sx={{ borderColor: 'rgba(255, 255, 255, 0.05)', py: 2.5 }}>
                    <Chip label={row.category} size="small" sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', color: '#ffffff', fontSize: '0.75rem' }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      {/* --- COLLABORATION PROCESS --- */}
      <Box sx={{ py: { xs: 8, md: 14 }, bgcolor: '#08090d', borderTop: '1px solid rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
        <Container maxWidth="xl">
          <Box sx={{ textAlign: 'center', mb: 10 }}>
            <Typography variant="h6" color="primary.main" fontWeight="700" sx={{ mb: 1, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Workflow
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 800, mb: 2, letterSpacing: '-0.02em' }}>
              How Collaboration Works
            </Typography>
            <Typography variant="h6" color="#94a3b8" sx={{ maxWidth: '600px', mx: 'auto', fontWeight: 400 }}>
              An agile, structured workflow designed to deliver exceptional results.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {[
              { num: '01', title: 'Project Discovery', desc: 'We align on your requirements, target audience, technical needs, and delivery schedule.' },
              { num: '02', title: 'Solution Planning', desc: 'Designing the architecture, user experience prototypes, and mapping out the full technical design.' },
              { num: '03', title: 'Agile Development', desc: 'Writing clean code in sprints, providing regular review builds, and integrating feedback loop details.' },
              { num: '04', title: 'Launch & Support', desc: 'Deploying to cloud platforms, optimizing SEO/performance, and offering post-launch support options.' },
            ].map((step, idx) => (
              <Grid item xs={12} sm={6} md={3} key={idx}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover="hover"
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <Card sx={{ 
                    height: '100%', 
                    p: 3.5, 
                    background: 'rgba(13, 14, 18, 0.3)', 
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      borderColor: alpha(primaryColor, 0.3),
                    },
                    '&:hover .border-beam-overlay': {
                      opacity: 1,
                    }
                  }}>
                    <BorderBeam />
                    <CardContent sx={{ p: 0 }}>
                      <Typography variant="h2" sx={{ color: alpha(primaryColor, 0.25), fontWeight: 900, mb: 2, fontSize: '3rem' }}>
                        {step.num}
                      </Typography>
                      <Typography variant="h5" fontWeight="800" sx={{ mb: 2 }}>
                        {step.title}
                      </Typography>
                      <Typography variant="body2" color="#94a3b8" sx={{ lineHeight: 1.6 }}>
                        {step.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* --- LATEST BLOGS --- */}
      <Container maxWidth="xl" sx={{ py: { xs: 8, md: 16 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
          <Box>
            <Typography variant="h6" color="primary.main" fontWeight="700" sx={{ mb: 1, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Insights
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              Latest Blogs
            </Typography>
          </Box>
          <Button
            component={Link}
            to="/blogs"
            variant="outlined"
            endIcon={<ArrowForward />}
            sx={{
              borderRadius: '20px',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              '&:hover': {
                borderColor: primaryColor,
                color: primaryColor,
              }
            }}
          >
            VIEW ALL BLOGS
          </Button>
        </Box>

        <Grid container spacing={4}>
          {loadingPosts ? (
            [1, 2, 3].map(n => (
              <Grid item xs={12} md={4} key={n}>
                <Card sx={{ height: '100%', minHeight: '280px' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                      <Skeleton variant="text" width={80} />
                    </Box>
                    <Skeleton variant="text" width="90%" height={32} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width="100%" height={20} />
                    <Skeleton variant="text" width="100%" height={20} />
                    <Skeleton variant="text" width="70%" height={20} sx={{ mb: 2 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : latestPosts.length > 0 ? (
            latestPosts.map((blog, idx) => (
              <Grid item xs={12} md={4} key={blog.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover="hover"
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      minHeight: '280px',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        borderColor: alpha(primaryColor, 0.3),
                      },
                      '&:hover .border-beam-overlay': {
                        opacity: 1,
                      }
                    }}
                  >
                    <BorderBeam />
                    <CardContent sx={{ p: 3.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                        <Chip label="Blog" size="small" sx={{ bgcolor: alpha(primaryColor, 0.08), color: primaryColor, fontWeight: 700 }} />
                        <Typography variant="caption" color="#94a3b8">
                          {new Date(blog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Typography>
                      </Box>
                      <Typography variant="h5" fontWeight="800" gutterBottom sx={{ flexGrow: 0, mb: 2 }}>
                        {blog.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="#94a3b8"
                        sx={{
                          mb: 4,
                          flexGrow: 1,
                          display: '-webkit-box',
                          overflow: 'hidden',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 3,
                          lineHeight: 1.6,
                        }}
                      >
                        {excerptFromHtml(blog.content, 140)}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto' }}>
                        <Button
                          component={Link}
                          to={`/blogs/${blog.id}`}
                          size="small"
                          endIcon={<ArrowForward />}
                          sx={{ color: primaryColor, fontWeight: 700 }}
                        >
                          Read More
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 6, border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px' }}>
                <Typography variant="h6" color="#94a3b8">
                  No recent articles. Check back soon!
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* --- CTA / HIRE SECTION --- */}
      <Container maxWidth="xl" sx={{ py: { xs: 8, md: 10 } }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card
            sx={{
              background: `linear-gradient(135deg, rgba(13, 14, 18, 0.8) 0%, rgba(13, 14, 18, 0.4) 100%)`,
              border: `1px solid rgba(255, 255, 255, 0.08)`,
              borderRadius: '24px',
              position: 'relative',
              overflow: 'hidden',
              p: { xs: 4, md: 8 },
            }}
          >
            {/* Neon Accent Glow */}
            <Box sx={{
              position: 'absolute',
              top: '-10%',
              right: '-10%',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${alpha(primaryColor, 0.12)} 0%, transparent 70%)`,
              filter: 'blur(30px)',
              pointerEvents: 'none'
            }} />

            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} md={7}>
                <Typography variant="h2" sx={{ fontWeight: 900, mb: 3, letterSpacing: '-0.02em' }}>
                  Ready to start your project?
                </Typography>
                <Typography variant="h6" color="#94a3b8" sx={{ mb: 5, fontWeight: 400, maxWidth: '550px', lineHeight: 1.6 }}>
                  Let's discuss how we can build a premium digital experience together. Tell me about your goals, requirements, and budget.
                </Typography>

                <Stack spacing={2.5}>
                  {[
                    'Free consultation & scoping call',
                    'Agile deliverables with weekly demos',
                    'Sleek designs and clean architecture guaranteed'
                  ].map((item, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckCircle sx={{ color: primaryColor, fontSize: 20 }} />
                      <Typography variant="body1" fontWeight="600" color="#ffffff">{item}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={12} md={5} sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                <Box sx={{
                  p: 4,
                  bgcolor: 'rgba(5, 5, 5, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '16px',
                  display: 'inline-block',
                  width: '100%',
                  maxWidth: '380px',
                }}>
                  <RocketLaunch sx={{ fontSize: 48, color: primaryColor, mb: 3 }} />
                  <Typography variant="h4" fontWeight="800" sx={{ mb: 1.5 }}>Let's Collaborate</Typography>
                  <Typography variant="body2" color="#94a3b8" sx={{ mb: 4, lineHeight: 1.5 }}>
                    Receive a comprehensive, custom proposal for your project within 24 hours.
                  </Typography>
                  <Button
                    component={Link}
                    to="/hire"
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={{
                      borderRadius: '30px',
                      fontWeight: 800,
                      background: primaryColor,
                      color: '#000000',
                      '&:hover': {
                        background: alpha(primaryColor, 0.9),
                        boxShadow: `0 8px 20px ${alpha(primaryColor, 0.3)}`,
                      }
                    }}
                  >
                    GET A FREE QUOTE
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </motion.div>
      </Container>
    </Box>
  );
};

export default HomePage;