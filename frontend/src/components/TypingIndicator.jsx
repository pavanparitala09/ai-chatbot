import React from 'react';

const TypingIndicator = () => {
  return (
    <div className="typing-wrapper">
      <div className="message-avatar ai-avatar">🤖</div>
      <div className="typing-bubble">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
};

export default TypingIndicator;
