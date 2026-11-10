import React from 'react';
import { Newspaper, Award, BookOpen, Calendar, Bell } from 'lucide-react';

export type TabType = 'feed' | 'grades' | 'homework' | 'schedule' | 'push';

interface AndroidBottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  unreadFeedCount: number;
  pendingHwCount: number;
  gpa: number;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  currentTab,
  onChangeTab,
  unreadFeedCount,
  pendingHwCount,
  gpa,
}) => {
  const tabs = [
    {
      id: 'feed' as TabType,
      label: 'Лента',
      icon: Newspaper,
      badge: unreadFeedCount > 0 ? (unreadFeedCount > 9 ? '9+' : unreadFeedCount) : null,
      badgeColor: 'bg-red-500',
    },
    {
      id: 'grades' as TabType,
      label: 'Оценки',
      icon: Award,
      badge: gpa > 0 ? gpa.toFixed(1) : null,
      badgeColor: 'bg-emerald-600',
    },
    {
      id: 'homework' as TabType,
      label: 'ДЗ',
      icon: BookOpen,
      badge: pendingHwCount > 0 ? pendingHwCount : null,
      badgeColor: 'bg-blue-600',
    },
    {
      id: 'schedule' as TabType,
      label: 'Расписание',
      icon: Calendar,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'push' as TabType,
      label: 'Настройки',
      icon: Bell,
      badge: null,
      badgeColor: '',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 max-w-lg mx-auto pb-safe">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition active:scale-95 ${
                isActive
                  ? 'text-blue-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1 rounded-xl transition ${
                    isActive ? 'bg-blue-600/20 text-blue-400 scale-110' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-2 text-[10px] font-extrabold text-white px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
