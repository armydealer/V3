import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-[#2B1E1A] text-[#FAF8F5] border border-[#544038] px-3.5 py-2 text-xs font-bold shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
      <span>حالت آفلاین فعال است — همه داده‌ها روی سیستم شما ذخیره می‌شود</span>
    </div>
  );
};
