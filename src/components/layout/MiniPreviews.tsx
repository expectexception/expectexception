import React, { useState, useEffect } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartToy, Photo, FileCopy, Link } from '@mui/icons-material';

// --- AI Chatbot Mini Preview ---
export const ChatbotPreview: React.FC = () => {
  const theme = useTheme();
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai', text: string }>>([]);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 0) {
      setMessages([]);
      timer = setTimeout(() => {
        setMessages([{ sender: 'user', text: 'Optimizing code...' }]);
        setStep(1);
      }, 1000);
    } else if (step === 1) {
      timer = setTimeout(() => {
        setMessages(prev => [...prev, { sender: 'ai', text: 'Analysis complete: Bundle size reduced by 42%!' }]);
        setStep(2);
      }, 1500);
    } else if (step === 2) {
      timer = setTimeout(() => {
        setStep(0);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <Box sx={{ width: '100%', height: '100%', p: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 1, overflow: 'hidden' }}>
      <AnimatePresence>
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            style={{
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: msg.sender === 'user' ? '#1e293b' : alpha(theme.palette.primary.main, 0.1),
              border: msg.sender === 'user' ? '1px solid rgba(255,255,255,0.05)' : `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              padding: '6px 12px',
              borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            }}
          >
            <Typography variant="caption" sx={{
              color: msg.sender === 'user' ? '#ffffff' : 'primary.main',
              fontSize: '0.72rem', 
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}>
              {msg.sender === 'ai' && <SmartToy sx={{ fontSize: 12 }} />}
              {msg.text}
            </Typography>
          </motion.div>
        ))}
      </AnimatePresence>
    </Box>
  );
};

// --- Image Compressor Mini Preview ---
export const CompressorPreview: React.FC = () => {
  const theme = useTheme();
  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Background Graphic (Representing an image) */}
      <Box sx={{ width: '85%', height: '80%', borderRadius: 1.5, position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Left Side: Uncompressed (Detailed) */}
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: '#111318', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Photo sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.1))' }} />
          <Typography variant="caption" sx={{ position: 'absolute', top: 6, left: 8, fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace' }}>
            ORIGINAL: 1.2 MB
          </Typography>
        </Box>

        {/* Right Side: Compressed (Covered by sweep) */}
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: '100%',
            background: '#0d0e12',
            borderLeft: `2px solid ${theme.palette.primary.main}`,
            boxShadow: `-5px 0 15px ${alpha(theme.palette.primary.main, 0.2)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            originX: 1,
          }}
          animate={{
            width: ['100%', '0%', '100%']
          }}
          transition={{
            repeat: Infinity,
            duration: 4,
            ease: 'easeInOut'
          }}
        >
          <Photo sx={{ fontSize: 40, color: 'primary.main', opacity: 0.8, filter: `drop-shadow(0 0 15px ${alpha(theme.palette.primary.main, 0.4)})` }} />
          <Typography variant="caption" sx={{ position: 'absolute', top: 6, right: 8, fontSize: '0.65rem', color: 'primary.main', fontFamily: 'monospace', fontWeight: 700 }}>
            COMPRESSED: 150 KB
          </Typography>
          <Box sx={{ position: 'absolute', bottom: 6, right: 8, px: 0.75, py: 0.25, bgcolor: alpha(theme.palette.primary.main, 0.15), border: '1px solid', borderColor: 'primary.main', borderRadius: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.6rem', fontWeight: 800 }}>-88%</Typography>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
};

// --- PDF Merger Mini Preview ---
export const PdfPreview: React.FC = () => {
  const theme = useTheme();
  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {/* File 1 */}
      <motion.div
        style={{
          position: 'absolute',
          width: 32,
          height: 42,
          borderRadius: 4,
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
        }}
        animate={{
          x: [-60, -10, -10, -60],
          y: [-5, 0, 0, -5],
          opacity: [1, 1, 0, 1],
          scale: [1, 0.9, 0.8, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: 'easeInOut'
        }}
      >
        <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 700 }}>PDF</Typography>
      </motion.div>

      {/* File 2 */}
      <motion.div
        style={{
          position: 'absolute',
          width: 32,
          height: 42,
          borderRadius: 4,
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
        }}
        animate={{
          x: [60, 10, 10, 60],
          y: [5, 0, 0, 5],
          opacity: [1, 1, 0, 1],
          scale: [1, 0.9, 0.8, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: 'easeInOut'
        }}
      >
        <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 700 }}>PDF</Typography>
      </motion.div>

      {/* Merged Target Portal */}
      <motion.div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '2px dashed rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
        }}
        animate={{
          borderColor: ['rgba(255,255,255,0.15)', theme.palette.primary.main, 'rgba(255,255,255,0.15)'],
          scale: [1, 1.15, 1],
          boxShadow: ['0 0 0px transparent', `0 0 15px ${alpha(theme.palette.primary.main, 0.3)}`, '0 0 0px transparent'],
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: 'easeInOut'
        }}
      >
        <motion.div
          animate={{
            scale: [0, 0, 1.2, 0],
            opacity: [0, 0, 1, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: 'easeInOut'
          }}
        >
          <FileCopy sx={{ color: 'primary.main', fontSize: 20 }} />
        </motion.div>
      </motion.div>
    </Box>
  );
};

// --- URL Converter Mini Preview ---
export const UrlPreview: React.FC = () => {
  const theme = useTheme();
  const [urlState, setUrlState] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setUrlState(prev => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box sx={{ width: '100%', height: '100%', px: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
      {/* Input Box */}
      <Box sx={{ 
        width: '100%', 
        py: 0.75, 
        px: 1.5, 
        borderRadius: 1, 
        bgcolor: '#111318', 
        border: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        overflow: 'hidden'
      }}>
        <Link sx={{ fontSize: 14, color: 'text.secondary' }} />
        <Typography variant="caption" sx={{ 
          fontFamily: 'monospace', 
          color: urlState === 0 ? '#ffffff' : '#888',
          fontSize: '0.65rem',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          width: '100%'
        }}>
          {urlState === 0 
            ? 'https://expectexception.com/tools/url-converter/' 
            : 'Processing...'}
        </Typography>
      </Box>

      {/* Output / Copy Action */}
      <motion.div
        animate={{
          y: urlState === 2 ? 0 : 5,
          opacity: urlState === 2 ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        <Box sx={{ 
          width: '100%', 
          py: 0.75, 
          px: 1.5, 
          borderRadius: 1, 
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.main', fontSize: '0.68rem', fontWeight: 700 }}>
            expexc.co/url-conv
          </Typography>
          <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}>
            Copied!
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
};
