import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface StreaksContextType {
  isStreaksVisible: boolean;
  openStreaks: () => void;
  closeStreaks: () => void;
}

const StreaksContext = createContext<StreaksContextType | undefined>(undefined);

export const useStreaks = (): StreaksContextType => {
  const context = useContext(StreaksContext);
  if (!context) {
    throw new Error('useStreaks must be used within a StreaksProvider');
  }
  return context;
};

interface StreaksProviderProps {
  children: ReactNode;
}

export const StreaksProvider = ({ children }: StreaksProviderProps): React.ReactElement => {
  const [isStreaksVisible, setIsStreaksVisible] = useState(false);

  const openStreaks = useCallback(() => {
    setIsStreaksVisible(true);
  }, []);

  const closeStreaks = useCallback(() => {
    setIsStreaksVisible(false);
  }, []);

  const contextValue = useMemo(
    () => ({ isStreaksVisible, openStreaks, closeStreaks }),
    [isStreaksVisible, openStreaks, closeStreaks],
  );

  return <StreaksContext value={contextValue}>{children}</StreaksContext>;
};
