import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import EncryptedStorage from 'react-native-encrypted-storage';
import { API_BASE } from '../lib/api';

interface SocketContextProps {
  socket: Socket | null;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextProps>({ socket: null, connect: () => {}, disconnect: () => {} });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  const connect = async () => {
    const token = await EncryptedStorage.getItem('signal_token');
    // Rely on environment variables instead of hardcoded localhost for production safety.
    const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || API_BASE;
    if (!socketUrl) {
      console.warn('EXPO_PUBLIC_SOCKET_URL is not defined.');
      return;
    }

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    setSocket(newSocket);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connect, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
};
