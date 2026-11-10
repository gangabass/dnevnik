import type { DiaryGrade, HomeworkCache, DiaryResponse } from '../../shared/diary';
export const markSignature = (grade: DiaryGrade) => `${grade.id}:${grade.value}`;
export function mergeDiary(result: DiaryResponse, previous: HomeworkCache | null, start: string, end: string): HomeworkCache {
  const updatedAt = new Date().toISOString();
  const completedIds = new Set([...(previous?.completedIds || []), ...(previous?.homework || []).filter(item => item.isCompleted).map(item => item.id)]);
  const sectionDates = { ...previous?.sectionDates };
  for (const section of ['homework', 'grades', 'schedule'] as const) {
    if (result[section] !== null) sectionDates[section] = { start, end, updatedAt };
  }
  return {
    homework: result.homework === null ? previous?.homework || [] : result.homework.map(item => ({ ...item, isCompleted: completedIds.has(item.id) })),
    grades: result.grades ?? previous?.grades, schedule: result.schedule ?? previous?.schedule,
    student: { ...previous?.student, ...result.student,
      schoolName: result.student.schoolName || previous?.student?.schoolName || '',
      className: result.student.className || previous?.student?.className || '',
    },
    updatedAt, startDate: start, endDate: end, sectionDates, completedIds: [...completedIds],
    seenMarks: [...new Set([...(previous?.seenMarks || previous?.grades?.map(markSignature) || []), ...(result.grades || []).map(markSignature)])].slice(-2000),
    readFeedIds: previous?.readFeedIds || [],
  };
}
export function newMarks(result: DiaryResponse, previous: HomeworkCache | null): DiaryGrade[] {
  // First load establishes the baseline; historical marks must not trigger alerts.
  if (!previous?.seenMarks && !previous?.grades) return [];
  const seen = new Set(previous.seenMarks || previous.grades?.map(markSignature));
  return (result.grades || []).filter(grade => !seen.has(markSignature(grade)) && (
    previous.grades?.some(old => old.id === grade.id) || Date.parse(grade.date) > Date.parse(previous.updatedAt)
  ));
}
export function average(grades: DiaryGrade[]): number | null {
  const included = grades.filter(grade => grade.includeInAverage && grade.numericValue !== null);
  if (!included.length || included.some(grade => grade.weight === null)) return null;
  const total = included.reduce((sum, grade) => sum + (grade.weight || 0), 0);
  return total ? included.reduce((sum, grade) => sum + grade.numericValue! * grade.weight!, 0) / total : null;
}
