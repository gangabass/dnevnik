import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-center gap-2 rounded-2xl bg-amber-600/95 text-white px-4 py-2.5 text-xs font-semibold shadow-2xl backdrop-blur-md border border-amber-400/40 animate-bounce">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Оффлайн режим — отображаются сохраненные оценки и расписание Дневник.ру</span>
    </div>
  );
};
