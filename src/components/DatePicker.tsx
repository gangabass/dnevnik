import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
};
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const displayDate = (value: string) => value.split('-').reverse().join('.');

export function DatePicker({ value, onChange, className, ...props }: Props) {
  const [text, setText] = useState(() => displayDate(value));
  const [month, setMonth] = useState(() => new Date(`${value || isoDate(new Date())}T12:00:00`));
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { setText(displayDate(value)); input.current?.setCustomValidity(''); }, [value]);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  const close = () => { setOpen(false); input.current?.focus(); };
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const choose = (day: number) => {
    onChange({ target: { value: isoDate(new Date(month.getFullYear(), month.getMonth(), day)) } });
    close();
  };
  return <span className="relative block min-w-0">
    <input {...props} ref={input} type="text" lang="ru-RU" inputMode="numeric" placeholder="ДД.ММ.ГГГГ" maxLength={10} value={text} className={`${className || ''} pr-10`} onChange={event => {
      const next = event.target.value;
      setText(next);
      const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(next);
      const parsed = match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : null;
      const valid = parsed && displayDate(isoDate(parsed)) === next;
      event.target.setCustomValidity(next && !valid ? 'Введите дату в формате ДД.ММ.ГГГГ' : '');
      if (valid) onChange({ target: { value: isoDate(parsed) } });
      else if (!next) onChange({ target: { value: '' } });
    }} />
    <button type="button" disabled={props.disabled} aria-label={`Выбрать дату: ${props['aria-label'] || 'дата'}`} onClick={() => { setMonth(new Date(`${value || isoDate(new Date())}T12:00:00`)); setOpen(true); }} className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-2 text-slate-400 hover:text-white"><Calendar className="h-4 w-4" /></button>
    {open && createPortal(<dialog ref={dialog} lang="ru-RU" aria-label={props['aria-label'] || 'Выбор даты'} onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }} className="fixed inset-0 m-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-xl backdrop:bg-black/60">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" aria-label="Предыдущий месяц" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded p-2 hover:bg-slate-800"><ChevronLeft size={20} /></button>
        <span aria-live="polite" className="font-semibold capitalize">{new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(first)}</span>
        <button type="button" aria-label="Следующий месяц" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded p-2 hover:bg-slate-800"><ChevronRight size={20} /></button>
        <button type="button" aria-label="Закрыть календарь" onClick={close} className="rounded p-2 hover:bg-slate-800"><X size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => <span key={day} className="py-2 text-slate-400">{day}</span>)}
        {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
        {Array.from({ length: count }, (_, index) => {
          const day = index + 1;
          const iso = isoDate(new Date(month.getFullYear(), month.getMonth(), day));
          return <button type="button" key={day} autoFocus={iso === value || (!value && day === 1)} aria-label={displayDate(iso)} aria-pressed={iso === value} disabled={Boolean((props.min && iso < props.min) || (props.max && iso > props.max))} onClick={() => choose(day)} className={`rounded-lg py-2 hover:bg-blue-700 disabled:opacity-30 ${iso === value ? 'bg-blue-600' : 'bg-slate-800'}`}>{day}</button>;
        })}
      </div>
      <button type="button" onClick={() => { const today = new Date(); setMonth(today); }} className="mt-3 rounded px-3 py-2 text-sm text-blue-300 hover:bg-slate-800">Текущий месяц</button>
    </dialog>, document.body)}
  </span>;
}
