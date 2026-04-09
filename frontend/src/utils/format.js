export const fmt = {
  currency: (v) => `GHS ${Number(v || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  number:   (v) => Number(v || 0).toLocaleString(),
  percent:  (v) => `${Number(v || 0).toFixed(1)}%`,
  date:     (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
};

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
