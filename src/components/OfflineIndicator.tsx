import React from 'react';
import {WifiOff} from 'lucide-react';
import {useOnlineStatus} from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 shadow-sm dark:border-amber-400/30 dark:bg-amber-950/90 dark:text-amber-200"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>Offline Mode — Local IndexedDB cache active</span>
    </div>
  );
};
