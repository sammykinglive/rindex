import { MONTH_NAMES, fmt } from './format';

// ── Local-time date helpers ───────────────────────────────────────────────────
// Dates in Rindex are stored as plain 'YYYY-MM-DD' strings, so everything here
// works in local time and returns the same format (no UTC shifting).

const pad = n => String(n).padStart(2, '0');

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

// Weeks run Monday → Sunday
export function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// ── Filter state ──────────────────────────────────────────────────────────────
// mode: 'all' | 'week' | 'month' | 'year' | 'custom'
// Every mode keeps its own last selection, so switching tabs never loses a pick.

export function defaultDateFilter(mode = 'all') {
  const now = new Date();
  return {
    mode,
    weekStart: toISODate(startOfWeek(now)),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    from: '',
    to: '',
  };
}

const shortDate = (d, withYear) =>
  d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });

// Turns a filter state into { from, to, label }.
// from / to are 'YYYY-MM-DD' strings, or '' when that side is open.
export function getDateRange(f) {
  switch (f.mode) {
    case 'week': {
      const start = parseISODate(f.weekStart);
      const end   = addDays(start, 6);
      const crossesYear = start.getFullYear() !== end.getFullYear();
      return {
        from: toISODate(start),
        to:   toISODate(end),
        label: `${shortDate(start, crossesYear)} – ${shortDate(end, true)}`,
      };
    }
    case 'month': {
      const lastDay = new Date(f.year, f.month, 0).getDate();
      return {
        from: `${f.year}-${pad(f.month)}-01`,
        to:   `${f.year}-${pad(f.month)}-${pad(lastDay)}`,
        label: `${MONTH_NAMES[f.month - 1]} ${f.year}`,
      };
    }
    case 'year':
      return { from: `${f.year}-01-01`, to: `${f.year}-12-31`, label: String(f.year) };
    case 'custom': {
      const from = f.from || '';
      const to   = f.to   || '';
      let label = 'All Time';
      if (from && to) label = `${fmt.date(from)} – ${fmt.date(to)}`;
      else if (from)  label = `From ${fmt.date(from)}`;
      else if (to)    label = `Up to ${fmt.date(to)}`;
      return { from, to, label };
    }
    default:
      return { from: '', to: '', label: 'All Time' };
  }
}
