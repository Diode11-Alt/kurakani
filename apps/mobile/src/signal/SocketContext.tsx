import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const token = await AsyncStorage.getItem('signal_token');
    if (!token) return;

    // Use localhost or your machine IP. 
    // In React Native iOS simulator, localhost works. For Android, 10.0.2.2 is needed.
    // For real devices, use the local network IP (e.g., 192.168.0.x).
    const API_URL = 'http://localhost:4000'; // Defaulting to localhost for simplicity

    const newSocket = io(API_URL, {
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
