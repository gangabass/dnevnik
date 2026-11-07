import React from 'react';
import { X, Award, Calendar, BookOpen, User, Scale, MessageSquare } from 'lucide-react';
import { GradeItem } from '../types';

interface GradeDetailModalProps {
  grade: GradeItem | null;
  onClose: () => void;
}

export const GradeDetailModal: React.FC<GradeDetailModalProps> = ({ grade, onClose }) => {
  if (!grade) return null;

  const getGradeColor = (val: number) => {
    switch (val) {
      case 5:
        return 'from-emerald-500 to-green-600 text-white';
      case 4:
        return 'from-blue-500 to-blue-600 text-white';
      case 3:
        return 'from-amber-500 to-orange-500 text-white';
      case 2:
      default:
        return 'from-rose-500 to-red-600 text-white';
    }
  };

  const getWeightDescription = (w: number) => {
    if (w >= 2) return 'Контрольная / Итоговая (удвоенный вес x2.0)';
    if (w >= 1.5) return 'Самостоятельная / Лабораторная (вес x1.5)';
    return 'Текущий ответ / Домашка (стандартный вес x1.0)';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-slate-100 relative">
        {/* Header with grade badge */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGradeColor(
                grade.value
              )} flex items-center justify-center font-black text-3xl shadow-lg shadow-black/40`}
            >
              {grade.value}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{grade.subject}</h3>
              <p className="text-xs text-blue-400 font-medium">{grade.workType}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grade details */}
        <div className="p-5 space-y-3.5 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-800/50 border border-slate-800">
            <Scale className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Вес отметки в журнале
              </span>
              <span className="font-semibold text-slate-200">
                {getWeightDescription(grade.weight)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-800/50 border border-slate-800">
            <Calendar className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Дата выставления
              </span>
              <span className="font-semibold text-slate-200">
                {new Date(grade.date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })} (Четверть: {grade.period})
              </span>
            </div>
          </div>

          {grade.topic && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-800/50 border border-slate-800">
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Тема урока / работы
                </span>
                <span className="font-medium text-slate-200 leading-snug">
                  {grade.topic}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-800/50 border border-slate-800">
            <User className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Преподаватель
              </span>
              <span className="font-semibold text-slate-200">
                {grade.teacherName}
              </span>
            </div>
          </div>

          {grade.comment && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-950/40 border border-blue-900/50">
              <MessageSquare className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
              <div>
                <span className="text-blue-300 block text-[10px] uppercase font-semibold">
                  Комментарий учителя к отметке
                </span>
                <span className="text-blue-100 italic">
                  «{grade.comment}»
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-950/70 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition active:scale-95 shadow-md"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
