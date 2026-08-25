import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Plus, Trash2, X, TrendingUp } from 'lucide-react';

const CATEGORIES = ['finance','sales','operations','hr','product','custom'];
const UNITS = ['$','%','units','hours','users','deals','€','£'];

const TT = { backgroundColor:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:13 };
const TC = 'var(--text3)';
const GC = 'rgba(255,255,255,0.05)';

const COLORS = ['#00f5d4','#6c63ff','#f59e0b','#f15bb5','#22c55e','#00bbf9'];

export function Metrics({ toast }) {
  const [data,    setData]    = useState({ metrics:[], grouped:{}, categories:[] });
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({ name:'', category:'finance', value:'', unit:'$', period:'', period_date:'' });
  const [selCat,  setSelCat]  = useState('');
  const [selMetric, setSelMetric] = useState('');

  const load = async () => {
    const r = await api.get(`/metrics${selCat ? `?category=${selCat}` : ''}`);
    setData(r);
    if (!selMetric && Object.keys(r.grouped).length > 0) setSelMetric(Object.keys(r.grouped)[0]);
  };
  useEffect(() => { load(); }, [selCat]);

  const save = async () => {
    if (!form.name || form.value === '') return;
    try {
      await api.post('/metrics', { ...form, value: parseFloat(form.value) });
      toast('Metric saved!');
      setModal(false);
      setForm({ name:'', category:'finance', value:'', unit:'$', period:'', period_date:'' });
      load();
    } catch (err) { toast('Save failed: ' + err.message, 'error'); }
  };

  const del = async (id) => {
    await api.del(`/metrics/${id}`);
    toast('Deleted', 'error');
    load();
  };

  const chartData = selMetric && data.grouped[selMetric]
    ? [...data.grouped[selMetric]].reverse()
    : [];

  const totalRoi = data.metrics.reduce((s, m) => m.category === 'finance' ? s + (m.value || 0) : s, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Metrics Tracker</div>
          <div className="page-sub">Track KPIs and business metrics over time</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={14}/> Add Metric
        </button>
      </div>

      <div className="page-body">
        {/* Summary tiles */}
        <div className="grid grid-4 gap-12 mb-24">
          {[
            { label:'Total Metrics', value: data.metrics.length, color:'var(--teal)' },
            { label:'Categories',    value: data.categories.length, color:'var(--accent2)' },
            { label:'Finance Total', value: `$${(totalRoi/1000).toFixed(0)}K`, color:'var(--green)' },
            { label:'Tracked Series',value: Object.keys(data.grouped).length, color:'var(--yellow)' },
          ].map((t,i) => (
            <div key={i} className="card" style={{ textAlign:'center' }}>
              <div style={{ fontSize:24, fontWeight:700, color:t.color, fontFamily:'var(--mono)' }}>{t.value}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{t.label}</div>
            </div>
          ))}
        </div>

        {/* Category filter */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          <button onClick={() => setSelCat('')} className={`btn ${!selCat ? 'btn-teal' : 'btn-ghost'}`} style={{padding:'5px 12px',fontSize:12}}>All</button>
          {data.categories.map(c => (
            <button key={c} onClick={() => setSelCat(c)} className={`btn ${selCat===c ? 'btn-primary' : 'btn-ghost'}`} style={{padding:'5px 12px',fontSize:12,textTransform:'capitalize'}}>{c}</button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

          {/* Chart */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1 }}>
                <TrendingUp size={12} style={{marginRight:6, color:'var(--teal)'}}/>Trend
              </div>
              <select value={selMetric} onChange={e => setSelMetric(e.target.value)}
                style={{ fontSize:12, padding:'4px 8px', background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text)', borderRadius:'var(--radius-sm)' }}>
                {Object.keys(data.grouped).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke={GC} strokeDasharray="3 3"/>
                  <XAxis dataKey="period" tick={{fill:TC,fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:TC,fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={TT}/>
                  <Line type="monotone" dataKey="value" stroke="#00f5d4" strokeWidth={2.5} dot={{fill:'#00f5d4',r:4}} name={selMetric}/>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:13 }}>
                Add at least 2 data points to see trend
              </div>
            )}
          </div>

          {/* Category breakdown */}
          <div className="card">
            <div style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>All Series</div>
            {Object.keys(data.grouped).length === 0 ? (
              <div style={{ color:'var(--text3)', fontSize:13, textAlign:'center', padding:'40px 0' }}>No metrics yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={Object.entries(data.grouped).map(([name, vals]) => ({ name: name.substring(0,12), value: vals[0]?.value || 0, unit: vals[0]?.unit || '' }))}>
                  <CartesianGrid stroke={GC} strokeDasharray="3 3"/>
                  <XAxis dataKey="name" tick={{fill:TC,fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:TC,fontSize:10}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={TT}/>
                  <Bar dataKey="value" fill="#6c63ff" radius={[4,4,0,0]} name="Latest Value"/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Metrics table */}
        <div className="card" style={{ marginTop:20 }}>
          <div style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>All Entries</div>
          {data.metrics.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text3)' }}>
              No metrics yet — click Add Metric to start tracking
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Metric</th><th>Category</th><th>Value</th><th>Period</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {data.metrics.map(m => (
                  <tr key={m.id}>
                    <td style={{fontWeight:600}}>{m.name}</td>
                    <td><span className="badge badge-purple" style={{textTransform:'capitalize'}}>{m.category}</span></td>
                    <td style={{fontFamily:'var(--mono)', color:'var(--teal)'}}>{m.unit}{m.value.toLocaleString()}</td>
                    <td style={{color:'var(--text2)'}}>{m.period || '—'}</td>
                    <td style={{fontSize:12,color:'var(--text3)'}}>{m.period_date ? new Date(m.period_date).toLocaleDateString() : '—'}</td>
                    <td><button className="btn-icon" onClick={() => del(m.id)}><Trash2 size={13}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{maxWidth:480}}>
            <div className="modal-header">
              <div className="modal-title">Add Metric</div>
              <button className="btn-icon" onClick={() => setModal(false)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <div className="form-row"><label className="form-label">Metric Name *</label>
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Monthly Revenue" autoFocus/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-row"><label className="form-label">Category</label>
                  <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-row"><label className="form-label">Unit</label>
                  <select value={form.unit} onChange={e => setForm(f=>({...f,unit:e.target.value}))}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-row"><label className="form-label">Value *</label>
                  <input type="number" value={form.value} onChange={e => setForm(f=>({...f,value:e.target.value}))} placeholder="0"/>
                </div>
                <div className="form-row"><label className="form-label">Period</label>
                  <input value={form.period} onChange={e => setForm(f=>({...f,period:e.target.value}))} placeholder="Q1 2025"/>
                </div>
              </div>
              <div className="form-row"><label className="form-label">Date</label>
                <input type="date" value={form.period_date} onChange={e => setForm(f=>({...f,period_date:e.target.value}))}/>
              </div>
              <div className="flex" style={{gap:10,justifyContent:'flex-end'}}>
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save}>Save Metric</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
