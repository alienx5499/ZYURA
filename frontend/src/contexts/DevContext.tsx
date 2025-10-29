"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type DevContextType = {
  disableCursor: boolean;
  setDisableCursor: (v: boolean) => void;
};

const DevContext = createContext<DevContextType | undefined>(undefined);

export const DevProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [disableCursor, setDisableCursorState] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dev:disableCursor');
      if (stored != null) setDisableCursorState(stored === 'true');
    } catch {}
  }, []);

  const setDisableCursor = (v: boolean) => {
    setDisableCursorState(v);
    try { localStorage.setItem('dev:disableCursor', String(v)); } catch {}
  };

  const value = useMemo(() => ({ disableCursor, setDisableCursor }), [disableCursor]);

  return <DevContext.Provider value={value}>{children}</DevContext.Provider>;
};

export const useDev = () => {
  const ctx = useContext(DevContext);
  if (!ctx) throw new Error('useDev must be used within DevProvider');
  return ctx;
};


