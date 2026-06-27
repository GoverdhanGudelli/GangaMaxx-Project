import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your GangaMaxx AI. Try asking me for a "hospital kit" or about "bleach safety"!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await api.chat(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Oops! My circuits got crossed. Please make sure the backend server is running.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button 
          className="ai-fab" 
          onClick={() => setIsOpen(true)}
          title="Open AI Assistant"
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-chat-title">
              <Bot size={20} className="ai-title-icon" />
              <span>GangaMaxx AI</span>
            </div>
            <button className="ai-close-btn" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="ai-chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`ai-message ${msg.role}`}>
                <div className="ai-message-icon">
                  {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className="ai-message-content">
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="ai-message assistant">
                <div className="ai-message-icon"><Bot size={16} /></div>
                <div className="ai-message-content typing-indicator">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="ai-chat-input" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Ask me anything..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={!input.trim() || isTyping}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <style>{`
        .ai-fab {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #ffffff;
          color: var(--color-primary);
          border: 1px solid rgba(16, 185, 129, 0.2);
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.2), 0 5px 10px rgba(0,0,0,0.05);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ai-fab:hover {
          transform: translateY(-5px) scale(1.05);
          box-shadow: 0 15px 35px rgba(16, 185, 129, 0.3), 0 5px 15px rgba(0,0,0,0.1);
          background: var(--color-primary);
          color: #ffffff;
        }

        .ai-chat-window {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 360px;
          height: 520px;
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          z-index: 10000;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(16, 185, 129, 0.1);
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .ai-chat-header {
          padding: 18px 20px;
          background: #ffffff;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
          z-index: 2;
        }

        .ai-chat-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          color: #1e293b;
          font-size: 1.1rem;
        }

        .ai-title-icon {
          color: var(--color-primary);
        }

        .ai-close-btn {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-close-btn:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fca5a5;
          transform: rotate(90deg);
        }

        .ai-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          background: #fcfcfc;
        }

        .ai-message {
          display: flex;
          gap: 12px;
          max-width: 88%;
        }

        .ai-message.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .ai-message-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }

        .assistant .ai-message-icon {
          background: #ecfdf5;
          color: var(--color-primary);
          border: 1px solid #d1fae5;
        }

        .user .ai-message-icon {
          background: var(--color-primary);
          color: #ffffff;
        }

        .ai-message-content {
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 0.92rem;
          line-height: 1.5;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .assistant .ai-message-content {
          background: #ffffff;
          color: #334155;
          border: 1px solid #e2e8f0;
          border-top-left-radius: 4px;
        }

        .user .ai-message-content {
          background: var(--color-primary);
          color: #ffffff;
          border-top-right-radius: 4px;
        }

        .ai-chat-input {
          display: flex;
          padding: 16px 20px;
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
          box-shadow: 0 -4px 10px rgba(0,0,0,0.02);
          z-index: 2;
        }

        .ai-chat-input input {
          flex: 1;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 12px 18px;
          border-radius: 24px;
          color: #1e293b;
          font-family: inherit;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .ai-chat-input input::placeholder {
          color: #94a3b8;
        }

        .ai-chat-input input:focus {
          outline: none;
          background: #ffffff;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .ai-chat-input button {
          background: var(--color-primary);
          color: #fff;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          margin-left: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
        }

        .ai-chat-input button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(16, 185, 129, 0.4);
        }

        .ai-chat-input button:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }

        .typing-indicator span {
          animation: blink 1.4s infinite both;
          font-size: 1.4rem;
          line-height: 0.5;
          color: var(--color-primary);
        }

        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>
    </>
  );
}
