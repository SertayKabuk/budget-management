import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';
import { useTranslation } from '../contexts/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Props {
  groupId: string;
  userId: string;
  userName: string;
}

export default function ChatInterface({ groupId, userId, userName }: Props) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();

    // Handle initial connection state
    if (socket.connected) {
      setIsConnected(true);
      socket.emit('join-group', groupId);
    }

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-group', groupId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('chat-response', (data: { message: string; timestamp: Date }) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message, timestamp: new Date(data.timestamp) },
      ]);
    });

    socket.on('expense-created', (data: any) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `${t.chat.expenseCreated}: $${data.expense.amount} - ${data.expense.description}`,
          timestamp: new Date(),
        },
      ]);
    });

    socket.on('chat-error', (data: { message: string }) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `${t.chat.error} ${data.message}`, timestamp: new Date() },
      ]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('chat-response');
      socket.off('expense-created');
      socket.off('chat-error');
    };
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const socket = getSocket();
    socket.emit('chat-message', {
      message: input,
      userId,
      groupId,
      userName,
    });

    setInput('');
  };

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <h3 className="text-lg font-semibold">{t.chat.title}</h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-600">
            {isConnected ? t.chat.connected : t.chat.disconnected}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>{t.chat.emptyState}</p>
            <p className="text-sm mt-2">
              {t.chat.emptyStateTip}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.chat.placeholder}
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!isConnected}
        />
        <button
          type="submit"
          disabled={!isConnected || !input.trim()}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-medium"
        >
          {t.chat.send}
        </button>
      </form>
    </div>
  );
}
