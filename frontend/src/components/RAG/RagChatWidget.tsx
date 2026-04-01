import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Fab, Paper, Typography, TextField, IconButton,
  Divider, CircularProgress, Tooltip, Collapse,
} from '@mui/material';
import {
  MenuBook as KBIcon, Close as CloseIcon,
  Send as SendIcon, DeleteOutline as ClearIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  addUserMessage, appendStreamChunk, finalizeStream, streamError, clearChat,
} from '../../store/slices/ragSlice';
import { queryStream } from '../../services/ragService';

interface RagChatWidgetProps {
  /** Optional hint injected into queries (e.g. current test name + standard) */
  contextHint?: string;
}

const RagChatWidget: React.FC<RagChatWidgetProps> = ({ contextHint }) => {
  const dispatch = useAppDispatch();
  const { chat, querying } = useAppSelector((s) => s.rag);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom whenever chat updates
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, open]);

  // Cancel any in-flight stream when widget closes
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || querying) return;
    setInput('');
    dispatch(addUserMessage(q));

    abortRef.current = queryStream(
      q,
      contextHint,
      (chunk) => dispatch(appendStreamChunk(chunk)),
      () => dispatch(finalizeStream()),
      (msg) => dispatch(streamError(msg)),
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      {/* Floating action button */}
      <Tooltip title="CQM Knowledge Base" placement="left">
        <Fab
          color="primary" size="medium"
          onClick={() => setOpen((v) => !v)}
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}
        >
          {open ? <CloseIcon /> : <KBIcon />}
        </Fab>
      </Tooltip>

      {/* Chat panel */}
      <Collapse in={open} sx={{ position: 'fixed', bottom: 88, right: 24, zIndex: 1300 }}>
        <Paper
          elevation={8}
          sx={{
            width: { xs: 'calc(100vw - 48px)', sm: 580, md: 680 },
            height: { xs: '70vh', sm: '72vh', md: '75vh' },
            display: 'flex', flexDirection: 'column',
            borderRadius: 2, overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box sx={{ px: 2, py: 1.5, backgroundColor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
            <KBIcon fontSize="small" />
            <Typography variant="subtitle2" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              CQM Knowledge Base
            </Typography>
            {contextHint && (
              <Typography variant="caption" sx={{ opacity: 0.8, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {contextHint}
              </Typography>
            )}
            <Tooltip title="Clear chat">
              <IconButton size="small" sx={{ color: 'white' }} onClick={() => dispatch(clearChat())}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider />

          {/* Messages */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {chat.length === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1, opacity: 0.6 }}>
                <KBIcon sx={{ fontSize: 48 }} color="disabled" />
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Ask a question about ISO standards or CQM procedures.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 320 }}>
                  e.g. "What are the peel strength requirements?" or "Explain the corner impact test procedure."
                </Typography>
              </Box>
            )}
            {chat.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  backgroundColor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  px: 2, py: 1.25,
                  boxShadow: 1,
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6, fontSize: '0.875rem' }}>
                  {msg.text}
                  {msg.streaming && (
                    <Box component="span" sx={{ display: 'inline-block', width: 8, height: 14, ml: 0.5, backgroundColor: 'currentColor', animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom', '@keyframes blink': { '50%': { opacity: 0 } } }} />
                  )}
                </Typography>
              </Box>
            ))}
            <div ref={bottomRef} />
          </Box>

          <Divider />

          {/* Input */}
          <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end', backgroundColor: 'background.paper' }}>
            <TextField
              size="small" multiline maxRows={4} fullWidth
              placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={querying}
            />
            <IconButton
              color="primary" onClick={handleSend}
              disabled={!input.trim() || querying}
              sx={{ mb: 0.25 }}
            >
              {querying ? <CircularProgress size={20} /> : <SendIcon />}
            </IconButton>
          </Box>
        </Paper>
      </Collapse>
    </>
  );
};

export default RagChatWidget;
