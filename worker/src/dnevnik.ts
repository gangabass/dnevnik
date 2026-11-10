// Preserve integer IDs before JSON.parse can round them to JavaScript numbers.
export function parseDnevnikJson(text: string): unknown {
  return JSON.parse(text.replace(/"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, token =>
    /^-?\d{16,}$/.test(token) ? JSON.stringify(token) : token));
}

type Row = Record<string, unknown>;
function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function rows(value: unknown): Row[] { return Array.isArray(value) ? value.map(row) : []; }
function id(value: unknown): string { return value == null ? '' : String(value); }
function key(value: Row): string { return id(value.id_str ?? value.id); }
function safeDownload(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && (url.hostname === 'dnevnik.ru' || url.hostname.endsWith('.dnevnik.ru') || url.hostname.endsWith('.csdnevnik.ru'))) return url.href;
  } catch { /* Ignore invalid attachment links. */ }
}

export function normalizeHomework(value: unknown) {
  const data = row(value);
  if (!Array.isArray(data.works)) throw new Error('Unexpected homework response');
  const subjects = new Map(rows(data.subjects).map(item => [key(item), item]));
  const lessons = new Map(rows(data.lessons).map(item => [key(item), item]));
  const files = new Map(rows(data.files).map(item => [key(item), item]));
  const teachers = new Map(rows(data.teachers).map(item => [key(item), item]));
  return rows(data.works).filter(work => work.type === 'Homework').map(work => {
    const lesson = lessons.get(id(work.lesson_str ?? work.lesson)) ?? {};
    const teacherNames = (Array.isArray(lesson.teachers) ? lesson.teachers : [])
      .map(teacher => teachers.get(id(teacher))?.shortName).filter(Boolean).join(', ');
    return {
      id: key(work),
      subject: String(subjects.get(id(work.subjectId))?.name ?? 'Предмет не указан'),
      teacherName: teacherNames || 'Не указан',
      dateGiven: String(work.sentDate ?? ''),
      dateDue: String(work.targetDate ?? lesson.date ?? ''),
      text: String(work.text ?? ''),
      priority: work.isImportant ? 'high' : 'normal',
      isCompleted: false,
      files: (Array.isArray(work.files) ? work.files : []).map(fileId => {
        const file = files.get(id(fileId)) ?? {};
        return {
          name: String(file.name ?? 'Вложение'),
          size: typeof file.size === 'number' ? `${Math.ceil(file.size / 1024)} КБ` : '',
          type: String(file.type ?? ''),
          url: safeDownload(file.downloadUrl) ?? safeDownload(file.pageUrl),
        };
      }),
    };
  }).sort((a, b) => a.dateDue.localeCompare(b.dateDue) || a.subject.localeCompare(b.subject));
}
