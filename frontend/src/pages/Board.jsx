import { useEffect, useRef, useState, useCallback } from 'react';
import { Zap, X, RefreshCw, Sparkles, FileText } from 'lucide-react';

const API = 'http://192.168.10.120:4000';
const COLORS = ['#00f5d4','#6c63ff','#f59e0b','#f15bb5','#22c55e','#3b82f6','#ef4444','#8c9eff','#ffd166','#5ed6c4'];
const MIN_W = 220; const MIN_H = 160;

export function Board({ toast }) {
  const [boxes,     setBoxes]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(false);
  const [summary,   setSummary]   = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [aiModal,   setAiModal]   = useState(false);
  const [aiPrompt,  setAiPrompt]  = useState('');
  const [aiCreating,setAiCreating]= useState(false);
  const [clearBoard,setClearBoard]= useState(false);

  const boxesRef  = useRef(boxes);
  const dragRef   = useRef(null);
  const resizeRef = useRef(null);
  useEffect(() => { boxesRef.current = boxes; }, [boxes]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/board/boxes`);
      setBoxes(await r.json());
    } catch { toast?.('Failed to load board', 'error'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const patch = (id, p) => setBoxes(bs => bs.map(b => b.id===id ? {...b,...p} : b));

  // ── Box CRUD ────────────────────────────────────────────────────────────────
  const addBox = async () => {
    const n = boxesRef.current.length;
    try {
      const r = await fetch(`${API}/api/board/boxes`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ title:'New Box', color: COLORS[n%COLORS.length], x:24+(n%4)*30, y:24+(n%4)*30, w:280, h:240 }),
      });
      const box = await r.json();
      setBoxes(bs => [...bs, box]);
    } catch { toast?.('Failed to add box', 'error'); }
  };

  const removeBox = async (id) => {
    if (!confirm('Delete this box?')) return;
    setBoxes(bs => bs.filter(b => b.id!==id));
    await fetch(`${API}/api/board/boxes/${id}`, { method:'DELETE' });
  };

  const renameBox = async (id, title) => {
    patch(id, { title });
    await fetch(`${API}/api/board/boxes/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title }) });
  };

  const recolorBox = async (id, color) => {
    patch(id, { color });
    await fetch(`${API}/api/board/boxes/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ color }) });
  };

  const bringFront = async (id) => {
    const top = boxesRef.current.reduce((m,b) => Math.max(m, b.z_index||1), 1);
    patch(id, { z_index: top+1 });
    await fetch(`${API}/api/board/boxes/${id}/bring-front`, { method:'POST' });
  };

  // ── Item CRUD ───────────────────────────────────────────────────────────────
  const addItem = async (boxId, text) => {
    if (!text.trim()) return;
    const r = await fetch(`${API}/api/board/boxes/${boxId}/items`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text: text.trim() }),
    });
    const item = await r.json();
    setBoxes(bs => bs.map(b => b.id===boxId ? {...b, items:[...b.items, item]} : b));
  };

  const toggleItem = async (boxId, item) => {
    setBoxes(bs => bs.map(b => b.id===boxId ? {...b, items: b.items.map(i => i.id===item.id ? {...i, done:i.done?0:1} : i)} : b));
    await fetch(`${API}/api/board/items/${item.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ done: item.done?0:1 }) });
  };

  const removeItem = async (boxId, itemId) => {
    setBoxes(bs => bs.map(b => b.id===boxId ? {...b, items: b.items.filter(i => i.id!==itemId)} : b));
    await fetch(`${API}/api/board/items/${itemId}`, { method:'DELETE' });
  };

  // ── Drag to move ─────────────────────────────────────────────────────────────
  const onDragMove = useCallback((e) => {
    const d = dragRef.current; if (!d) return;
    const cx = e.touches?e.touches[0].clientX:e.clientX;
    const cy = e.touches?e.touches[0].clientY:e.clientY;
    patch(d.boxId, { x: Math.max(0,d.origX+(cx-d.startX)), y: Math.max(0,d.origY+(cy-d.startY)) });
  }, []);

  const onDragEnd = useCallback(() => {
    const d = dragRef.current; dragRef.current = null;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    if (d) {
      const box = boxesRef.current.find(b => b.id===d.boxId);
      if (box) fetch(`${API}/api/board/boxes/${d.boxId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ x:box.x, y:box.y }) });
    }
  }, [onDragMove]);

  const onHeaderPointerDown = (e, box) => {
    if (!editing || e.target.closest('[data-no-drag]')) return;
    e.preventDefault();
    bringFront(box.id);
    dragRef.current = { boxId:box.id, startX:e.clientX, startY:e.clientY, origX:box.x, origY:box.y };
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
  };

  // ── Drag to resize ───────────────────────────────────────────────────────────
  const onResizeMove = useCallback((e) => {
    const r = resizeRef.current; if (!r) return;
    patch(r.boxId, { w: Math.max(MIN_W,r.origW+(e.clientX-r.startX)), h: Math.max(MIN_H,r.origH+(e.clientY-r.startY)) });
  }, []);

  const onResizeEnd = useCallback(() => {
    const r = resizeRef.current; resizeRef.current = null;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
    if (r) {
      const box = boxesRef.current.find(b => b.id===r.boxId);
      if (box) fetch(`${API}/api/board/boxes/${r.boxId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ w:box.w, h:box.h }) });
    }
  }, [onResizeMove]);

  const onResizePointerDown = (e, box) => {
    if (!editing) return;
    e.preventDefault(); e.stopPropagation();
    bringFront(box.id);
    resizeRef.current = { boxId:box.id, startX:e.clientX, startY:e.clientY, origW:box.w, origH:box.h };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
  };

  // ── AI Summary ───────────────────────────────────────────────────────────────
  const aiSummarize = async () => {
    setSummarizing(true); setSummary(null);
    try {
      const r = await fetch(`${API}/api/board/summarize`, { method:'POST' });
      setSummary(await r.json());
    } catch { toast?.('Summary failed', 'error'); }
    setSummarizing(false);
  };

  // ── AI Create Board ──────────────────────────────────────────────────────────
  const aiCreate = async () => {
    if (!aiPrompt.trim()) return;
    setAiCreating(true);
    try {
      const r = await fetch(`${API}/api/board/ai-create`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ prompt: aiPrompt, clear: clearBoard }),
      });
      const d = await r.json();
      if (d.ok) {
        toast?.(`Board created — ${d.boxCount} boxes added!`);
        await load();
        setAiModal(false); setAiPrompt(''); setClearBoard(false);
      } else {
        toast?.('AI board creation failed', 'error');
      }
    } catch { toast?.('Error', 'error'); }
    setAiCreating(false);
  };

  const canvasH = Math.max(900, ...boxes.map(b => (b.y||0)+(b.h||0)+80), 900);
  const prioColor = { high:'var(--red)', medium:'var(--yellow)', low:'var(--green)' };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>

      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 24px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', flexShrink:0, gap:10 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>Board</div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>{boxes.length} boxes · {boxes.reduce((s,b)=>s+(b.items||[]).length,0)} items</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" onClick={() => setAiModal(true)} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Sparkles size={13}/> AI Create Board
          </button>
          <button className="btn btn-teal" onClick={aiSummarize} disabled={summarizing || boxes.length===0} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Zap size={13}/> {summarizing ? 'Analyzing...' : 'AI Summary'}
          </button>
          {editing && (
            <button className="btn btn-primary" onClick={addBox}>+ Add Box</button>
          )}
          <button onClick={() => setEditing(e=>!e)} className={`btn ${editing ? 'btn-primary' : 'btn-ghost'}`}>
            {editing ? '✓ Done' : '✎ Edit Layout'}
          </button>
        </div>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* Canvas */}
        <div style={{ flex:1, overflow:'auto', position:'relative', background:'var(--bg)' }}>
          <div style={{ position:'relative', minWidth:'100%', height:canvasH }}>
            {loading && <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>Loading...</div>}
            {!loading && boxes.length===0 && (
              <div style={{ textAlign:'center', padding:80, color:'var(--text3)' }}>
                <div style={{ fontSize:40, opacity:.2, marginBottom:12 }}>⬡</div>
                <div style={{ fontSize:16, marginBottom:8 }}>Blank board</div>
                <div style={{ fontSize:13, marginBottom:20 }}>Click <strong>Edit Layout → + Add Box</strong> to start, or use <strong>AI Create Board</strong></div>
                <button className="btn btn-teal" onClick={() => setAiModal(true)}><Sparkles size={13}/> AI Create Board</button>
              </div>
            )}
            {boxes.map(box => (
              <BoardBox key={box.id} box={box} editing={editing}
                onHeaderPointerDown={onHeaderPointerDown}
                onResizePointerDown={onResizePointerDown}
                onRename={renameBox} onRecolor={recolorBox} onRemove={removeBox}
                onAddItem={addItem} onToggleItem={toggleItem} onRemoveItem={removeItem}
              />
            ))}
          </div>
        </div>

        {/* AI Summary Panel */}
        {summary && (
          <div style={{ width:320, flexShrink:0, borderLeft:'1px solid var(--border)', background:'var(--bg2)', overflow:'auto', padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                <Zap size={13} style={{color:'var(--teal)'}}/> AI Board Summary
              </div>
              <button className="btn-icon" onClick={() => setSummary(null)}><X size={14}/></button>
            </div>

            <div className="card-teal" style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:'var(--teal)', letterSpacing:1, textTransform:'uppercase', marginBottom:6, fontFamily:'var(--mono)' }}>Overview</div>
              <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>{summary.summary}</div>
            </div>

            {summary.next_actions?.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Next Actions</div>
                {summary.next_actions.map((a,i) => (
                  <div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:13, color:'var(--text2)', alignItems:'flex-start' }}>
                    <span style={{ color:'var(--teal)', flexShrink:0, marginTop:2 }}>→</span>
                    {a}
                  </div>
                ))}
              </div>
            )}

            {summary.boxes?.map((b,i) => (
              <div key={i} className="card" style={{ marginBottom:8, padding:'10px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>{b.title}</div>
                  <div style={{ display:'flex', gap:6 }}>
                    <span style={{ fontSize:10, color:'var(--text3)' }}>{b.completion}</span>
                    <span style={{ fontSize:10, color: prioColor[b.priority]||'var(--text3)', background:'var(--bg3)', padding:'1px 6px', borderRadius:10 }}>{b.priority}</span>
                  </div>
                </div>
                <div style={{ fontSize:12, color:'var(--text2)' }}>{b.insight}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Create Modal */}
      {aiModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setAiModal(false)}>
          <div className="modal" style={{ maxWidth:540 }}>
            <div className="modal-header">
              <div className="modal-title"><Sparkles size={15} style={{marginRight:6}}/> AI Create Board</div>
              <button className="btn-icon" onClick={() => setAiModal(false)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Describe what you need</label>
                <textarea rows={4} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                  placeholder={`Examples:\n"Create a Q4 product launch plan"\n"Build a weekly planning board"\n"Make a board for my carbon capture startup go-to-market"`}
                  autoFocus/>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1 }}>Quick prompts</div>
                {[
                  'Weekly executive priorities and open loops',
                  'Q4 planning board with key milestones',
                  'Startup go-to-market checklist',
                  'Board meeting prep checklist',
                ].map(p => (
                  <button key={p} onClick={() => setAiPrompt(p)} style={{
                    background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
                    padding:'6px 10px', cursor:'pointer', textAlign:'left', fontSize:12,
                    color:'var(--text2)', fontFamily:'inherit',
                  }}>{p}</button>
                ))}
              </div>

              <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, cursor:'pointer', fontSize:13 }}>
                <input type="checkbox" checked={clearBoard} onChange={e => setClearBoard(e.target.checked)}/>
                <span style={{ color:'var(--text2)' }}>Clear existing board first</span>
              </label>

              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setAiModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={aiCreate} disabled={!aiPrompt.trim()||aiCreating}>
                  <Sparkles size={13}/> {aiCreating ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BOARD BOX COMPONENT ───────────────────────────────────────────────────────
function BoardBox({ box, editing, onHeaderPointerDown, onResizePointerDown, onRename, onRecolor, onRemove, onAddItem, onToggleItem, onRemoveItem }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft,   setTitleDraft]   = useState(box.title);
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [newText,      setNewText]      = useState('');
  useEffect(() => { setTitleDraft(box.title); }, [box.title]);

  const doneCount = (box.items||[]).filter(i => i.done).length;

  const commitTitle = () => {
    setEditingTitle(false);
    const t = titleDraft.trim() || 'Untitled';
    if (t !== box.title) onRename(box.id, t);
    else setTitleDraft(box.title);
  };

  const submitItem = () => {
    onAddItem(box.id, newText);
    setNewText('');
  };

  return (
    <div style={{
      position:'absolute', left:box.x, top:box.y, width:box.w, height:box.h,
      zIndex: box.z_index||1, display:'flex', flexDirection:'column',
      background:'var(--bg2)', border:'1px solid var(--border)',
      borderRadius:'var(--radius)', boxShadow:'0 4px 20px rgba(0,0,0,.4)', overflow:'hidden',
    }}>
      {/* Header */}
      <div
        style={{ background: box.color, padding:'10px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor: editing?'grab':'default', flexShrink:0, userSelect:'none' }}
        onMouseDown={e => onHeaderPointerDown(e, box)}
      >
        {editingTitle ? (
          <input data-no-drag autoFocus value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => { if(e.key==='Enter') commitTitle(); if(e.key==='Escape'){setTitleDraft(box.title);setEditingTitle(false);} }}
            style={{ background:'rgba(0,0,0,.2)', border:'none', color:'white', fontWeight:700, fontSize:13, borderRadius:4, padding:'2px 6px', outline:'none', width:'100%' }}/>
        ) : (
          <span style={{ fontWeight:700, fontSize:13, color:'white', cursor:editing?'text':'default' }}
            onClick={() => editing && setEditingTitle(true)}>
            {box.title}
          </span>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }} data-no-drag>
          {(box.items||[]).length > 0 && (
            <span style={{ fontSize:11, color:'rgba(255,255,255,.8)', background:'rgba(0,0,0,.2)', padding:'1px 6px', borderRadius:10 }}>
              {doneCount}/{(box.items||[]).length}
            </span>
          )}
          {editing && (
            <>
              <button onClick={() => setPickerOpen(p=>!p)} style={{ width:14, height:14, borderRadius:'50%', background:box.color, border:'2px solid rgba(255,255,255,.6)', cursor:'pointer' }}/>
              <button onClick={() => onRemove(box.id)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.8)', cursor:'pointer', fontSize:16, lineHeight:1, padding:0 }}>×</button>
            </>
          )}
        </div>
        {pickerOpen && (
          <div style={{ position:'absolute', top:40, right:8, zIndex:100, display:'flex', gap:4, flexWrap:'wrap', width:140, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:8 }} data-no-drag>
            {COLORS.map(c => (
              <button key={c} onClick={() => { onRecolor(box.id,c); setPickerOpen(false); }}
                style={{ width:20, height:20, borderRadius:'50%', background:c, border: c===box.color?'2px solid white':'2px solid transparent', cursor:'pointer' }}/>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', padding:'10px 12px' }}>
        {/* Add item */}
        <div style={{ display:'flex', gap:6, marginBottom:8 }}>
          <input value={newText} onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key==='Enter' && submitItem()}
            placeholder="Add a note..." style={{ flex:1, fontSize:12, padding:'5px 8px', background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text)', borderRadius:'var(--radius-sm)', outline:'none' }}/>
          <button onClick={submitItem} style={{ background:'var(--teal-bg)', border:'1px solid var(--teal-border)', color:'var(--teal)', borderRadius:'var(--radius-sm)', padding:'5px 10px', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>Add</button>
        </div>

        {/* Items */}
        <div style={{ flex:1, overflow:'auto' }}>
          {(box.items||[]).map(item => (
            <div key={item.id} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:5, group:true }}>
              <button onClick={() => onToggleItem(box.id, item)} style={{
                width:16, height:16, borderRadius:4, flexShrink:0, marginTop:2, cursor:'pointer',
                background: item.done ? 'var(--teal)' : 'transparent',
                border:`2px solid ${item.done?'var(--teal)':'var(--border2)'}`,
                transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                {item.done && <span style={{ color:'var(--bg)', fontSize:10, fontWeight:700 }}>✓</span>}
              </button>
              <span style={{ fontSize:12, color: item.done?'var(--text3)':'var(--text)', textDecoration: item.done?'line-through':'none', flex:1, lineHeight:1.5 }}>{item.text}</span>
              <button onClick={() => onRemoveItem(box.id, item.id)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:14, lineHeight:1, padding:0, opacity:0, transition:'opacity .15s' }}
                onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Resize handle */}
      {editing && (
        <div onMouseDown={e => onResizePointerDown(e, box)} style={{
          position:'absolute', bottom:0, right:0, width:16, height:16, cursor:'se-resize',
          background:'linear-gradient(135deg, transparent 50%, var(--border2) 50%)',
          borderRadius:'0 0 var(--radius) 0',
        }}/>
      )}
    </div>
  );
}
