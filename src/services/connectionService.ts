import type { Connection, HomeworkCache } from '../../shared/diary';
export type { Connection, HomeworkCache } from '../../shared/diary';
const SETTINGS = 'dnevnik_connection_v1';
const TOKEN = 'dnevnik_token_v1';
function cacheKey(connection: Connection) { return `dnevnik_homework_v1:${connection.personId}:${connection.schoolId}`; }
export const connectionService = {
  getSettings(): Connection | null {
    try { return JSON.parse(localStorage.getItem(SETTINGS) || 'null'); } catch { return null; }
  },
  saveSettings(connection: Connection) { localStorage.setItem(SETTINGS, JSON.stringify(connection)); },
  getToken(): string {
    try {
      const saved = localStorage.getItem(TOKEN);
      if (saved) return saved;
      // Preserve an existing connection when upgrading from session-only storage.
      const legacy = sessionStorage.getItem(TOKEN) || '';
      if (legacy) this.saveToken(legacy);
      return legacy;
    } catch { return ''; }
  },
  saveToken(token: string) {
    localStorage.setItem(TOKEN, token);
    sessionStorage.removeItem(TOKEN);
  },
  readCache(connection: Connection): HomeworkCache | null {
    try { return JSON.parse(localStorage.getItem(cacheKey(connection)) || 'null'); } catch { return null; }
  },
  saveCache(connection: Connection, cache: HomeworkCache) {
    try { localStorage.setItem(cacheKey(connection), JSON.stringify(cache)); } catch { /* Still show data if storage is full. */ }
  },
  disconnect() {
    localStorage.removeItem(TOKEN);
    sessionStorage.removeItem(TOKEN);
    localStorage.removeItem('dnevnik_live_options_v1');
    localStorage.removeItem(SETTINGS);
    Object.keys(localStorage).filter(key => key.startsWith('dnevnik_homework_v1:')).forEach(key => localStorage.removeItem(key));
    // Remove personal/demo data saved by earlier versions as well.
    ['dnevnik_student_profile', 'dnevnik_homework_list', 'dnevnik_grades_list', 'dnevnik_feed_list', 'dnevnik_push_logs'].forEach(key => localStorage.removeItem(key));
  },
};
