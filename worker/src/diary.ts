import { row, rows, id, key, type Row } from './dnevnik';
import type { DiaryDay, DiaryGrade, StudentChoice } from '../../shared/diary';

export function studentChoices(value: unknown): StudentChoice[] {
  const context = row(value);
  const schools = new Map(rows(context.schools).map(school => [key(school), school]));
  const groups = rows(context.eduGroups);
  const people = rows(context.children);
  if (Array.isArray(context.schoolIds) && context.schoolIds.length) people.push(context);
  return people.flatMap(person => (Array.isArray(person.schoolIds) ? person.schoolIds : []).map(schoolId => {
    const school = schools.get(id(schoolId)) ?? {};
    const groupIds = new Set((Array.isArray(person.groupIds) ? person.groupIds : []).map(id));
    const group = groups.find(group => groupIds.has(key(group)) && id(group.schoolId_str ?? group.schoolID) === id(schoolId));
    return { personId: id(person.personId_str ?? person.personId), schoolId: id(schoolId),
      studentName: String(person.shortName ?? ''), schoolName: String(school.name ?? ''), className: String(group?.name ?? '') };
  })).filter(choice => choice.personId && choice.schoolId);
}

export function normalizeDiary(marks: unknown, schedules: unknown[], homework: unknown, groups: unknown, weighted: boolean) {
  const days = schedules.flatMap(schedule => rows(row(schedule).days));
  const extra = row(homework);
  const subjectRows = [...rows(extra.subjects), ...rows(groups).flatMap(group => rows(group.subjects)), ...days.flatMap(day => rows(day.subjects))];
  const subjects = new Map(subjectRows.map(subject => [key(subject), subject]));
  const lessons = new Map([...rows(extra.lessons), ...days.flatMap(day => rows(day.lessons))].map(lesson => [key(lesson), lesson]));
  const works = new Map([...rows(extra.works), ...days.flatMap(day => [...rows(day.works), ...rows(day.homeworks)])].map(work => [key(work), work]));
  const teachers = new Map([...rows(extra.teachers), ...days.flatMap(day => rows(day.teachers).map(teacher => row(teacher.person ?? teacher)))].map(teacher => [key(teacher), teacher]));
  const workTypes = new Map(days.flatMap(day => rows(day.workTypes)).map(type => [key(type), type]));
  const teacherName = (lesson: Row) => (Array.isArray(lesson.teachers) ? lesson.teachers : []).map(person => teachers.get(id(person))?.shortName).filter(Boolean).join(', ');
  const gradeRows = new Map([...days.flatMap(day => rows(day.marks)), ...rows(marks)].map(mark => [key(mark), mark]));
  const grades: DiaryGrade[] = [...gradeRows.values()].map(mark => {
    const work = works.get(id(mark.work_str ?? mark.work)) ?? {};
    const lesson = lessons.get(id(mark.lesson_str ?? mark.lesson)) ?? {};
    const subjectId = id(work.subjectId ?? lesson.subjectId);
    const numeric = Number(mark.value);
    return {
      id: key(mark), subjectId, subject: String(subjects.get(subjectId)?.name ?? 'Предмет не указан'),
      workId: id(mark.work_str ?? mark.work), markNumber: typeof mark.number === 'number' ? mark.number : undefined,
      value: String(mark.textValue ?? mark.value ?? ''),
      numericValue: mark.type === 'Mark5' && [2, 3, 4, 5].includes(numeric) ? numeric : null,
      workType: String(workTypes.get(id(mark.workType ?? work.workType))?.name ?? 'Вид работы не указан'),
      date: String(mark.date ?? ''), lessonDate: String(lesson.date ?? work.targetDate ?? ''),
      teacherName: teacherName(lesson) || 'Не указан', topic: String(lesson.title ?? ''),
      period: typeof work.periodNumber === 'number' ? work.periodNumber : null,
      // markCount is the number of mark slots, not the grade weight.
      weight: weighted ? null : 1, includeInAverage: mark.use_avg_calc !== false,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
  const calendar = new Map<string, Map<string, ReturnType<typeof lessonView>>>();
  function lessonView(lesson: Row) {
    const assignments = [...works.values()].filter(work => work.type === 'Homework' && id(work.lesson_str ?? work.lesson) === key(lesson));
    return {
      id: key(lesson), number: typeof lesson.number === 'number' ? lesson.number : 0,
      subject: String(subjects.get(id(lesson.subjectId))?.name ?? 'Предмет не указан'),
      topic: String(lesson.title ?? ''), hours: String(lesson.hours ?? ''), room: String(lesson.place ?? ''),
      teacherName: teacherName(lesson) || 'Не указан', homework: assignments.map(work => String(work.text ?? '')).filter(Boolean).join('\n'),
    };
  }
  for (const day of days) {
    const date = String(day.date ?? '').slice(0, 10);
    if (!date) continue;
    const collection = calendar.get(date) ?? new Map();
    for (const lesson of rows(day.lessons)) collection.set(key(lesson), lessonView(lesson));
    calendar.set(date, collection);
  }
  const schedule: DiaryDay[] = [...calendar].sort(([a], [b]) => a.localeCompare(b)).map(([date, lessons]) => ({
    date, lessons: [...lessons.values()].sort((a, b) => a.number - b.number || a.id.localeCompare(b.id)),
  }));
  return { grades, schedule };
}
