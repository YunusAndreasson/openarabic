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

import { Toast } from '@/components/ui/Toast';
import { DEFAULT_TOAST_DURATION } from '@/constants/animation';
import { ToastType } from '@/types/enums';
import { setGlobalToastHandler } from '@/utils/errorHandling';

interface ToastContextType {
  showToast: (
    message: string,
    duration?: number,
    type?: ToastType,
    position?: 'top' | 'bottom',
  ) => void;
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
  const [toastState, setToastState] = useState<{
    visible: boolean;
    message: string;
    duration: number | undefined;
    type: ToastType;
    position: 'top' | 'bottom';
    key: number;
  }>({
    visible: false,
    message: '',
    duration: undefined,
    type: ToastType.INFO,
    position: 'top',
    key: 0,
  });

  const showToast = useCallback(
    (
      message: string,
      duration?: number,
      type: ToastType = ToastType.INFO,
      position: 'top' | 'bottom' = 'top',
    ) => {
      setToastState(prev => ({
        visible: true,
        message,
        duration,
        type,
        position,
        key: prev.key + 1,
      }));
    },
    [],
  );

  const showImportantToast = useCallback(
    (message: string, duration: number = DEFAULT_TOAST_DURATION) => {
      setToastState(prev => ({
        visible: true,
        message,
        duration,
        type: ToastType.IMPORTANT,
        position: 'top',
        key: prev.key + 1,
      }));
    },
    [],
  );

  const handleClose = useCallback(() => {
    setToastState(prev => ({ ...prev, visible: false }));
  }, []);

  // Register the toast handler globally when the component mounts
  useEffect(() => {
    setGlobalToastHandler(showToast);

    return () => {
      // Use an empty function to clear the handler
      setGlobalToastHandler(() => () => undefined);
    };
  }, [showToast]);

  const contextValue = useMemo(
    () => ({ showToast, showImportantToast }),
    [showToast, showImportantToast],
  );

  return (
    <ToastContext value={contextValue}>
      {children}
      <Toast
        key={toastState.key}
        duration={toastState.duration}
        message={toastState.message}
        type={toastState.type}
        position={toastState.position}
        visible={toastState.visible}
        onClose={handleClose}
      />
    </ToastContext>
  );
};
