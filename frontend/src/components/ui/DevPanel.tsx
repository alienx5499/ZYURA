import React from 'react';
import { useDev } from '@/contexts/DevContext';

export const DevPanel: React.FC = () => {
  const { disableCursor, setDisableCursor } = useDev();

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] select-none">
      <div className="rounded-lg border border-white/10 bg-black/60 backdrop-blur-md px-3 py-2 text-xs text-white shadow-lg">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={disableCursor}
            onChange={(e) => setDisableCursor(e.target.checked)}
          />
          <span>Disable Cursor</span>
        </label>
      </div>
    </div>
  );
};


