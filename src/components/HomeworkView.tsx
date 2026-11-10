import React, { useState } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  FileText, 
  Paperclip, 
  AlertCircle, 
  BookOpen, 
  Filter,
  CheckCheck,
  Download
} from 'lucide-react';
import { HomeworkItem } from '../types';

interface HomeworkViewProps {
  homework: HomeworkItem[];
  onToggleHomework: (id: string) => void;
}

export const HomeworkView: React.FC<HomeworkViewProps> = ({
  homework,
  onToggleHomework,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const subjects = Array.from(new Set(homework.map((hw) => hw.subject)));

  const filteredList = homework.filter((hw) => {
    if (filter === 'pending' && hw.isCompleted) return false;
    if (filter === 'completed' && !hw.isCompleted) return false;
    if (selectedSubject !== 'all' && hw.subject !== selectedSubject) return false;
    return true;
  });

  const totalCount = homework.length;
  const completedCount = homework.filter((hw) => hw.isCompleted).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4 pb-20">
      {/* Top Progress Card */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              Домашние задания
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Выполнено {completedCount} из {totalCount} заданий ({progressPercent}%)
            </p>
          </div>
          <span className="text-sm font-black text-blue-400 px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-800/50">
            {progressPercent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-2">
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Все ({totalCount})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
              filter === 'pending'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Нужно сделать ({totalCount - completedCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
              filter === 'completed'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Сделано ({completedCount})
          </button>
        </div>

        {/* Subject quick filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedSubject('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${
              selectedSubject === 'all'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Все предметы
          </button>
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${
                selectedSubject === sub
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Homework cards */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-800 p-6">
            <CheckCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-slate-300">Нет заданий для отображения</h4>
            <p className="text-xs text-slate-500 mt-1">
              В выбранном периоде или фильтре нет заданий.
            </p>
          </div>
        ) : (
          filteredList.map((hw) => {
            const isUrgent = hw.priority === 'high' && !hw.isCompleted;

            return (
              <div
                key={hw.id}
                onClick={() => onToggleHomework(hw.id)}
                className={`p-4 rounded-3xl border transition shadow-sm cursor-pointer select-none ${
                  hw.isCompleted
                    ? 'bg-slate-900/50 border-slate-800 opacity-70'
                    : isUrgent
                    ? 'bg-slate-900 border-amber-500/40 shadow-amber-950/20'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Custom Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleHomework(hw.id);
                    }}
                    className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-400 transition"
                  >
                    {hw.isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400 fill-emerald-500/20" />
                    ) : (
                      <Circle className="w-6 h-6 hover:text-blue-400" />
                    )}
                  </button>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`font-bold text-sm leading-snug truncate ${
                          hw.isCompleted ? 'line-through text-slate-400' : 'text-white'
                        }`}
                      >
                        {hw.subject}
                      </h4>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUrgent && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Срочно
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Сдать: {new Date(hw.dateDue).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Учитель: {hw.teacherName}
                    </div>

                    <p
                      className={`text-xs mt-2 leading-relaxed ${
                        hw.isCompleted ? 'text-slate-500' : 'text-slate-300'
                      }`}
                    >
                      {hw.text}
                    </p>

                    {/* Attached files */}
                    {hw.files && hw.files.length > 0 && (
                      <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-800">
                        {hw.files.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 hover:bg-slate-800/80 transition"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                              <span className="truncate text-[11px] font-medium">{file.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                              {file.size}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
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
