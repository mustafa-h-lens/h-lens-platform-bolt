import { createContext, useContext, useState } from 'react';

interface HideAmountsContextType {
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
  masked: (value: string) => string;
}

const HideAmountsContext = createContext<HideAmountsContextType | undefined>(undefined);

export const HideAmountsProvider = ({ children }: { children: React.ReactNode }) => {
  const [hideAmounts, setHideAmounts] = useState(() => {
    try { return localStorage.getItem('hideAmounts') === 'true'; } catch { return false; }
  });

  const toggleHideAmounts = () => {
    setHideAmounts(prev => {
      const next = !prev;
      try { localStorage.setItem('hideAmounts', String(next)); } catch {}
      return next;
    });
  };

  const masked = (value: string) => hideAmounts ? '••••••' : value;

  return (
    <HideAmountsContext.Provider value={{ hideAmounts, toggleHideAmounts, masked }}>
      {children}
    </HideAmountsContext.Provider>
  );
};

export const useHideAmounts = () => {
  const context = useContext(HideAmountsContext);
  if (!context) {
    // Fallback for components outside provider — no masking
    return { hideAmounts: false, toggleHideAmounts: () => {}, masked: (v: string) => v };
  }
  return context;
};
