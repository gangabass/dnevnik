import type { HomeworkItem } from '../src/types';
export interface ReportingPeriod { id: string; name: string; type: string; start: string; end: string }
export interface DiaryGrade {
  id: string; subject: string; subjectId: string; value: string; numericValue: number | null;
  workType: string; date: string; lessonDate: string; teacherName: string; topic: string;
  period: number | null; weight: number | null; includeInAverage: boolean;
}
export interface DiaryLesson {
  id: string; number: number; subject: string; topic: string; hours: string;
  room: string; teacherName: string; homework: string;
}
export interface DiaryDay { date: string; lessons: DiaryLesson[] }
export interface StudentChoice {
  personId: string; schoolId: string; studentName: string; schoolName: string; className: string;
}
export interface DiaryStudent { name: string; schoolName: string; className: string; usesWeightedAverage: boolean }
export interface DiaryWarning { section: 'homework' | 'grades' | 'schedule' | 'profile'; message: string }

export interface Connection {
  personId: string; schoolId: string; studentName: string; schoolName?: string; className?: string;
}
export interface HomeworkCache {
  homework: HomeworkItem[]; updatedAt: string; startDate: string; endDate: string;
  grades?: DiaryGrade[]; schedule?: DiaryDay[]; student?: Omit<DiaryStudent, 'name'>;
  sectionDates?: Partial<Record<'homework' | 'grades' | 'schedule', { start: string; end: string; updatedAt: string }>>;
  completedIds?: string[]; seenMarks?: string[]; readFeedIds?: string[];
}
export interface DiaryResponse {
  ok: true; student: Omit<DiaryStudent, 'name'>; homework: HomeworkItem[] | null;
  grades: DiaryGrade[] | null; schedule: DiaryDay[] | null; warnings: DiaryWarning[];
}
