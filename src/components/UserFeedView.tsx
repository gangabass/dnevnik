import React, { useState } from 'react';
import { 
  Bell, 
  Sparkles, 
  BookOpen, 
  CheckCheck, 
  Calendar, 
  Megaphone, 
  Filter, 
  RotateCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { FeedItem, GradeItem } from '../types';

interface UserFeedViewProps {
  feed: FeedItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSimulateNewGrade: () => void;
  onOpenGradeDetail: (grade: GradeItem) => void;
  onNavigateToTab: (tab: 'feed' | 'grades' | 'homework' | 'schedule' | 'push') => void;
  studentName: string;
}

export const UserFeedView: React.FC<UserFeedViewProps> = ({
  feed,
  onMarkRead,
  onMarkAllRead,
  onSimulateNewGrade,
  onOpenGradeDetail,
  onNavigateToTab,
  studentName,
}) => {
  const [filter, setFilter] = useState<'all' | 'grade' | 'homework' | 'announcement'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 700);
  };

  const filteredFeed = feed.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const unreadCount = feed.filter((f) => !f.isRead).length;

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner with Irkutsk Dnevnik status */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 border border-blue-900/50 p-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Онлайн поток Иркутск
              </span>
            </div>
            <h2 className="text-lg font-black text-white tracking-tight">
              Лента событий (Userfeed)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Мониторинг оценок и школьных новостей для: <span className="text-blue-300 font-semibold">{studentName}</span>
            </p>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 shadow-sm transition active:rotate-180"
            title="Обновить ленту дневника"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>

        {/* Action simulator button */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>Источник:</span>
            <code className="text-blue-300 font-mono text-[10px] bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
              dnevnik.ru/r/irkutsk/userfeed
            </code>
          </div>

          <button
            onClick={onSimulateNewGrade}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs shadow-md transition active:scale-95"
            title="Сгенерировать выставление оценки учителем и проверить пуш"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Смоделировать новую оценку</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Все ({feed.length})
          </button>
          <button
            onClick={() => setFilter('grade')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
              filter === 'grade'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Award className="w-3 h-3 text-emerald-400" />
            Оценки
          </button>
          <button
            onClick={() => setFilter('homework')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
              filter === 'homework'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <BookOpen className="w-3 h-3 text-blue-400" />
            Домашка
          </button>
          <button
            onClick={() => setFilter('announcement')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
              filter === 'announcement'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Megaphone className="w-3 h-3 text-amber-400" />
            Объявления
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold whitespace-nowrap flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-900"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Прочитать все
          </button>
        )}
      </div>

      {/* Feed Cards List */}
      <div className="space-y-3">
        {filteredFeed.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-800 p-6">
            <Bell className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-slate-300">В этой категории пока нет событий</h4>
            <p className="text-xs text-slate-500 mt-1">
              Нажмите «Смоделировать новую оценку», чтобы получить свежую отметку и проверить пуш!
            </p>
          </div>
        ) : (
          filteredFeed.map((item) => {
            const isGrade = item.type === 'grade';
            const isHw = item.type === 'homework';
            const isEvent = item.type === 'event' || item.type === 'announcement';

            return (
              <div
                key={item.id}
                onClick={() => onMarkRead(item.id)}
                className={`relative rounded-3xl p-4 transition border shadow-sm ${
                  item.isRead
                    ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    : 'bg-slate-900 border-blue-600/40 shadow-blue-950/20 ring-1 ring-blue-500/30'
                }`}
              >
                {!item.isRead && (
                  <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                )}

                <div className="flex items-start gap-3.5">
                  {/* Left Icon or Grade Badge */}
                  {isGrade && item.grade ? (
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl shadow-md shrink-0 ${
                        item.grade === 5
                          ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                          : item.grade === 4
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                          : item.grade === 3
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                          : 'bg-gradient-to-br from-rose-500 to-red-600 text-white'
                      }`}
                    >
                      {item.grade}
                    </div>
                  ) : isHw ? (
                    <div className="w-12 h-12 rounded-2xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-800/50 flex items-center justify-center text-amber-400 shrink-0">
                      <Megaphone className="w-6 h-6" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {item.timestamp}
                      </span>
                      {item.weight && item.weight > 1 && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.2 rounded-full">
                          Вес: x{item.weight}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-white mt-0.5 leading-snug">
                      {item.title}
                    </h4>

                    <div className="text-[11px] text-blue-300 font-medium mt-0.5">
                      {item.subtitle}
                    </div>

                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {item.text}
                    </p>

                    {/* Footer bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate">
                        {item.author} ({item.authorRole})
                      </span>

                      {isHw && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToTab('homework');
                          }}
                          className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5 ml-2 shrink-0"
                        >
                          Открыть ДЗ <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isGrade && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToTab('grades');
                          }}
                          className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5 ml-2 shrink-0"
                        >
                          К оценкам <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
