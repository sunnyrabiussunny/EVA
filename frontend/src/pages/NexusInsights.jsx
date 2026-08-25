import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { Trash2, DollarSign, Clock, ChevronRight } from 'lucide-react';

const STATUSES = ['identified','in-progress','resolved'];
const DEPTS = ['','Engineering','Sales','Marketing','Operations','HR','Finance','Product'];

const STATUS_COLOR = {
  'identified':  { bg:'var(--yellow-bg)', color:'var(--yellow)',  label:'Identified' },
  'in-progress': { bg:'var(--blue-bg)',   color:'var(--blue)',    label:'In Progress' },
  'resolved':    { bg:'var(--green-bg)',  color:'var(--green)',   label:'Resolved' },
};
const PRIO_COLOR = {
  high:   'var(--red)',
  medium: 'var(--yellow)',
  low:    'var(--green)',
};

export function NexusInsights({ toast }) {
  const [data,    setData]    = useState({ insights:[], total_roi:0, total_hours:0 });
  const [selStat, setSelStat] = useState('');
  const [selDept, setSelDept] = useState('');

  const load = async () => {
    const params = new URLSearchParams();
    if (selStat) params.set('status', selStat);
    if (selDept) params.set('department', selDept);
    const r = await api.get(`/nexus-insights?${params}`);
    setData(r);
  };
  useEffect(() => { load(); }, [selStat, selDept]);

  const updateStatus = async (id, status) => {
    await api.put(`/nexus-insights/${id}`, { status });
    load();
  };

  const del = async (id) => {
    await api.del(`/nexus-insights/${id}`);
    toast('Deleted', 'error');
    load();
  };

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = data.insights.filter(i => i.status === s);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Insights Pipeline</div>
          <div className="page-sub">AI-extracted business insights from strategy sessions</div>
        </div>
      </div>

      <div className="page-body">
        {/* Summary */}
        <div className="grid grid-4 gap-12 mb-24">
          {[
            { label:'Total Insights',  value: data.insights.length,                     color:'var(--teal)' },
            { label:'Total ROI',       value: `$${(data.total_roi||0).toLocaleString()}`, color:'var(--green)' },
            { label:'Hours Saved/yr',  value: `${(data.total_hours||0).toFixed(0)}h`,   color:'var(--accent2)' },
            { label:'Resolved',        value: byStatus['resolved']?.length || 0,         color:'var(--yellow)' },
          ].map((t,i) => (
            <div key={i} className="card" style={{textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:700,color:t.color,fontFamily:'var(--mono)'}}>{t.value}</div>
              <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>{t.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
          <select value={selStat} onChange={e => setSelStat(e.target.value)}
            style={{fontSize:13,padding:'6px 10px',background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:'var(--radius-sm)'}}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_COLOR[s]?.label || s}</option>)}
          </select>
          <select value={selDept} onChange={e => setSelDept(e.target.value)}
            style={{fontSize:13,padding:'6px 10px',background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:'var(--radius-sm)'}}>
            {DEPTS.map(d => <option key={d} value={d}>{d || 'All Departments'}</option>)}
          </select>
        </div>

        {/* Kanban columns */}
        {data.insights.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💡</div>
            <div className="empty-title">No insights yet</div>
            <div className="empty-sub">Go to Strategy Sessions and click "Extract Insights" after a conversation</div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {STATUSES.map(status => {
              const sc = STATUS_COLOR[status];
              const items = byStatus[status] || [];
              return (
                <div key={status}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:sc.color}}/>
                    <span style={{fontSize:12,fontWeight:600,color:sc.color,textTransform:'uppercase',letterSpacing:1}}>{sc.label}</span>
                    <span style={{fontSize:11,color:'var(--text3)',background:'var(--bg3)',padding:'1px 6px',borderRadius:10}}>{items.length}</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {items.map(ins => (
                      <div key={ins.id} className="card" style={{padding:'12px 14px'}}>
                        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:6}}>
                          <div style={{fontSize:13,fontWeight:600,color:'var(--text)',lineHeight:1.3,flex:1}}>{ins.title}</div>
                          <button className="btn-icon" onClick={() => del(ins.id)} style={{flexShrink:0,padding:2}}><Trash2 size={11}/></button>
                        </div>
                        <div style={{fontSize:12,color:'var(--text2)',marginBottom:10,lineHeight:1.5}}>{ins.description}</div>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
                          <span style={{fontSize:11,color:PRIO_COLOR[ins.priority]||'var(--text3)',background:'var(--bg3)',padding:'1px 7px',borderRadius:10}}>{ins.priority}</span>
                          {ins.department && <span style={{fontSize:11,color:'var(--text3)',background:'var(--bg3)',padding:'1px 7px',borderRadius:10}}>{ins.department}</span>}
                        </div>
                        <div style={{display:'flex',gap:12,marginBottom:10}}>
                          {ins.roi_estimate > 0 && (
                            <span style={{fontSize:11,color:'var(--green)',display:'flex',alignItems:'center',gap:3}}>
                              <DollarSign size={10}/> ${ins.roi_estimate.toLocaleString()}
                            </span>
                          )}
                          {ins.hours_saved > 0 && (
                            <span style={{fontSize:11,color:'var(--teal)',display:'flex',alignItems:'center',gap:3}}>
                              <Clock size={10}/> {ins.hours_saved}h/yr saved
                            </span>
                          )}
                        </div>
                        {/* Status move buttons */}
                        <div style={{display:'flex',gap:4}}>
                          {STATUSES.filter(s => s !== status).map(s => (
                            <button key={s} onClick={() => updateStatus(ins.id, s)} style={{
                              fontSize:10,padding:'3px 8px',background:'var(--bg3)',
                              border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',
                              cursor:'pointer',color:'var(--text2)',fontFamily:'inherit',
                              display:'flex',alignItems:'center',gap:3,
                            }}>
                              <ChevronRight size={9}/> {STATUS_COLOR[s]?.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
