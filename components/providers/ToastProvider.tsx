import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from 'react';

import { Toast } from '@/components/Toast';
import { DEFAULT_TOAST_DURATION } from '@/constants/animation';
import { ToastType } from '@/types/enums';
import { setGlobalToastHandler } from '@/utils/errorHandling';

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

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    duration: undefined as number | undefined,
    type: ToastType.INFO,
  });

  const showToast = useCallback(
    (message: string, duration?: number, type: ToastType = ToastType.INFO) => {
      setToastState({
        visible: true,
        message,
        duration,
        type,
      });
    },
    []
  );

  const showImportantToast = useCallback(
    (message: string, duration: number = DEFAULT_TOAST_DURATION) => {
      setToastState({
        visible: true,
        message,
        duration,
        type: ToastType.IMPORTANT,
      });
    },
    []
  );

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
