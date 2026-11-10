export type GradeValue = 2 | 3 | 4 | 5;

export interface GradeItem {
  id: string;
  subject: string;
  value: GradeValue;
  weight: number; // 1 = regular, 1.5 = test, 2 = control work
  workType: 'Ответ на уроке' | 'Самостоятельная работа' | 'Контрольная работа' | 'Тестирование' | 'Лабораторная работа' | 'Домашняя работа' | 'Проверочная работа';
  date: string; // ISO or YYYY-MM-DD
  topic?: string;
  teacherName: string;
  comment?: string;
  period: 1 | 2 | 3 | 4;
  isNew?: boolean;
}

export interface SubjectSummary {
  subject: string;
  teacherName: string;
  grades: GradeItem[];
  average: number;
  targetCountForFive?: number;
  targetCountForFour?: number;
  period: number;
}

export interface HomeworkItem {
  id: string;
  subject: string;
  teacherName: string;
  dateGiven: string;
  dateDue: string;
  text: string;
  files?: { name: string; size: string; type: string; url?: string }[];
  isCompleted: boolean;
  priority: 'high' | 'normal' | 'low';
}

export interface FeedItem {
  id: string;
  type: 'grade' | 'announcement' | 'homework' | 'event';
  title: string;
  subtitle: string;
  text: string;
  timestamp: string; // e.g. "10 минут назад", "Вчера в 16:30"
  subject?: string;
  grade?: GradeValue;
  weight?: number;
  author: string;
  authorRole: string;
  isRead: boolean;
}

export interface LessonItem {
  number: number;
  subject: string;
  timeStart: string;
  timeEnd: string;
  room: string;
  teacherName: string;
  homeworkPreview?: string;
}

export interface DaySchedule {
  dayOfWeek: string;
  dateString: string;
  lessons: LessonItem[];
}

export interface StudentProfile {
  id: string;
  fullName: string;
  shortName: string;
  schoolName: string;
  schoolRegion: string;
  className: string;
  avatarUrl?: string;
  tokenConnected: boolean;
  currentQuarter: number;
  gpa: number;
}

export interface PushNotificationConfig {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  minGradeAlert: number; // 2 means all grades, 4 means only good, 2 means also notify on 2 and 3
  checkIntervalMinutes: number; // e.g. 1, 5, 15, 30
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
}
