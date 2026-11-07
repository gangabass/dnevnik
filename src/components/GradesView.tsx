import React, { useState, useMemo } from 'react';
import { 
  Award, 
  TrendingUp, 
  Calculator, 
  ChevronRight, 
  Sparkles, 
  Info,
  Calendar,
  Check
} from 'lucide-react';
import { GradeItem, SubjectSummary } from '../types';

interface GradesViewProps {
  grades: GradeItem[];
  onOpenGradeDetail: (grade: GradeItem) => void;
  onSimulateNewGrade: () => void;
  currentQuarter: number;
}

export const GradesView: React.FC<GradesViewProps> = ({
  grades,
  onOpenGradeDetail,
  onSimulateNewGrade,
  currentQuarter,
}) => {
  const [selectedQuarter, setSelectedQuarter] = useState<number>(currentQuarter);
  const [targetGpa, setTargetGpa] = useState<number>(4.60);

  // Group grades by subject for selected quarter
  const subjectSummaries = useMemo(() => {
    const map = new Map<string, { grades: GradeItem[]; teacher: string }>();

    grades.forEach((g) => {
      if (g.period === selectedQuarter) {
        if (!map.has(g.subject)) {
          map.set(g.subject, { grades: [], teacher: g.teacherName });
        }
        map.get(g.subject)!.grades.push(g);
      }
    });

    const result: SubjectSummary[] = [];

    map.forEach((value, subject) => {
      const subjectGrades = value.grades;
      const totalWeight = subjectGrades.reduce((sum, g) => sum + g.weight, 0);
      const weightedSum = subjectGrades.reduce((sum, g) => sum + g.value * g.weight, 0);
      const avg = totalWeight > 0 ? parseFloat((weightedSum / totalWeight).toFixed(2)) : 0;

      // Calculate how many 5s needed to reach target GPA (e.g., 4.60)
      let fivesNeeded = 0;
      if (avg < targetGpa) {
        let curSum = weightedSum;
        let curWeight = totalWeight;
        while (curWeight > 0 && curSum / curWeight < targetGpa && fivesNeeded < 25) {
          fivesNeeded++;
          curSum += 5 * 1.0;
          curWeight += 1.0;
        }
      }

      result.push({
        subject,
        teacherName: value.teacher,
        grades: subjectGrades,
        average: avg,
        targetCountForFive: fivesNeeded,
        period: selectedQuarter,
      });
    });

    // Sort by average descending
    return result.sort((a, b) => b.average - a.average);
  }, [grades, selectedQuarter, targetGpa]);

  // Overall statistics
  const overallStats = useMemo(() => {
    const qGrades = grades.filter((g) => g.period === selectedQuarter);
    const totalWeight = qGrades.reduce((sum, g) => sum + g.weight, 0);
    const weightedSum = qGrades.reduce((sum, g) => sum + g.value * g.weight, 0);
    const overallAvg = totalWeight > 0 ? (weightedSum / totalWeight).toFixed(2) : '0.00';

    const count5 = qGrades.filter((g) => g.value === 5).length;
    const count4 = qGrades.filter((g) => g.value === 4).length;
    const count3 = qGrades.filter((g) => g.value === 3).length;
    const count2 = qGrades.filter((g) => g.value === 2).length;

    return {
      overallAvg,
      count5,
      count4,
      count3,
      count2,
      totalCount: qGrades.length,
    };
  }, [grades, selectedQuarter]);

  const getAvgColor = (avg: number) => {
    if (avg >= 4.5) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (avg >= 3.6) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (avg >= 2.6) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const getGradeBadgeClass = (val: number) => {
    switch (val) {
      case 5:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30';
      case 4:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30';
      case 3:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30';
      case 2:
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30';
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Quarter Switcher */}
      <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
        {[1, 2, 3, 4].map((q) => (
          <button
            key={q}
            onClick={() => setSelectedQuarter(q)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              selectedQuarter === q
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {q} четверть
          </button>
        ))}
      </div>

      {/* GPA & Statistics Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">
              Средний балл за {selectedQuarter}-ю четверть
            </div>
            <div className="text-3xl font-black text-white mt-1 flex items-baseline gap-2">
              <span>{overallStats.overallAvg}</span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> Отличная динамика
              </span>
            </div>
          </div>

          <button
            onClick={onSimulateNewGrade}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white shadow-md transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Добавить оценку</span>
          </button>
        </div>

        {/* Grade Breakdown Bars */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800 text-center">
          <div className="p-2 rounded-2xl bg-emerald-950/30 border border-emerald-800/40">
            <span className="text-[10px] text-emerald-400 font-bold block uppercase">Пятёрки</span>
            <span className="text-base font-black text-emerald-300">{overallStats.count5}</span>
          </div>
          <div className="p-2 rounded-2xl bg-blue-950/30 border border-blue-800/40">
            <span className="text-[10px] text-blue-400 font-bold block uppercase">Четвёрки</span>
            <span className="text-base font-black text-blue-300">{overallStats.count4}</span>
          </div>
          <div className="p-2 rounded-2xl bg-amber-950/30 border border-amber-800/40">
            <span className="text-[10px] text-amber-400 font-bold block uppercase">Тройки</span>
            <span className="text-base font-black text-amber-300">{overallStats.count3}</span>
          </div>
          <div className="p-2 rounded-2xl bg-rose-950/30 border border-rose-800/40">
            <span className="text-[10px] text-rose-400 font-bold block uppercase">Двойки</span>
            <span className="text-base font-black text-rose-300">{overallStats.count2}</span>
          </div>
        </div>
      </div>

      {/* Target GPA Helper widget */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-slate-300">
            Калькулятор пятерок до цели:{' '}
            <span className="font-bold text-white">{targetGpa.toFixed(2)}</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          {[4.50, 4.60, 4.75].map((val) => (
            <button
              key={val}
              onClick={() => setTargetGpa(val)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                targetGpa === val
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Subject list */}
      <div className="space-y-3">
        {subjectSummaries.map((sub) => {
          return (
            <div
              key={sub.subject}
              className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white truncate">
                    {sub.subject}
                  </h4>
                  <div className="text-[11px] text-slate-400 truncate">
                    {sub.teacherName}
                  </div>
                </div>

                <div
                  className={`px-2.5 py-1 rounded-xl text-xs font-black border ${getAvgColor(
                    sub.average
                  )}`}
                >
                  {sub.average.toFixed(2)}
                </div>
              </div>

              {/* Grades row */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {sub.grades.map((grade) => {
                  return (
                    <button
                      key={grade.id}
                      onClick={() => onOpenGradeDetail(grade)}
                      className={`relative w-8 h-8 rounded-xl border font-bold text-sm flex items-center justify-center transition active:scale-90 ${getGradeBadgeClass(
                        grade.value
                      )}`}
                      title={`${grade.workType} (вес: ${grade.weight}) • ${grade.date}`}
                    >
                      <span>{grade.value}</span>
                      {grade.weight > 1 && (
                        <span className="absolute -top-1.5 -right-1 text-[9px] font-extrabold text-amber-400">
                          {grade.weight === 2 ? '²' : '¹·⁵'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Target calculation hint */}
              {sub.targetCountForFive !== undefined && sub.targetCountForFive > 0 && sub.average < 4.60 && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    До балла {targetGpa.toFixed(2)}:
                  </span>
                  <span className="text-emerald-400 font-bold">
                    еще {sub.targetCountForFive} {sub.targetCountForFive === 1 ? 'пятёрка' : sub.targetCountForFive < 5 ? 'пятёрки' : 'пятёрок'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
