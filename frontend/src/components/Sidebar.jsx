import React, { useState } from 'react';
import { deleteConversation, createNewChat } from '../services/api';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Sidebar = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onConversationsChange,
  user,
  onLogout,
  isOpen,
}) => {
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    setDeletingId(convId);
    try {
      await deleteConversation(convId);
      onConversationsChange(conversations.filter((c) => c.id !== convId));
      if (currentConversationId === convId) onNewChat();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleNewChat = async () => {
    onNewChat();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🤖</div>
          <span className="sidebar-logo-name">AI Assistant</span>
        </div>

        <button className="btn btn-primary new-chat-btn" onClick={handleNewChat} id="new-chat-btn">
          <span>✚</span> New Chat
        </button>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            className="input"
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="search-conversations"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="conv-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-text">
              {search ? 'No conversations found' : 'Start your first conversation!'}
            </div>
          </div>
        ) : (
          <>
            <div className="sidebar-section-title">Recent Chats</div>
            {filtered.map((conv) => (
              <div
                key={conv.id}
                className={`conv-item ${currentConversationId === conv.id ? 'active' : ''}`}
                onClick={() => onSelectConversation(conv.id)}
                id={`conv-${conv.id}`}
              >
                <span className="conv-item-icon">
                  {currentConversationId === conv.id ? '▶' : '💬'}
                </span>
                <div className="conv-item-info">
                  <div className="conv-item-title">{conv.title}</div>
                  <div className="conv-item-meta">
                    {conv.message_count} msg · {formatDate(conv.updated_at)}
                  </div>
                </div>
                <button
                  className="conv-delete-btn"
                  onClick={(e) => handleDelete(e, conv.id)}
                  disabled={deletingId === conv.id}
                  title="Delete conversation"
                >
                  {deletingId === conv.id ? '⏳' : '🗑'}
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* User Footer */}
      {user && (
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <div className="user-name">{user.username}</div>
              <div className="user-email">{user.email}</div>
            </div>
            <button
              className="logout-btn"
              onClick={onLogout}
              title="Logout"
              id="logout-btn"
            >
              ⏻
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
