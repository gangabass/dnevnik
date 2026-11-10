import type { DiaryGrade } from '../../shared/diary';
export interface LiveOptions { autoRefresh: boolean; notifications: boolean; intervalMinutes: number }
const KEY = 'dnevnik_live_options_v1';
export function loadLiveOptions(): LiveOptions {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    return { autoRefresh: value?.autoRefresh !== false, notifications: value?.notifications === true, intervalMinutes: [1, 5, 15, 30].includes(value?.intervalMinutes) ? value.intervalMinutes : 5 };
  } catch { return { autoRefresh: true, notifications: false, intervalMinutes: 5 }; }
}
export function saveLiveOptions(options: LiveOptions) { try { localStorage.setItem(KEY, JSON.stringify(options)); } catch { /* Session settings still work. */ } }
export async function notifyNewMarks(grades: DiaryGrade[]) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const base = import.meta.env.BASE_URL;
  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  for (const grade of grades.slice(0, 5)) {
    const title = `${grade.subject}: ${grade.value}`;
    const options = { body: grade.workType, tag: `grade-${grade.id}`, icon: `${base}pwa-192x192.png` };
    try {
      if (registration) await registration.showNotification(title, options);
      else new Notification(title, options);
    } catch { /* Notification restrictions must not interrupt synchronization. */ }
  }
}
