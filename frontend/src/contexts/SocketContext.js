import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user) {
      const newSocket = io(process.env.REACT_APP_API_URL || '', {
        auth: {
          token: localStorage.getItem('token'),
        },
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        newSocket.emit('join-room', user.id);
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      // Listen for real-time notifications
      newSocket.on('task-reviewed', (data) => {
        toast.success(`Task "${data.taskTitle}" has been ${data.status.toLowerCase()}`);
      });

      newSocket.on('new-submission', (data) => {
        if (user.role === 'ADMIN') {
          toast.info(`New submission from ${data.studentName}`);
        }
      });

      newSocket.on('payment-success', (data) => {
        toast.success('Payment completed successfully!');
      });

      newSocket.on('certificate-ready', (data) => {
        toast.success('Your certificate is ready for download!');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [isAuthenticated, user]);

  const value = {
    socket,
    isConnected,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
