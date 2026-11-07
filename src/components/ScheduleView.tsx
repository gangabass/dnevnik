import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, BookOpen } from 'lucide-react';
import { WEEKLY_SCHEDULE } from '../data/mockData';

export const ScheduleView: React.FC = () => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const currentSchedule = WEEKLY_SCHEDULE[selectedDayIndex] || WEEKLY_SCHEDULE[0];

  return (
    <div className="space-y-4 pb-20">
      {/* Day of Week Selector */}
      <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 gap-1 overflow-x-auto no-scrollbar">
        {WEEKLY_SCHEDULE.map((day, idx) => (
          <button
            key={day.dayOfWeek}
            onClick={() => setSelectedDayIndex(idx)}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition whitespace-nowrap text-center ${
              selectedDayIndex === idx
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div>{day.dayOfWeek}</div>
            <div className="text-[10px] font-normal opacity-80">{day.dateString}</div>
          </button>
        ))}
      </div>

      {/* Schedule Header */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-white">
            Расписание: {currentSchedule.dayOfWeek}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Звонки по расписанию МБОУ СОШ №14 г. Иркутска (UTC+8)
          </p>
        </div>
        <div className="text-xs font-semibold text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded-xl border border-blue-800/40">
          {currentSchedule.lessons.length} уроков
        </div>
      </div>

      {/* Lessons List */}
      <div className="space-y-2.5">
        {currentSchedule.lessons.map((lesson) => (
          <div
            key={lesson.number}
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-sm flex items-start gap-3"
          >
            {/* Lesson Number badge */}
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-black text-sm text-blue-400 shrink-0">
              {lesson.number}
            </div>

            {/* Lesson details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-sm text-white truncate">
                  {lesson.subject}
                </h4>

                <span className="text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3 text-blue-400" />
                  {lesson.timeStart} – {lesson.timeEnd}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <MapPin className="w-3 h-3" />
                  {lesson.room}
                </span>

                <span className="flex items-center gap-1 text-slate-300">
                  <User className="w-3 h-3 text-slate-500" />
                  {lesson.teacherName}
                </span>
              </div>

              {lesson.homeworkPreview && (
                <div className="mt-2 text-[11px] bg-slate-950/60 p-2 rounded-xl border border-slate-800/70 text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-slate-400">ДЗ:</span>
                  <span className="truncate">{lesson.homeworkPreview}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
