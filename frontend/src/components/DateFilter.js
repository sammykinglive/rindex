import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_NAMES } from '../utils/format';
import {
  defaultDateFilter, getDateRange,
  toISODate, parseISODate, addDays, startOfWeek,
} from '../utils/dateRange';

const MODES = [
  { key: 'all',    label: 'All Time' },
  { key: 'week',   label: 'Week'     },
  { key: 'month',  label: 'Month'    },
  { key: 'year',   label: 'Year'     },
  { key: 'custom', label: 'Custom'   },
];

// ── Hook ──────────────────────────────────────────────────────────────────────
// const { filter, setFilter, range, reset, isActive } = useDateFilter();
//   range.from / range.to  → 'YYYY-MM-DD' or '' (use these as API params / effect deps)
//   range.label            → human-readable period, e.g. "September 2026"
export function useDateFilter(initialMode = 'all') {
  const [filter, setFilter] = useState(() => defaultDateFilter(initialMode));
  const range   = useMemo(() => getDateRange(filter), [filter]);
  const reset   = useCallback(() => setFilter(defaultDateFilter('all')), []);
  return { filter, setFilter, range, reset, isActive: filter.mode !== 'all' };
}

// ── Component ─────────────────────────────────────────────────────────────────
// <DateFilter value={filter} onChange={setFilter} />
export default function DateFilter({ value, onChange, yearsBack = 4 }) {
  const thisYear = new Date().getFullYear();
  const years = [];
  for (let y = thisYear; y >= thisYear - yearsBack; y--) years.push(y);

  const set = patch => onChange({ ...value, ...patch });

  const weekStart = parseISODate(value.weekStart);
  const shiftWeek = n => set({ weekStart: toISODate(addDays(weekStart, n * 7)) });
  const { label } = getDateRange(value);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>

      {/* Mode tabs — same look as the Expenses page */}
      <div style={{ display: 'flex', background: 'var(--surface-alt)', borderRadius: 'var(--radius)', padding: 3, gap: 2, flexShrink: 0 }}>
        {MODES.map(m => (
          <button
            key={m.key}
            type="button"
            aria-pressed={value.mode === m.key}
            onClick={() => set({ mode: m.key })}
            style={{
              padding: '5px 12px', borderRadius: 'calc(var(--radius) - 2px)', border: 'none', cursor: 'pointer',
              fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)',
              background: value.mode === m.key ? 'var(--primary)' : 'transparent',
              color: value.mode === m.key ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.18s',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Week: prev / pick any date / next */}
      {value.mode === 'week' && (
        <>
          <button type="button" className="btn btn-ghost btn-sm" title="Previous week" onClick={() => shiftWeek(-1)} style={{ flexShrink: 0 }}>
            <ChevronLeft size={14} />
          </button>
          <input
            className="form-control" type="date" style={{ width: 140, flexShrink: 0 }}
            title="Pick any date to jump to that week"
            value={value.weekStart}
            onChange={e => e.target.value && set({ weekStart: toISODate(startOfWeek(parseISODate(e.target.value))) })}
          />
          <button type="button" className="btn btn-ghost btn-sm" title="Next week" onClick={() => shiftWeek(1)} style={{ flexShrink: 0 }}>
            <ChevronRight size={14} />
          </button>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
        </>
      )}

      {/* Month: month + year pickers */}
      {value.mode === 'month' && (
        <select className="form-control" style={{ width: 110, flexShrink: 0 }} value={value.month} onChange={e => set({ month: parseInt(e.target.value) })}>
          {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      )}
      {(value.mode === 'month' || value.mode === 'year') && (
        <select className="form-control" style={{ width: 90, flexShrink: 0 }} value={value.year} onChange={e => set({ year: parseInt(e.target.value) })}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      )}

      {/* Custom: from / to — if one crosses the other, the other follows */}
      {value.mode === 'custom' && (
        <>
          <input
            className="form-control" type="date" style={{ width: 140, flexShrink: 0 }} aria-label="From date"
            value={value.from}
            onChange={e => { const from = e.target.value; set(value.to && from > value.to ? { from, to: from } : { from }); }}
          />
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>to</span>
          <input
            className="form-control" type="date" style={{ width: 140, flexShrink: 0 }} aria-label="To date"
            value={value.to}
            onChange={e => { const to = e.target.value; set(value.from && to && to < value.from ? { to, from: to } : { to }); }}
          />
        </>
      )}
    </div>
  );
}
