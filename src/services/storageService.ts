import { StudentProfile, GradeItem, HomeworkItem, FeedItem, PushNotificationConfig } from '../types';
import { INITIAL_STUDENT, INITIAL_GRADES, INITIAL_HOMEWORK, INITIAL_FEED, DEFAULT_PUSH_CONFIG } from '../data/mockData';

const KEYS = {
  STUDENT: 'dnevnik_student_profile',
  GRADES: 'dnevnik_grades_list',
  HOMEWORK: 'dnevnik_homework_list',
  FEED: 'dnevnik_feed_list',
  PUSH_CONFIG: 'dnevnik_push_config',
  LOGS: 'dnevnik_push_logs',
};

export interface PushLogItem {
  id: string;
  timestamp: string;
  title: string;
  body: string;
  gradeValue?: number;
  subject?: string;
}

export const storageService = {
  getStudent(): StudentProfile {
    try {
      const data = localStorage.getItem(KEYS.STUDENT);
      return data ? JSON.parse(data) : INITIAL_STUDENT;
    } catch {
      return INITIAL_STUDENT;
    }
  },

  saveStudent(student: StudentProfile): void {
    try {
      localStorage.setItem(KEYS.STUDENT, JSON.stringify(student));
    } catch (e) {
      console.error(e);
    }
  },

  getGrades(): GradeItem[] {
    try {
      const data = localStorage.getItem(KEYS.GRADES);
      return data ? JSON.parse(data) : INITIAL_GRADES;
    } catch {
      return INITIAL_GRADES;
    }
  },

  saveGrades(grades: GradeItem[]): void {
    try {
      localStorage.setItem(KEYS.GRADES, JSON.stringify(grades));
    } catch (e) {
      console.error(e);
    }
  },

  addGrade(grade: GradeItem): GradeItem[] {
    const list = this.getGrades();
    const updated = [grade, ...list];
    this.saveGrades(updated);

    // Update student GPA
    const student = this.getStudent();
    const totalWeight = updated.reduce((sum, g) => sum + g.weight, 0);
    const weightedSum = updated.reduce((sum, g) => sum + g.value * g.weight, 0);
    student.gpa = parseFloat((weightedSum / (totalWeight || 1)).toFixed(2));
    this.saveStudent(student);

    return updated;
  },

  getHomework(): HomeworkItem[] {
    try {
      const data = localStorage.getItem(KEYS.HOMEWORK);
      return data ? JSON.parse(data) : INITIAL_HOMEWORK;
    } catch {
      return INITIAL_HOMEWORK;
    }
  },

  saveHomework(homework: HomeworkItem[]): void {
    try {
      localStorage.setItem(KEYS.HOMEWORK, JSON.stringify(homework));
    } catch (e) {
      console.error(e);
    }
  },

  toggleHomework(id: string): HomeworkItem[] {
    const list = this.getHomework().map(hw =>
      hw.id === id ? { ...hw, isCompleted: !hw.isCompleted } : hw
    );
    this.saveHomework(list);
    return list;
  },

  getFeed(): FeedItem[] {
    try {
      const data = localStorage.getItem(KEYS.FEED);
      return data ? JSON.parse(data) : INITIAL_FEED;
    } catch {
      return INITIAL_FEED;
    }
  },

  saveFeed(feed: FeedItem[]): void {
    try {
      localStorage.setItem(KEYS.FEED, JSON.stringify(feed));
    } catch (e) {
      console.error(e);
    }
  },

  addFeedItem(item: FeedItem): FeedItem[] {
    const list = [item, ...this.getFeed()];
    this.saveFeed(list);
    return list;
  },

  markFeedRead(id: string): FeedItem[] {
    const list = this.getFeed().map(f => (f.id === id ? { ...f, isRead: true } : f));
    this.saveFeed(list);
    return list;
  },

  markAllFeedRead(): FeedItem[] {
    const list = this.getFeed().map(f => ({ ...f, isRead: true }));
    this.saveFeed(list);
    return list;
  },

  getPushConfig(): PushNotificationConfig {
    try {
      const data = localStorage.getItem(KEYS.PUSH_CONFIG);
      return data ? JSON.parse(data) : DEFAULT_PUSH_CONFIG;
    } catch {
      return DEFAULT_PUSH_CONFIG;
    }
  },

  savePushConfig(config: PushNotificationConfig): void {
    try {
      localStorage.setItem(KEYS.PUSH_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error(e);
    }
  },

  getPushLogs(): PushLogItem[] {
    try {
      const data = localStorage.getItem(KEYS.LOGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addPushLog(log: PushLogItem): PushLogItem[] {
    const list = [log, ...this.getPushLogs()].slice(0, 50);
    try {
      localStorage.setItem(KEYS.LOGS, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
    return list;
  },

  clearPushLogs(): void {
    localStorage.removeItem(KEYS.LOGS);
  },

  resetAllData(): void {
    localStorage.clear();
  },
};
