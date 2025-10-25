import { io, Socket } from 'socket.io-client';
import { config } from '../config/runtime';

const WS_URL = config.wsUrl;

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('auth_token');
    socket = io(WS_URL, {
      auth: {
        token: token,
      },
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      if (error.message.includes('Authentication')) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
