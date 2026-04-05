import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Message from '../components/Message';
import ChatBox from '../components/ChatBox';
import TypingIndicator from '../components/TypingIndicator';
import { getConversations, getMessages, streamChat, getUsage } from '../services/api';

const SUGGESTIONS = [
  { icon: '✍️', text: 'Help me write a professional email' },
  { icon: '💻', text: 'Explain React hooks with examples' },
  { icon: '🧮', text: 'Solve a complex math problem' },
  { icon: '🌍', text: 'Tell me an interesting fact today' },
];

const ChatPage = ({ user, onLogout }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [usage, setUsage] = useState({ used: 0, limit: 10, remaining: 10 });
  const messagesEndRef = useRef(null);

  // ─── Helpers ───────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  // ─── Load Conversations ─────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  // ─── Load Usage ─────────────────────────────
  const fetchUsage = useCallback(async () => {
    try {
      const res = await getUsage();
      setUsage(res.data);
    } catch (err) {
      console.error('Failed to load usage:', err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchUsage();
  }, [fetchConversations, fetchUsage]);

  // ─── Load Messages for a Conversation ──────
  const loadConversation = useCallback(async (convId) => {
    setLoadingMessages(true);
    setMessages([]);
    setCurrentConversationId(convId);
    try {
      const res = await getMessages(convId);
      setMessages(res.data);
      scrollToBottom();
    } catch (err) {
      showToast('Failed to load messages', 'error');
    } finally {
      setLoadingMessages(false);
    }
  }, [scrollToBottom, showToast]);

  // ─── New Chat ───────────────────────────────
  const handleNewChat = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
  }, []);

  // ─── Send Message & Stream ──────────────────
  const handleSend = useCallback(async (text) => {
    if (isStreaming) return;

    // Optimistically add user message to UI
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    // Placeholder for AI message (will be populated by streaming)
    const aiMsgId = `ai-${Date.now()}`;
    setIsStreaming(true);

    let resolvedConvId = currentConversationId;

    await streamChat(text, currentConversationId, {
      onConversationId: (convId, rateInfo) => {
        resolvedConvId = convId;
        setCurrentConversationId(convId);
        // Update usage counter if rate info was sent
        if (rateInfo) setUsage(rateInfo);
        // Add empty AI message to start populating
        setMessages((prev) => [
          ...prev,
          {
            id: aiMsgId,
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
          },
        ]);
      },
      onToken: (token) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? { ...msg, content: msg.content + token }
              : msg
          )
        );
        scrollToBottom();
      },
      onDone: () => {
        setIsStreaming(false);
        fetchConversations(); // Refresh sidebar
        fetchUsage();         // Refresh usage count
      },
      onError: (errMsg) => {
        setIsStreaming(false);
        // Remove the empty AI placeholder if it was added
        setMessages((prev) => prev.filter((msg) => !(msg.id === aiMsgId && msg.content === '')));
        showToast(errMsg, 'error');
      },
    });
  }, [isStreaming, currentConversationId, scrollToBottom, fetchConversations, fetchUsage, showToast]);

  // Handle suggestion click
  const handleSuggestion = (text) => {
    handleSend(text);
  };

  const userInitial = user?.username?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="app-layout">
      {/* Mobile sidebar toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 199, display: 'none',
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={(id) => {
          loadConversation(id);
          setSidebarOpen(false);
        }}
        onNewChat={handleNewChat}
        onConversationsChange={setConversations}
        user={user}
        onLogout={onLogout}
        isOpen={sidebarOpen}
      />

      {/* Main area */}
      <div className="chat-area">
        <div className="messages-container">
          {/* Welcome screen if no messages */}
          {messages.length === 0 && !loadingMessages && (
            <div className="welcome-screen">
              <div className="welcome-icon">🤖</div>
              <h1 className="welcome-title">How can I help you?</h1>
              <p className="welcome-subtitle">
                Ask me anything — I can help with writing, coding, analysis, learning, and much more.
              </p>
              <div className="welcome-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <div
                    key={i}
                    className="suggestion-card"
                    onClick={() => handleSuggestion(s.text)}
                  >
                    <div className="suggestion-card-icon">{s.icon}</div>
                    <div className="suggestion-card-text">{s.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading messages */}
          {loadingMessages && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner" />
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <Message key={msg.id} message={msg} userInitial={userInitial} />
          ))}

          {/* Typing indicator — shown only while waiting for the first token */}
          {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
            <TypingIndicator />
          )}

          <div ref={messagesEndRef} />
        </div>

        <ChatBox
          onSend={handleSend}
          isStreaming={isStreaming}
          disabled={loadingMessages || usage.remaining === 0}
          usage={usage}
        />
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
