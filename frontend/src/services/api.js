import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-chatbot-p5rc.onrender.com';

// Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally → logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);

// ─── Conversations ────────────────────────────
export const getConversations = () => api.get('/conversations');
export const getMessages = (conversationId) => api.get(`/messages/${conversationId}`);
export const deleteConversation = (conversationId) => api.delete(`/conversations/${conversationId}`);
export const createNewChat = () => api.post('/new-chat');
export const getUsage = () => api.get('/usage');

// ─── Streaming Chat ───────────────────────────
/**
 * Streams an AI response using the Fetch ReadableStream API (SSE over POST).
 * @param {string} message - The user's message
 * @param {string|null} conversationId - Existing conversation ID (null = new chat)
 * @param {function} onToken - Called with each streamed token string
 * @param {function} onConversationId - Called with (conversationId, rateInfo)
 * @param {function} onDone - Called when streaming is complete
 * @param {function} onError - Called on error
 */
export const streamChat = async (
  message,
  conversationId,
  { onToken, onConversationId, onDone, onError }
) => {
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId || null,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP error ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();

        if (data === '[DONE]') {
          onDone?.();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.conversation_id) onConversationId?.(parsed.conversation_id, parsed.rate || null);
          if (parsed.token) onToken?.(parsed.token);
          if (parsed.error) {
            // Server sent an explicit error — surface it immediately
            onError?.(parsed.error);
            onDone?.();
            return;
          }
        } catch (parseErr) {
          // Only ignore true JSON parse failures, not logic errors
          if (parseErr instanceof SyntaxError) continue;
          throw parseErr; // Re-throw non-parse errors
        }
      }
    }

    onDone?.();
  } catch (err) {
    onError?.(err.message || 'Streaming failed');
  }
};

export default api;
