import React, { useRef, useEffect, useState } from 'react';

const ChatBox = ({ onSend, isStreaming, disabled, usage }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Usage bar color: green → yellow → red
  const usedCount  = usage?.used  ?? 0;
  const limitCount = usage?.limit ?? 10;
  const remaining  = usage?.remaining ?? limitCount;
  const pct        = limitCount > 0 ? (usedCount / limitCount) * 100 : 0;
  const barColor   = pct >= 90 ? '#f43f5e' : pct >= 60 ? '#f59e0b' : '#10b981';
  const limitReached = remaining === 0;

  return (
    <div className="chat-input-area">
      {/* Daily usage bar */}
      {usage && (
        <div style={{ maxWidth: 860, margin: '0 auto 10px', padding: '0 2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: limitReached ? '#f43f5e' : 'var(--text-muted)' }}>
              {limitReached
                ? '🚫 Daily limit reached — resets at midnight'
                : `⚡ Daily messages: ${usedCount} / ${limitCount} used`}
            </span>
            <span style={{ fontSize: 11, color: barColor, fontWeight: 600 }}>
              {remaining} left
            </span>
          </div>
          <div style={{
            height: 3,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: barColor,
              borderRadius: 10,
              transition: 'width 0.4s ease, background 0.4s ease',
              boxShadow: `0 0 6px ${barColor}80`,
            }} />
          </div>
        </div>
      )}

      <div className="input-container" style={{ opacity: limitReached ? 0.5 : 1 }}>
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            limitReached
              ? 'Daily limit reached. Come back tomorrow!'
              : isStreaming
              ? 'AI is responding...'
              : 'Message AI Assistant... (Shift+Enter for newline)'
          }
          rows={1}
          disabled={isStreaming || disabled}
          id="chat-input"
        />
        <button
          className={`send-btn ${isStreaming ? 'streaming' : ''}`}
          onClick={handleSend}
          disabled={!text.trim() || isStreaming || disabled}
          id="send-btn"
          title={isStreaming ? 'AI is responding...' : 'Send message (Enter)'}
        >
          {isStreaming ? (
            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          ) : (
            '↑'
          )}
        </button>
      </div>
      {!limitReached && (
        <p className="input-hint">
          Press <strong>Enter</strong> to send · <strong>Shift+Enter</strong> for new line
        </p>
      )}
    </div>
  );
};

export default ChatBox;

