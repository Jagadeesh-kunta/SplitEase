import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const socketRef = useRef(null);

  useEffect(() => {
    // Create one socket connection for the lifetime of the app
    socketRef.current = io(SOCKET_URL);

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
