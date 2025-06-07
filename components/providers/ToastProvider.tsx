import React, { createContext, useCallback, useContext, useState, useEffect, useMemo } from 'react';

import { setGlobalToastHandler } from '../../utils/errorHandling';
import { Toast, type ToastType } from '../Toast';

interface ToastContextType {
  showToast: (message: string, duration?: number, type?: ToastType) => void;
  showImportantToast: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    duration: undefined as number | undefined,
    type: 'info' as ToastType,
  });

  const showToast = useCallback((message: string, duration?: number, type: ToastType = 'info') => {
    setToastState({
      visible: true,
      message,
      duration,
      type,
    });
  }, []);

  const showImportantToast = useCallback((message: string, duration: number = 4000) => {
    setToastState({
      visible: true,
      message,
      duration,
      type: 'important',
    });
  }, []);

  const handleClose = useCallback(() => {
    setToastState(prev => ({ ...prev, visible: false }));
  }, []);

  // Register the toast handler globally when the component mounts
  useEffect(() => {
    setGlobalToastHandler(showToast);

    return () => {
      // Use an empty function to clear the handler
      setGlobalToastHandler(() => {});
    };
  }, [showToast]);

  const contextValue = useMemo(
    () => ({ showToast, showImportantToast }),
    [showToast, showImportantToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toast
        duration={toastState.duration}
        message={toastState.message}
        type={toastState.type}
        visible={toastState.visible}
        onClose={handleClose}
      />
    </ToastContext.Provider>
  );
};
