import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';
import { useTranslation } from '../contexts/LanguageContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imagePreview?: string; // For displaying user-uploaded images
  isStreaming?: boolean; // To indicate if message is being streamed
}

interface ExpenseCreatedData {
  expense: {
    amount: number;
    description: string;
  };
}

interface Props {
  groupId: string;
  userId: string;
  userName: string;
}

export default function MultimodalChatInterface({ groupId, userId, userName }: Props) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
      setIsWaitingForResponse(false);
      setMessages((prev) => {
        // Check if we already have a streaming message, update it
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, content: data.message, timestamp: new Date(data.timestamp), isStreaming: false },
          ];
        }
        // Otherwise add a new message
        return [
          ...prev,
          { role: 'assistant', content: data.message, timestamp: new Date(data.timestamp) },
        ];
      });
    });

    socket.on('chat-stream', (data: { content: string; done: boolean }) => {
      if (data.done) {
        // Streaming complete
        setIsWaitingForResponse(false);
      } else {
        // Update or create streaming message
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
            // Append to existing streaming message
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: lastMessage.content + data.content },
            ];
          } else {
            // Create new streaming message
            return [
              ...prev,
              { role: 'assistant', content: data.content, timestamp: new Date(), isStreaming: true },
            ];
          }
        });
      }
    });

    socket.on('expense-created', (data: ExpenseCreatedData) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `${t.chat?.expenseCreated || '✅ Expense created'}: ${data.expense.amount} TL - ${data.expense.description}`,
          timestamp: new Date(),
        },
      ]);
    });

    socket.on('chat-error', (data: { message: string }) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `${t.chat?.error || '❌'} ${data.message}`, timestamp: new Date() },
      ]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('chat-response');
      socket.off('chat-stream');
      socket.off('expense-created');
      socket.off('chat-error');
      // Clean up camera stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [groupId, stream, t.chat?.error, t.chat?.expenseCreated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        // Extract base64 without the data URL prefix
        const base64 = result.split(',')[1];
        setImageBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setUseCamera(true);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
          });
        }
      }, 100);
    } catch (error) {
      console.error('Camera error:', error);
      alert(t.invoice?.cameraError || 'Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImagePreview(dataUrl);
        // Extract base64 without the data URL prefix
        const base64 = dataUrl.split(',')[1];
        setImageBase64(base64);
      }
      stopCamera();
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !imageBase64) return;

    const userMessage: Message = {
      role: 'user',
      content: input || (imageBase64 ? (t.chat?.imageMessage || 'Sent an invoice image') : ''),
      timestamp: new Date(),
      imagePreview: imagePreview || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsWaitingForResponse(true);

    const socket = getSocket();
    socket.emit('chat-message', {
      message: input,
      userId,
      groupId,
      userName,
      imageBase64: imageBase64 || undefined,
    });

    setInput('');
    clearImage();
  };

  return (
    <div className="flex flex-col h-[500px] sm:h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 pb-3 border-b">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
            {t.chat?.title || 'AI Assistant'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {t.home?.chatSubtitle || 'Send messages or upload invoices'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-xs sm:text-sm text-gray-600">
            {isConnected ? (t.chat?.connected || 'Connected') : (t.chat?.disconnected || 'Disconnected')}
          </span>
        </div>
      </div>

      {/* Camera View */}
      {useCamera && (
        <div className="mb-4 relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-[300px] rounded-lg border bg-black"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={capturePhoto}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <span className="text-xl">📸</span>
              {t.invoice?.capturePhoto || 'Capture'}
            </button>
            <button
              onClick={stopCamera}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium"
            >
              {t.invoice?.cancel || 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-3 sm:mb-4 space-y-3 sm:space-y-4 px-1">
        {messages.length === 0 && !useCamera && (
          <div className="text-center text-gray-500 mt-12">
            <div className="mb-4">
              <span className="text-6xl">💬</span>
            </div>
            <p className="text-sm sm:text-base font-medium mb-2">
              {t.chat?.emptyState || 'No messages yet'}
            </p>
            <p className="text-xs sm:text-sm">
              {t.chat?.emptyStateTip || 'Type a message or upload an invoice to get started'}
            </p>
            <div className="mt-4 text-xs text-gray-400">
              <p>{t.chat?.exampleMessage || '💬 "I spent 50 TL on groceries"'}</p>
              <p>{t.chat?.exampleUpload || '📸 Upload invoice images'}</p>
              <p>{t.chat?.exampleCamera || '📷 Use camera to scan receipts'}</p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-3 sm:px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {message.imagePreview && (
                <img 
                  src={message.imagePreview} 
                  alt="Uploaded" 
                  className="rounded mb-2 max-w-full max-h-48 object-contain"
                />
              )}
              {message.role === 'assistant' ? (
                <div className="chat-markdown">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
              )}
              {message.isStreaming && (
                <span className="inline-block ml-1 cursor-blink">▋</span>
              )}
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isWaitingForResponse && messages.length > 0 && !messages[messages.length - 1].isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] sm:max-w-[70%] rounded-lg px-3 sm:px-4 py-2 bg-gray-200 text-gray-900">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-sm text-gray-600">{t.chat?.thinking || 'Thinking...'}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && !useCamera && (
        <div className="mb-3 relative">
          <div className="relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-h-32 rounded-lg border-2 border-blue-500"
            />
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs font-bold"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t.invoice?.tip || 'Image ready to send'}
          </p>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected || useCamera}
            className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 p-2 sm:p-3 rounded-lg"
            title={t.invoice?.chooseFile || 'Upload image'}
          >
            <span className="text-xl">📎</span>
          </button>
          
          <button
            type="button"
            onClick={useCamera ? stopCamera : startCamera}
            disabled={!isConnected}
            className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 p-2 sm:p-3 rounded-lg"
            title={useCamera ? (t.invoice?.stopCamera || 'Stop camera') : (t.invoice?.useCamera || 'Use camera')}
          >
            <span className="text-xl">📷</span>
          </button>
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.chat?.placeholder || 'Type a message or upload an invoice...'}
          className="flex-1 p-2 sm:p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          disabled={!isConnected || useCamera}
        />
        
        <button
          type="submit"
          disabled={!isConnected || (!input.trim() && !imageBase64) || useCamera}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-2 sm:p-3 rounded-lg font-medium"
          title={t.chat?.send || 'Send'}
        >
          <span className="text-xl">➤</span>
        </button>
      </form>
    </div>
  );
}
