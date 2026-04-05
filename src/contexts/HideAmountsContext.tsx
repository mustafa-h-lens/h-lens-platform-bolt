import { createContext, useContext, useState, ReactNode } from 'react';

interface HideAmountsContextValue {
  hidden: boolean;
  toggle: () => void;
  masked: (value: string) => string;
}

const HideAmountsContext = createContext<HideAmountsContextValue | undefined>(undefined);

export const HideAmountsProvider = ({ children }: { children: ReactNode }) => {
  const [hidden, setHidden] = useState(false);

  const toggle = () => setHidden(prev => !prev);

  const masked = (value: string): string => {
    if (!hidden) return value;
    return '••••••';
  };

  return (
    <HideAmountsContext.Provider value={{ hidden, toggle, masked }}>
      {children}
    </HideAmountsContext.Provider>
  );
};

export const useHideAmounts = (): HideAmountsContextValue => {
  const ctx = useContext(HideAmountsContext);
  if (!ctx) throw new Error('useHideAmounts must be used within HideAmountsProvider');
  return ctx;
};
