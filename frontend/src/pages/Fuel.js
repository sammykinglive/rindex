import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Fuel as FuelIcon } from 'lucide-react';
import api from '../utils/api';
import { getCurrency, getSetting } from '../utils/settingsCache';
import { fmt } from '../utils/format';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const EMPTY = {
  fuel_date: '', vehicle_id: '', trip_id: '', odometer_km: '', litres: '',
  source: 'Client Pump - Farm', location: '', price_per_litre: '', cost: '', issued_by: '', confirmed_by_driver: false, notes: '',
};

const SOURCES = ['Client Pump - Farm', 'Client Pump - Yard', 'Client Fuel Card', 'Company Pump', 'Other'];

function Modal({ title, onClose, onSubmit, form, setForm, loading, vehicles, trips }) {
  const vehicleTrips = trips.filter(t => String(t.vehicle_id) === String(form.vehicle_id));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-control" type="date" value={form.fuel_date} onChange={e => setForm({ ...form, fuel_date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle *</label>
                <select className="form-control" value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value, trip_id: '' })} required>
                  <option value="">Select vehicle…</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Linked Trip</label>
                <select className="form-control" value={form.trip_id} onChange={e => setForm({ ...form, trip_id: e.target.value })} disabled={!form.vehicle_id}>
                  <option value="">None</option>
                  {vehicleTrips.map(t => <option key={t.id} value={t.id}>{t.trip_code || `Trip #${t.id}`} — {fmt.date(t.trip_date)}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-control" placeholder="e.g. Tema" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Odometer (km)</label>
                <input className="form-control" type="number" value={form.odometer_km} onChange={e => setForm({ ...form, odometer_km: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Litres *</label>
                <input className="form-control" type="number" step="0.1" value={form.litres} onChange={e => setForm({ ...form, litres: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Price per Litre ({getCurrency()})</label>
                <input className="form-control" type="number" step="0.01" value={form.price_per_litre} onChange={e => setForm({ ...form, price_per_litre: e.target.value, cost: '' })} />
              </div>
              <div className="form-group">
                <label className="form-label">Cost ({getCurrency()})</label>
                <input className="form-control" type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value, price_per_litre: '' })} placeholder={form.price_per_litre && form.litres ? (Number(form.price_per_litre) * Number(form.litres)).toFixed(2) : ''} />
                {form.price_per_litre && form.litres && !form.cost && (
                  <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4 }}>
                    Calculated: {getCurrency()} {(Number(form.price_per_litre) * Number(form.litres)).toFixed(2)}
                  </div>
                )}
              </div>
              <div />

              <div className="form-group">
                <label className="form-label">Fuel Source</label>
                <select className="form-control" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                  {SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Issued By</label>
                <input className="form-control" value={form.issued_by} onChange={e => setForm({ ...form, issued_by: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ opacity: 0 }}>.</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--text)', height: 38 }}>
                  <input type="checkbox" checked={form.confirmed_by_driver} onChange={e => setForm({ ...form, confirmed_by_driver: e.target.checked })} />
                  Confirmed by Driver
                </label>
              </div>

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Notes</label>
                <input className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="alert alert-info" style={{ marginTop: 16, marginBottom: 0 }}>
              A Fuel Code is generated automatically when you save (e.g. F01-20260808-001). Distance since last fill-up and km/L efficiency are also calculated automatically from this vehicle's previous fuel entry.
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Fuel() {
  const { canEdit } = useAuth();
  const editable = canEdit('fuel');

  const [logs, setLogs]       = useState([]);
  const [totals, setTotals]   = useState({ total_entries: 0, total_litres: 0, total_cost: 0, avg_efficiency: null });
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [editId, setEditId]   = useState(null);
  const [vehicleFilter, setVehicleFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (vehicleFilter) params.vehicle_id = vehicleFilter;
    api.get('/fuel', { params }).then(r => {
      setLogs(r.data.logs);
      setTotals(r.data.totals);
      setLoading(false);
    });
  }, [vehicleFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/vehicles').then(r => setVehicles(r.data.vehicles)).catch(() => {});
    api.get('/trips').then(r => setTrips(r.data.trips)).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'edit') { await api.put(`/fuel/${editId}`, form); toast.success('Fuel entry updated.'); }
      else { await api.post('/fuel', form); toast.success('Fuel entry logged.'); }
      setModal(null); setForm(EMPTY); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this fuel entry?')) return;
    await api.delete(`/fuel/${id}`);
    toast.success('Deleted.'); load();
  }

  function openEdit(f) {
    setForm({
      fuel_date: f.fuel_date, vehicle_id: f.vehicle_id || '', trip_id: f.trip_id || '',
      odometer_km: f.odometer_km ?? '', litres: f.litres ?? '', source: f.source || SOURCES[0],
      location: f.location || '', price_per_litre: f.price_per_litre ?? '',
      cost: f.cost ?? '', issued_by: f.issued_by || '', confirmed_by_driver: !!f.confirmed_by_driver,
      notes: f.notes || '',
    });
    setEditId(f.id); setModal('edit');
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title"><FuelIcon size={20} style={{ color: 'var(--primary)' }} /> Fuel</div>
          <div className="page-sub">Track fuel issued per vehicle — protects against billing disputes</div>
        </div>
        {editable && (
          <button className="btn btn-success" onClick={() => { setForm(EMPTY); setModal('add'); }}>
            <Plus size={16} /> Log Fuel
          </button>
        )}
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Entries</div>
          <div className="kpi-value">{fmt.number(totals.total_entries)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Litres</div>
          <div className="kpi-value">{fmt.number(totals.total_litres)} L</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Cost</div>
          <div className="kpi-value">{fmt.currency(totals.total_cost)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg. Efficiency</div>
          <div className="kpi-value">{totals.avg_efficiency ? `${Number(totals.avg_efficiency).toFixed(2)} km/L` : '—'}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <select className="form-control" style={{ width: 220 }} value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)}>
            <option value="">All vehicles</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ width: 32, height: 32, border: '3px solid var(--primary-pale)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><FuelIcon size={32} style={{ opacity: 0.4 }} /></div>
              <h3>No fuel entries yet</h3>
              <p>{editable ? 'Click "Log Fuel" to record your first fuel entry.' : 'No fuel entries have been logged yet.'}</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fuel Code</th><th>Date</th><th>Vehicle</th><th>Trip</th><th>Litres</th><th>Cost</th>
                  <th>Distance Since Last</th><th>Efficiency</th><th>Source</th>{editable && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {logs.map(f => (
                  <tr key={f.id}>
                    <td>
                      <span className="badge badge-teal" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>
                        {f.fuel_code || '—'}
                      </span>
                    </td>
                    <td>{fmt.date(f.fuel_date)}</td>
                    <td style={{ fontWeight: 600 }}>{f.vehicle_reg || '—'}</td>
                    <td>{f.trip_id ? (trips.find(t => t.id === f.trip_id)?.trip_code || `#${f.trip_id}`) : '—'}</td>
                    <td>{fmt.number(f.litres)} L</td>
                    <td>{f.cost != null ? `${fmt.currency(f.cost)}` : '—'}</td>
                    <td>{f.distance_since_last_km != null ? `${fmt.number(f.distance_since_last_km)} km` : '—'}</td>
                    <td>
                      {f.efficiency_km_per_l != null
                        ? <span className={`badge ${f.efficiency_km_per_l < Number(getSetting('low_fuel_efficiency_kmpl', 2.5)) ? 'badge-red' : 'badge-green'}`}>{f.efficiency_km_per_l} km/L</span>
                        : '—'}
                    </td>
                    <td>{f.source || '—'}</td>
                    {editable && (
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(f)}><Pencil size={13} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(f.id)} style={{ color: 'var(--red)' }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <Modal
          title={modal === 'edit' ? 'Edit Fuel Entry' : 'Log Fuel Entry'}
          onClose={() => setModal(null)} onSubmit={handleSubmit}
          form={form} setForm={setForm} loading={saving}
          vehicles={vehicles} trips={trips}
        />
      )}
    </div>
  );
}
