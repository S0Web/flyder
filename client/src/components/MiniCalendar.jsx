import { useState, useEffect } from 'react';
import { toISO } from '../lib/utils';

const JOURS_ABBR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);

  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1; // lundi = 0

  const days = [];
  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), current: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), current: true });
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    days.push({ date: next, current: false });
  }
  return days;
}

// `sobre` : habillage de l'onglet Équipe (encre et corail) ; par défaut, celui du Planning des cours.
export default function MiniCalendar({ lundi, onSelectDate, sobre = false }) {
  const st = sobre
    ? { cadre: 'bg-white border border-brand-ink/10 rounded-[3px]', semaine: 'bg-brand-ink/10 text-brand-ink', debut: 'bg-brand-ink text-white rounded-full', auj: 'font-bold text-fitness' }
    : { cadre: 'bg-white border border-gray-200 rounded', semaine: 'bg-sky-100 text-sky-900', debut: 'bg-sky-600 text-white rounded-full', auj: 'font-bold text-sky-600' };
  const [display, setDisplay] = useState({ year: lundi.getFullYear(), month: lundi.getMonth() });

  useEffect(() => {
    setDisplay({ year: lundi.getFullYear(), month: lundi.getMonth() });
  }, [lundi.getFullYear(), lundi.getMonth()]);

  const today = toISO(new Date());
  const weekISOs = new Set(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lundi);
      d.setDate(d.getDate() + i);
      return toISO(d);
    })
  );
  const lundiISO = toISO(lundi);
  const dimancheISO = (() => { const d = new Date(lundi); d.setDate(d.getDate() + 6); return toISO(d); })();

  const { year, month } = display;
  const days = getMonthDays(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  function prev() {
    setDisplay(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  }
  function next() {
    setDisplay(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  }

  return (
    <div className={`${st.cadre} select-none`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <button onClick={prev} className="text-gray-400 hover:text-gray-700 text-lg leading-none px-1">‹</button>
        <span className="text-xs font-semibold text-gray-700 capitalize">{monthLabel}</span>
        <button onClick={next} className="text-gray-400 hover:text-gray-700 text-lg leading-none px-1">›</button>
      </div>

      <div className="grid grid-cols-7 px-2 pt-2">
        {JOURS_ABBR.map((j, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-gray-400 pb-1">{j}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 px-2 pb-2 gap-y-0.5">
        {days.map(({ date, current }, i) => {
          const iso = toISO(date);
          const isToday = iso === today;
          const inWeek = weekISOs.has(iso);
          const isFirst = iso === lundiISO;
          const isLast = iso === dimancheISO;

          let cls = 'h-6 w-full text-[11px] transition-colors ';
          if (!current) cls += 'text-gray-300 ';

          if (inWeek) {
            cls += `${st.semaine} `;
            if (isFirst) cls += 'rounded-l-full ';
            if (isLast)  cls += 'rounded-r-full ';
          } else if (isToday) {
            cls += `${st.auj} rounded-full hover:bg-gray-100 `;
          } else {
            cls += (current ? 'text-gray-700 hover:bg-gray-100 ' : 'text-gray-300 hover:bg-gray-50 ') + 'rounded-full ';
          }

          return (
            <button key={i} onClick={() => onSelectDate(date)} className={cls}>
              <span className={`inline-flex items-center justify-center w-6 h-6 ${isFirst ? st.debut : ''}`}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
