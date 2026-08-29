import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { initDB, getDB, getFilesDir } from './db.js';
import { callAI } from './ai.js';
import { v4 as uuid } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

await initDB();

// ── File upload config ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, getFilesDir()),
  filename:    (req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── HEALTH ──────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// ─── AI STATUS ───────────────────────────────────────────
app.get('/api/ai/status', async (req, res) => {
  const hasKey = !!(process.env.ANTHROPIC_API_KEY);
  const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  let ollamaOk = false;
  let ollamaModels = [];
  try {
    const r = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const data = await r.json();
      ollamaOk = true;
      ollamaModels = (data.models || []).map(m => m.name);
    }
  } catch {}
  res.json({ claude: hasKey, ollama: ollamaOk, ollamaModels, provider: process.env.AI_PROVIDER || 'auto' });
});

// ─── PROJECTS ─────────────────────────────────────────────
app.get('/api/projects', (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
  res.json(rows.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') })));
});
app.post('/api/projects', (req, res) => {
  const db = getDB();
  const { title, description, status = 'active', priority = 'medium', deadline, tags = [] } = req.body;
  const id = uuid(); const now = new Date().toISOString();
  db.prepare(`INSERT INTO projects (id, title, description, status, priority, deadline, tags, progress, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`)
    .run(id, title, description || '', status, priority, deadline || null, JSON.stringify(tags), now, now);
  logActivity('project_created', `Created project: ${title}`);
  res.json({ id });
});
app.put('/api/projects/:id', (req, res) => {
  const db = getDB();
  const { title, description, status, priority, deadline, tags, progress, notes } = req.body;
  const now = new Date().toISOString();
  db.prepare(`UPDATE projects SET title=COALESCE(?,title), description=COALESCE(?,description), status=COALESCE(?,status), priority=COALESCE(?,priority), deadline=COALESCE(?,deadline), tags=COALESCE(?,tags), progress=COALESCE(?,progress), notes=COALESCE(?,notes), updated_at=? WHERE id=?`)
    .run(title, description, status, priority, deadline, tags ? JSON.stringify(tags) : null, progress, notes, now, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/projects/:id', (req, res) => {
  getDB().prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});
app.post('/api/projects/:id/analyze', async (req, res) => {
  const project = getDB().prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const prompt = `Analyze this project and give brutally honest, specific next actions.\nProject: ${project.title}\nDescription: ${project.description}\nStatus: ${project.status} | Priority: ${project.priority} | Progress: ${project.progress}%\nNotes: ${project.notes || 'None'}\nRespond ONLY as JSON: {"health":"good","summary":"2 sentences","next_actions":["action 1","action 2","action 3"],"risks":["risk 1"],"opportunities":["opp 1"]}`;
  const result = await callAI(prompt, true);
  res.json(result);
});

// ─── TASKS ────────────────────────────────────────────────
app.get('/api/tasks', (req, res) => {
  const { project_id, status } = req.query;
  let q = 'SELECT * FROM tasks WHERE 1=1'; const params = [];
  if (project_id) { q += ' AND project_id=?'; params.push(project_id); }
  if (status) { q += ' AND status=?'; params.push(status); }
  q += ' ORDER BY priority DESC, due_date ASC';
  res.json(getDB().prepare(q).all(...params));
});
app.post('/api/tasks', (req, res) => {
  const { title, project_id, status = 'todo', priority = 'medium', due_date, notes } = req.body;
  const id = uuid(); const now = new Date().toISOString();
  getDB().prepare('INSERT INTO tasks (id, title, project_id, status, priority, due_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, title, project_id || null, status, priority, due_date || null, notes || '', now);
  res.json({ id });
});
app.put('/api/tasks/:id', (req, res) => {
  const { title, status, priority, due_date, notes } = req.body;
  getDB().prepare('UPDATE tasks SET title=COALESCE(?,title), status=COALESCE(?,status), priority=COALESCE(?,priority), due_date=COALESCE(?,due_date), notes=COALESCE(?,notes) WHERE id=?')
    .run(title, status, priority, due_date, notes, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/tasks/:id', (req, res) => {
  getDB().prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── CONTENT ─────────────────────────────────────────────
app.get('/api/content', (req, res) => {
  res.json(getDB().prepare('SELECT * FROM content ORDER BY created_at DESC').all()
    .map(r => { let h; try { h = Array.isArray(r.hashtags) ? r.hashtags : JSON.parse(r.hashtags || '[]'); } catch { h = []; } return { ...r, hashtags: h }; }));
});
app.post('/api/content', (req, res) => {
  const { platform, angle, title, content, hashtags = [], cta, status = 'ready' } = req.body;
  const id = uuid(); const now = new Date().toISOString();
  getDB().prepare('INSERT INTO content (id, platform, angle, title, content, hashtags, cta, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, platform, angle, title, content, JSON.stringify(hashtags), cta || '', status, now);
  res.json({ id });
});
app.put('/api/content/:id', (req, res) => {
  const { title, content, status, hashtags, cta } = req.body;
  getDB().prepare('UPDATE content SET title=COALESCE(?,title), content=COALESCE(?,content), status=COALESCE(?,status), hashtags=COALESCE(?,hashtags), cta=COALESCE(?,cta) WHERE id=?')
    .run(title, content, status, hashtags ? JSON.stringify(hashtags) : null, cta, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/content/:id', (req, res) => {
  getDB().prepare('DELETE FROM content WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});
app.post('/api/content/generate', async (req, res) => {
  const { platform, angle, context } = req.body;
  const kbFiles = getDB().prepare('SELECT original_name, content FROM knowledge_files ORDER BY created_at DESC LIMIT 5').all();
  const kbContext = kbFiles.length > 0 ? `\nKnowledge base context:\n${kbFiles.map(f=>`${f.original_name}: ${f.content.substring(0,400)}`).join('\n')}` : '';
  const prompt = `Generate a ${platform} post about: ${angle}.\nContext: ${context || 'none'}${kbContext}\nRespond ONLY as JSON: {"title":"headline","content":"full post text","hashtags":["tag1","tag2"],"cta":"call to action"}`;
  const result = await callAI(prompt, true);
  res.json(result);
});
async function autoFillContentQueue() {
  const db = getDB();
  const count = db.prepare("SELECT COUNT(*) as c FROM content WHERE status='ready'").get().c;
  if (count >= 3) return;
  const ideas = db.prepare('SELECT title, category FROM ideas ORDER BY created_at DESC LIMIT 10').all();
  const kbFiles = db.prepare('SELECT original_name, content FROM knowledge_files LIMIT 3').all();
  const kbContext = kbFiles.length > 0 ? `\nKnowledge base:\n${kbFiles.map(f=>`${f.original_name}: ${f.content.substring(0,300)}`).join('\n')}` : '';
  const platforms = ['LinkedIn','Twitter','Newsletter'];
  const platform = platforms[Math.floor(Math.random()*platforms.length)];
  const prompt = `Generate a ${platform} post based on these ideas: ${JSON.stringify(ideas)}${kbContext}\nRespond ONLY as JSON array with 2 posts: [{"platform":"${platform}","angle":"topic angle","title":"headline","content":"post text","hashtags":["tag"],"cta":"action","status":"ready"}]`;
  const result = await callAI(prompt, true);
  const posts = Array.isArray(result) ? result : [];
  const insert = db.prepare('INSERT INTO content (id, platform, angle, title, content, hashtags, cta, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const now = new Date().toISOString();
  for (const p of posts.slice(0,2)) {
    if (p.title && p.content) insert.run(uuid(), p.platform||platform, p.angle||'', p.title, p.content, JSON.stringify(p.hashtags||[]), p.cta||'', 'ready', now);
  }
}
app.post('/api/content/autofill', async (req, res) => {
  res.json({ ok: true });
  autoFillContentQueue().catch(console.error);
});

// ─── IDEAS ───────────────────────────────────────────────
app.get('/api/ideas', (req, res) => {
  const { q } = req.query;
  const db = getDB();
  if (q) return res.json(db.prepare('SELECT * FROM ideas WHERE title LIKE ? OR body LIKE ? ORDER BY created_at DESC').all(`%${q}%`, `%${q}%`));
  res.json(db.prepare('SELECT * FROM ideas ORDER BY created_at DESC').all());
});
app.post('/api/ideas', (req, res) => {
  const { title, body, category } = req.body;
  const id = uuid(); const now = new Date().toISOString();
  getDB().prepare('INSERT INTO ideas (id, title, body, category, created_at) VALUES (?, ?, ?, ?, ?)').run(id, title, body || '', category || 'general', now);
  res.json({ id });
});
// Import .md file as idea
app.post('/api/ideas/import-md', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const content = readFileSync(req.file.path, 'utf8');
  const title = req.body.title || req.file.originalname.replace('.md','').replace(/-/g,' ');
  const id = uuid(); const now = new Date().toISOString();
  getDB().prepare('INSERT INTO ideas (id, title, body, category, created_at) VALUES (?, ?, ?, ?, ?)').run(id, title, content, req.body.category || 'imported', now);
  res.json({ id, title });
});
app.put('/api/ideas/:id', (req, res) => {
  const { title, body, category } = req.body;
  getDB().prepare('UPDATE ideas SET title=COALESCE(?,title), body=COALESCE(?,body), category=COALESCE(?,category) WHERE id=?')
    .run(title || null, body ?? null, category || null, req.params.id);
  res.json({ ok: true });
});

app.post('/api/ideas/:id/expand', async (req, res) => {
  const idea = getDB().prepare('SELECT * FROM ideas WHERE id=?').get(req.params.id);
  if (!idea) return res.status(404).json({ error: 'Not found' });
  const kbContext = getDB().prepare('SELECT original_name, content FROM knowledge_files LIMIT 3').all()
    .map(f=>`${f.original_name}: ${f.content.substring(0,300)}`).join('\n');
  const prompt = `Expand this idea into a detailed, actionable concept.\nIdea: ${idea.title}\nNotes: ${idea.body || 'none'}\n${kbContext ? `Context from knowledge base:\n${kbContext}` : ''}\nRespond ONLY as JSON: {"expanded":"detailed concept","category":"product","effort":"medium","potential":"high","first_step":"one specific action this week"}`;
  const result = await callAI(prompt, true);
  getDB().prepare('UPDATE ideas SET expanded=?, category=COALESCE(?,category) WHERE id=?').run(result.expanded || result.raw, result.category, idea.id);
  res.json(result);
});
app.delete('/api/ideas/:id', (req, res) => {
  getDB().prepare('DELETE FROM ideas WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── KNOWLEDGE BASE (text entries) ───────────────────────
app.get('/api/knowledge', (req, res) => {
  const { q } = req.query; const db = getDB();
  if (q) return res.json(db.prepare('SELECT * FROM knowledge WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC').all(`%${q}%`, `%${q}%`));
  res.json(db.prepare('SELECT * FROM knowledge ORDER BY created_at DESC').all());
});
app.post('/api/knowledge', (req, res) => {
  const { title, content, tags = [], source } = req.body;
  const id = uuid(); const now = new Date().toISOString();
  getDB().prepare('INSERT INTO knowledge (id, title, content, tags, source, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, title, content, JSON.stringify(tags), source || '', now);
  res.json({ id });
});
app.delete('/api/knowledge/:id', (req, res) => {
  getDB().prepare('DELETE FROM knowledge WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── KNOWLEDGE FILES (persistent .md/.txt/.pdf uploads) ──
app.get('/api/knowledge-files', (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT id, filename, original_name, size, tags, source, created_at FROM knowledge_files ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') })));
});

app.post('/api/knowledge-files/upload', upload.array('files', 20), async (req, res) => {
  const db = getDB();
  const now = new Date().toISOString();
  const saved = [];

  for (const file of (req.files || [])) {
    const ext = extname(file.originalname).toLowerCase();
    let content = '';
    try {
      if (['.txt','.md','.csv','.json'].includes(ext)) {
        content = readFileSync(file.path, 'utf8');
      } else {
        // For PDFs and binary: store filename + note
        content = `[Binary file: ${file.originalname}. Size: ${file.size} bytes. Process with Ollama for full extraction.]`;
      }
    } catch { content = '[Could not read file content]'; }

    const id = uuid();
    db.prepare('INSERT INTO knowledge_files (id, filename, original_name, content, size, tags, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, file.filename, file.originalname, content, file.size, '[]', 'upload', now);
    saved.push({ id, name: file.originalname, size: file.size });
  }
  logActivity('kb_upload', `Uploaded ${saved.length} file(s) to knowledge base`);
  res.json({ saved, count: saved.length });
});

app.get('/api/knowledge-files/:id/content', (req, res) => {
  const row = getDB().prepare('SELECT * FROM knowledge_files WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

app.delete('/api/knowledge-files/:id', (req, res) => {
  getDB().prepare('DELETE FROM knowledge_files WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── BOARDROOM QUERY (Ollama powered) ───────────────────
app.post('/api/boardroom/query', async (req, res) => {
  const { question, model, transcripts = [], selectedKBFileIds } = req.body;
  const db = getDB();
  const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  const ollamaModel = model || process.env.OLLAMA_MODEL || 'llama3.1:latest';

  // Load only selected knowledge files (or all if none specified)
  let kbFiles;
  if (selectedKBFileIds && selectedKBFileIds.length > 0) {
    const placeholders = selectedKBFileIds.map(() => '?').join(',');
    kbFiles = db.prepare(`SELECT original_name, content FROM knowledge_files WHERE id IN (${placeholders}) ORDER BY created_at DESC`).all(...selectedKBFileIds);
  } else {
    kbFiles = db.prepare('SELECT original_name, content FROM knowledge_files ORDER BY created_at DESC').all();
  }
  const kbText = kbFiles.length > 0
    ? kbFiles.map(f => `FILE: ${f.original_name}\n${f.content.substring(0, 600)}`).join('\n\n')
    : '';

  // Transcripts from request
  const txText = transcripts.length > 0
    ? transcripts.map(t => `TRANSCRIPT [${t.name}]:\n${t.content.substring(0, 800)}`).join('\n\n')
    : '';

  const hasData = kbText || txText;

  const system = `You are EVA's boardroom intelligence module. A CEO is asking a business question.
${kbText ? `\nPERSISTENT KNOWLEDGE BASE FILES:\n${kbText}\n` : ''}
${txText ? `\nMEETING TRANSCRIPTS (uploaded this session):\n${txText}\n` : ''}
${!hasData ? '\nNo documents loaded. Answer based on general business knowledge and label it as such.' : ''}

CRITICAL RULES:
1. Use ONLY data found in the knowledge base files or transcripts above to populate financial figures.
2. If you cannot find specific numbers, say "Data not found in loaded documents" — do NOT invent numbers.
3. Label where each insight comes from: e.g. "(from: financial-report.pdf)" or "(from: meeting-transcript.md)"
4. KPI tiles should only show real numbers extracted from documents. If no real numbers found, set showKPIs to false.

Respond ONLY with valid JSON, no markdown:
{
  "title": "Report title (5-8 words)",
  "subtitle": "One sentence summary",
  "insight": "2-3 sharp executive sentences with source labels in brackets",
  "charts": ["2-3 from: revenue, departments, pipeline, radar, cashflow"],
  "showKPIs": false,
  "kpis": [],
  "dataSource": "brief description of which files were used"
}

If real KPI data IS found in documents, populate kpis array:
"kpis": [{"label":"Metric Name","value":"$X.XM","change":"+X%","up":true,"source":"filename.pdf"}]`;

  try {
    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel, stream: false,
        messages: [{ role: 'system', content: system }, { role: 'user', content: question }],
        options: { temperature: 0.2, num_predict: 800 },
      }),
    });
    if (!r.ok) throw new Error(`Ollama ${r.status}`);
    const data = await r.json();
    const raw  = data.message?.content || '';
    const match = raw.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
    const result = match ? JSON.parse(match[0]) : { error: 'parse_failed', raw };
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI INSIGHTS ─────────────────────────────────────────
app.get('/api/insights', (req, res) => {
  res.json(getDB().prepare('SELECT * FROM insights ORDER BY created_at DESC LIMIT 20').all());
});
app.post('/api/insights/generate', async (req, res) => {
  const db = getDB();
  const projects = db.prepare('SELECT title, status, progress, priority, notes FROM projects LIMIT 10').all();
  const tasks = db.prepare("SELECT title, status, priority FROM tasks WHERE status != 'done' LIMIT 20").all();
  const ideas = db.prepare('SELECT title, category FROM ideas ORDER BY created_at DESC LIMIT 10').all();
  const kbFiles = db.prepare('SELECT original_name FROM knowledge_files LIMIT 5').all();
  const prompt = `Analyze this data and give 5 specific, actionable insights.\nPROJECTS: ${JSON.stringify(projects)}\nTASKS: ${JSON.stringify(tasks)}\nIDEAS: ${JSON.stringify(ideas)}\nKB FILES: ${JSON.stringify(kbFiles)}\nRespond ONLY as JSON array: [{"type":"opportunity","title":"headline","body":"2-3 sentences","priority":"high"}]`;
  const result = await callAI(prompt, true);
  const insights = Array.isArray(result) ? result : (result.insights || []);
  const now = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
  db.prepare('DELETE FROM insights WHERE created_at < ?').run(weekAgo);
  const insert = db.prepare('INSERT INTO insights (id, type, title, body, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  for (const ins of insights.slice(0, 5)) insert.run(uuid(), ins.type || 'action', ins.title, ins.body, ins.priority || 'medium', now);
  res.json({ count: insights.length, insights });
});

// ─── DAILY BRIEF ─────────────────────────────────────────
function getSettings() {
  const rows = getDB().prepare('SELECT key, value FROM settings').all();
  const s = {}; rows.forEach(r => { s[r.key] = r.value; }); return s;
}
async function generateBrief() {
  const db = getDB();
  const projects  = db.prepare("SELECT title, status, progress, priority, deadline FROM projects WHERE status='active' LIMIT 5").all();
  const tasks     = db.prepare("SELECT title, priority, due_date FROM tasks WHERE status='todo' ORDER BY priority DESC LIMIT 10").all();
  const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString();
  const doneTasks = db.prepare("SELECT title FROM tasks WHERE status='done' AND created_at > ? LIMIT 5").all(yesterday);
  const content   = db.prepare("SELECT platform, title FROM content WHERE status='ready' LIMIT 5").all();
  const kbCount   = db.prepare('SELECT COUNT(*) as c FROM knowledge_files').get().c;
  const settings  = getSettings();
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const prompt = `Generate a sharp executive morning brief for ${settings.name || 'the executive'} from EVA.\nTODAY: ${today}\nPROJECTS: ${JSON.stringify(projects)}\nTASKS: ${JSON.stringify(tasks)}\nDONE YESTERDAY: ${JSON.stringify(doneTasks)}\nCONTENT READY: ${JSON.stringify(content)}\nKB FILES: ${kbCount} documents loaded\nRespond ONLY as JSON: {"greeting":"string","focus":"string","priorities":["p1","p2","p3"],"yesterday_summary":"string","warnings":["w1"],"content_ready":["c1"],"quote":"string"}`;
  const result = await callAI(prompt, true);
  if (result && !result.error && result.greeting) {
    // Normalize content_ready to always be strings, not objects
    if (Array.isArray(result.content_ready)) {
      result.content_ready = result.content_ready.map(c => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object') return (c.platform ? c.platform + ': ' : '') + (c.title || 'Content ready');
        return String(c);
      });
    }
    const now = new Date().toISOString();
    const today2 = new Date().toISOString().split('T')[0];
    db.prepare('DELETE FROM briefs WHERE date=?').run(today2);
    db.prepare('INSERT INTO briefs (id, date, content, created_at) VALUES (?, ?, ?, ?)').run(uuid(), today2, JSON.stringify(result), now);
    return result;
  }
  return null;
}
app.get('/api/brief/today', async (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];
  const cached = db.prepare("SELECT * FROM briefs WHERE date=? ORDER BY created_at DESC LIMIT 1").get(today);
  if (cached && !req.query.refresh) return res.json(JSON.parse(cached.content));
  const result = await generateBrief();
  if (result) return res.json(result);
  res.json({ error:'no_ai', greeting:`Good morning! Today is ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}.`, focus:'Set up Ollama or add ANTHROPIC_API_KEY to .env', priorities:[], warnings:['No AI configured'], content_ready:[], yesterday_summary:'' });
});

// ─── ACTIVITY ────────────────────────────────────────────
function logActivity(type, description) {
  getDB().prepare('INSERT INTO activity (id, type, description, created_at) VALUES (?, ?, ?, ?)').run(uuid(), type, description, new Date().toISOString());
}
app.get('/api/activity', (req, res) => {
  res.json(getDB().prepare('SELECT * FROM activity ORDER BY created_at DESC LIMIT 30').all());
});

// ─── SEARCH ──────────────────────────────────────────────
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ results: [] });
  const term = `%${q}%`; const db = getDB(); const results = [];
  db.prepare('SELECT id, title, status FROM projects WHERE title LIKE ? LIMIT 5').all(term).forEach(r=>results.push({...r,type:'project'}));
  db.prepare('SELECT id, title FROM tasks WHERE title LIKE ? LIMIT 5').all(term).forEach(r=>results.push({...r,type:'task'}));
  db.prepare('SELECT id, title, platform FROM content WHERE title LIKE ? LIMIT 5').all(term).forEach(r=>results.push({...r,type:'content'}));
  db.prepare('SELECT id, title FROM ideas WHERE title LIKE ? OR body LIKE ? LIMIT 5').all(term,term).forEach(r=>results.push({...r,type:'idea'}));
  db.prepare('SELECT id, title FROM knowledge WHERE title LIKE ? LIMIT 5').all(term).forEach(r=>results.push({...r,type:'knowledge'}));
  db.prepare('SELECT id, original_name as title FROM knowledge_files WHERE original_name LIKE ? OR content LIKE ? LIMIT 5').all(term,term).forEach(r=>results.push({...r,type:'kb_file'}));
  res.json({ results });
});

// ─── SETTINGS ────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const rows = getDB().prepare('SELECT key, value FROM settings').all();
  const s = {}; rows.forEach(r => { s[r.key] = r.value; }); res.json(s);
});
app.put('/api/settings', (req, res) => {
  const upsert = getDB().prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const [k,v] of Object.entries(req.body)) upsert.run(k, String(v));
  res.json({ ok: true });
});

// ─── BACKGROUND AI OPERATIONS (controllable) ─────────────
let aiRunning = true;
let bgInterval = null;

function startBackgroundAI() {
  if (bgInterval) return;
  bgInterval = setInterval(async () => {
    if (!aiRunning) return;
    if (new Date().getHours() === 6) {
      console.log('[EVA] Running scheduled morning tasks...');
      await generateBrief().catch(e => console.error('[EVA] Brief:', e.message));
      await autoFillContentQueue().catch(e => console.error('[EVA] Content:', e.message));
    }
  }, 60*60*1000);
  console.log('[EVA] Background AI operations started');
}

function stopBackgroundAI() {
  if (bgInterval) { clearInterval(bgInterval); bgInterval = null; }
  aiRunning = false;
  console.log('[EVA] Background AI operations stopped');
}

// Toggle endpoint — called by Sidebar button
app.post('/api/ai/toggle', (req, res) => {
  const { running } = req.body;
  if (running) {
    aiRunning = true;
    startBackgroundAI();
    res.json({ running: true, message: 'Background AI operations resumed' });
  } else {
    stopBackgroundAI();
    res.json({ running: false, message: 'Background AI operations stopped — manual queries still work' });
  }
});

app.get('/api/ai/toggle', (req, res) => {
  res.json({ running: aiRunning });
});

// ─── STARTUP ─────────────────────────────────────────────
startBackgroundAI();
setTimeout(async () => {
  if (!aiRunning) return;
  console.log('[EVA] Running startup AI tasks...');
  try { await generateBrief(); } catch(e) { console.error('[EVA] Brief:', e.message); }
  try { await autoFillContentQueue(); } catch(e) { console.error('[EVA] Content:', e.message); }
}, 8000);

app.listen(4000, () => console.log('[EVA] Backend :4000'));

// ─── METRICS ──────────────────────────────────────────────────────────────────
app.get('/api/metrics', (req, res) => {
  const { category } = req.query;
  const db = getDB();
  let rows = category
    ? db.prepare('SELECT * FROM metrics WHERE category=? ORDER BY period_date DESC').all(category)
    : db.prepare('SELECT * FROM metrics ORDER BY period_date DESC').all();

  // Group by name for charting
  const grouped = {};
  for (const m of rows) {
    if (!grouped[m.name]) grouped[m.name] = [];
    grouped[m.name].push({ value: m.value, period: m.period, unit: m.unit, category: m.category, date: m.period_date });
  }
  const categories = [...new Set(rows.map(m => m.category))];
  res.json({ metrics: rows.slice(0, 50), grouped, categories });
});

app.post('/api/metrics', (req, res) => {
  const { name, category = 'finance', value, unit = '', period = '', period_date } = req.body;
  const id = uuid(); const now = new Date().toISOString();
  getDB().prepare('INSERT INTO metrics (id, name, category, value, unit, period, period_date, created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, name, category, value, unit, period, period_date || null, now);
  res.json({ id });
});

app.put('/api/metrics/:id', (req, res) => {
  const { name, category, value, unit, period, period_date } = req.body;
  getDB().prepare('UPDATE metrics SET name=COALESCE(?,name), category=COALESCE(?,category), value=COALESCE(?,value), unit=COALESCE(?,unit), period=COALESCE(?,period), period_date=COALESCE(?,period_date) WHERE id=?')
    .run(name, category, value, unit, period, period_date, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/metrics/:id', (req, res) => {
  getDB().prepare('DELETE FROM metrics WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── STRATEGY SESSIONS ────────────────────────────────────────────────────────
app.get('/api/strategy', (req, res) => {
  const rows = getDB().prepare('SELECT * FROM strategy_sessions ORDER BY updated_at DESC LIMIT 20').all();
  res.json(rows.map(r => ({ ...r, messages: JSON.parse(r.messages || '[]'), insights: JSON.parse(r.insights || '[]') })));
});

app.post('/api/strategy', (req, res) => {
  const { title = 'New Strategy Session', context = '' } = req.body;
  const id = uuid(); const now = new Date().toISOString();
  getDB().prepare('INSERT INTO strategy_sessions (id, title, context, status, messages, insights, roi_total, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, title, context, 'active', '[]', '[]', 0, now, now);
  res.json({ id, title, context, status: 'active', messages: [], insights: [], roi_total: 0, created_at: now });
});

app.get('/api/strategy/:id', (req, res) => {
  const row = getDB().prepare('SELECT * FROM strategy_sessions WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, messages: JSON.parse(row.messages || '[]'), insights: JSON.parse(row.insights || '[]') });
});

app.post('/api/strategy/:id/message', async (req, res) => {
  const { message, model } = req.body;
  const db = getDB();
  const session = db.prepare('SELECT * FROM strategy_sessions WHERE id=?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });

  const messages = JSON.parse(session.messages || '[]');
  messages.push({ role: 'user', content: message });

  const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  const ollamaModel = model || process.env.OLLAMA_MODEL || 'llama3.1:latest';

  const system = `You are EVA's strategy consultant module. Run a structured consulting session to surface operational bottlenecks, quantify them in dollars, and produce actionable roadmaps.

When the user describes a business situation:
1. Ask targeted follow-up questions to understand the bottleneck fully
2. Probe for: time wasted, frequency, departments involved, cost impact
3. After 2-3 exchanges, identify specific AI/automation opportunities
4. Always quantify: "~X hours/week lost = ~$Y/year"
5. Suggest concrete fixes: RPA, workflow automation, AI agents, integrations

Be direct, specific, and conversational. Ask one focused question at a time.`;

  try {
    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel, stream: false,
        messages: [{ role: 'system', content: system }, ...messages],
        options: { temperature: 0.7, num_predict: 800 },
      }),
    });
    const data = await r.json();
    const reply = data.message?.content || 'No response';
    messages.push({ role: 'assistant', content: reply });
    const now = new Date().toISOString();
    db.prepare('UPDATE strategy_sessions SET messages=?, updated_at=? WHERE id=?')
      .run(JSON.stringify(messages), now, req.params.id);
    res.json({ reply, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/strategy/:id/extract-insights', async (req, res) => {
  const { model } = req.body;
  const db = getDB();
  const session = db.prepare('SELECT * FROM strategy_sessions WHERE id=?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });

  const messages = JSON.parse(session.messages || '[]');
  const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  const ollamaModel = model || process.env.OLLAMA_MODEL || 'llama3.1:latest';

  const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
  const prompt = `Based on this consulting session conversation, extract structured insights.\n\nCONVERSATION:\n${conversation}\n\nRespond ONLY with valid JSON:\n{"insights":[{"title":"...","description":"...","department":"...","priority":"high|medium|low","roi_estimate":150000,"hours_saved":260,"fix":"..."}],"roadmap":["Step 1...","Step 2..."],"roi_total":500000}`;

  try {
    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel, stream: false,
        messages: [{ role: 'user', content: prompt }],
        options: { temperature: 0.2, num_predict: 1200 },
      }),
    });
    const data = await r.json();
    const raw = (data.message?.content || '').replace(/```json|```/g, '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    const result = match ? JSON.parse(match[0]) : { insights: [], roadmap: [], roi_total: 0 };

    // Save insights to nexus_insights table
    const now = new Date().toISOString();
    const insertInsight = db.prepare('INSERT INTO nexus_insights (id, title, description, department, priority, roi_estimate, hours_saved, status, session_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
    for (const ins of (result.insights || [])) {
      insertInsight.run(uuid(), ins.title, ins.description || '', ins.department || '', ins.priority || 'medium', ins.roi_estimate || 0, ins.hours_saved || 0, 'identified', session.id, now);
    }

    // Update session
    db.prepare('UPDATE strategy_sessions SET insights=?, roi_total=?, updated_at=? WHERE id=?')
      .run(JSON.stringify(result.insights || []), result.roi_total || 0, now, session.id);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/strategy/:id', (req, res) => {
  getDB().prepare('DELETE FROM strategy_sessions WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── NEXUS INSIGHTS ────────────────────────────────────────────────────────────
app.get('/api/nexus-insights', (req, res) => {
  const { status, department } = req.query;
  const db = getDB();
  let q = 'SELECT * FROM nexus_insights WHERE 1=1';
  const params = [];
  if (status) { q += ' AND status=?'; params.push(status); }
  if (department) { q += ' AND department=?'; params.push(department); }
  q += ' ORDER BY roi_estimate DESC LIMIT 50';
  const rows = db.prepare(q).all(...params);
  const totalRoi = rows.reduce((s, r) => s + (r.roi_estimate || 0), 0);
  const totalHours = rows.reduce((s, r) => s + (r.hours_saved || 0), 0);
  res.json({ insights: rows, total_roi: totalRoi, total_hours: totalHours });
});

app.post('/api/nexus-insights', (req, res) => {
  const { title, description = '', department = '', priority = 'medium', roi_estimate = 0, hours_saved = 0, status = 'identified', session_id } = req.body;
  const id = uuid(); const now = new Date().toISOString();
  getDB().prepare('INSERT INTO nexus_insights (id, title, description, department, priority, roi_estimate, hours_saved, status, session_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(id, title, description, department, priority, roi_estimate, hours_saved, status, session_id || null, now);
  res.json({ id });
});

app.put('/api/nexus-insights/:id', (req, res) => {
  const { status, priority, roi_estimate, hours_saved } = req.body;
  getDB().prepare('UPDATE nexus_insights SET status=COALESCE(?,status), priority=COALESCE(?,priority), roi_estimate=COALESCE(?,roi_estimate), hours_saved=COALESCE(?,hours_saved) WHERE id=?')
    .run(status, priority, roi_estimate, hours_saved, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/nexus-insights/:id', (req, res) => {
  getDB().prepare('DELETE FROM nexus_insights WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── DOCUMENT CHAT ─────────────────────────────────────────────────────────────
app.post('/api/chat/ask', async (req, res) => {
  const { message, history = [], model, selectedKBFileIds } = req.body;
  const db = getDB();
  const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  const ollamaModel = model || process.env.OLLAMA_MODEL || 'llama3.1:latest';

  // Load selected KB files
  let kbFiles;
  if (selectedKBFileIds?.length > 0) {
    const placeholders = selectedKBFileIds.map(() => '?').join(',');
    kbFiles = db.prepare(`SELECT original_name, content FROM knowledge_files WHERE id IN (${placeholders})`).all(...selectedKBFileIds);
  } else {
    kbFiles = db.prepare('SELECT original_name, content FROM knowledge_files ORDER BY created_at DESC LIMIT 6').all();
  }

  const contextParts = kbFiles.map(f => `Document: ${f.original_name}\n${(f.content || '').substring(0, 2000)}`);

  const system = `You are EVA's document intelligence assistant. Answer questions based on the company documents provided. Be specific, cite document names when relevant, and focus on actionable insights.

${contextParts.length > 0 ? `COMPANY DOCUMENTS:\n${contextParts.join('\n\n---\n\n')}` : 'No documents loaded. Ask the user to upload files to the Knowledge Base.'}`;

  const messages = [...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: message }];

  try {
    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel, stream: false,
        messages: [{ role: 'system', content: system }, ...messages],
        options: { temperature: 0.4, num_predict: 1000 },
      }),
    });
    const data = await r.json();
    res.json({ reply: data.message?.content || 'No response', model: ollamaModel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WATCH FOLDERS ─────────────────────────────────────────────────────────────
const watchedFolders = {};

app.get('/api/watch/folders', (req, res) => {
  const rows = getDB().prepare('SELECT * FROM watch_folders ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({ ...r, running: !!watchedFolders[r.path] })));
});

app.post('/api/watch/folder', (req, res) => {
  const { path: folderPath, label = '' } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'path required' });
  const id = uuid(); const now = new Date().toISOString();
  try {
    getDB().prepare('INSERT OR IGNORE INTO watch_folders (id, path, label, active, created_at) VALUES (?,?,?,1,?)').run(id, folderPath, label || folderPath.split('/').pop(), now);
    res.json({ ok: true, message: `Watching: ${folderPath}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/watch/folder/:id', (req, res) => {
  const row = getDB().prepare('SELECT path FROM watch_folders WHERE id=?').get(req.params.id);
  if (row) delete watchedFolders[row.path];
  getDB().prepare('DELETE FROM watch_folders WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/watch/scan-now', async (req, res) => {
  const folders = getDB().prepare('SELECT * FROM watch_folders WHERE active=1').all();
  const db = getDB();
  let newFiles = 0;
  const { readFileSync, readdirSync, statSync, existsSync } = await import('fs');
  const { join: pathJoin, extname } = await import('path');

  const SUPPORTED = ['.pdf','.docx','.doc','.xlsx','.xls','.csv','.txt','.md','.json'];

  for (const folder of folders) {
    if (!existsSync(folder.path)) continue;
    try {
      const files = readdirSync(folder.path);
      for (const file of files) {
        const ext = extname(file).toLowerCase();
        if (!SUPPORTED.includes(ext)) continue;
        const fullPath = pathJoin(folder.path, file);
        const stat = statSync(fullPath);
        // Check if already imported
        const exists = db.prepare('SELECT id FROM knowledge_files WHERE original_name=? AND size=?').get(file, stat.size);
        if (exists) continue;
        // Read text files
        let content = '';
        if (['.txt','.md','.csv','.json'].includes(ext)) {
          try { content = readFileSync(fullPath, 'utf8'); } catch {}
        } else {
          content = `[Binary file: ${file} — ${(stat.size/1024).toFixed(1)}KB. Upload to Knowledge Base for AI extraction.]`;
        }
        const id = uuid(); const now = new Date().toISOString();
        db.prepare('INSERT INTO knowledge_files (id, filename, original_name, content, size, tags, source, created_at) VALUES (?,?,?,?,?,?,?,?)')
          .run(id, file, file, content, stat.size, '[]', `watch:${folder.path}`, now);
        newFiles++;
      }
      db.prepare('UPDATE watch_folders SET last_scan=?, file_count=? WHERE id=?').run(new Date().toISOString(), files.length, folder.id);
    } catch {}
  }
  res.json({ ok: true, new_files: newFiles, folders_scanned: folders.length });
});

// ─── DOCUMENT AUTO-CATEGORIZE ──────────────────────────────────────────────────
app.post('/api/knowledge-files/:id/categorize', async (req, res) => {
  const db = getDB();
  const file = db.prepare('SELECT * FROM knowledge_files WHERE id=?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'Not found' });

  const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:latest';

  const TAXONOMY = {
    Finance: ['Financial Statements','Budgets','Forecasts','Tax','Invoices','Payroll','Audits'],
    Legal: ['Contracts','Compliance','IP','Litigation','Regulations'],
    Operations: ['Processes','Supply Chain','Logistics','Quality','SOPs'],
    HR: ['Recruitment','Performance','Policies','Training','Benefits'],
    'Sales & Marketing': ['Proposals','CRM Data','Campaigns','Market Research','Pricing'],
    Technology: ['Architecture','Security','Development','Infrastructure','Data'],
    Strategy: ['Business Plans','Due Diligence','M&A','Investor Relations','Competitive Analysis'],
    Correspondence: ['Emails','Meeting Notes','Reports','Memos','Presentations'],
  };

  const taxonomyStr = Object.entries(TAXONOMY).map(([k,v]) => `  ${k}: ${v.join(', ')}`).join('\n');
  const excerpt = (file.content || '').split(' ').slice(0, 600).join(' ');

  const prompt = `Classify this document. TAXONOMY:\n${taxonomyStr}\n\nFILENAME: ${file.original_name}\nEXCERPT: ${excerpt}\n\nRespond ONLY with JSON: {"category":"Finance","subcategory":"Budgets","confidence":0.9,"summary":"One sentence","tags":["tag1","tag2","tag3"]}`;

  try {
    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel, stream: false,
        messages: [{ role: 'user', content: prompt }],
        options: { temperature: 0.1, num_predict: 200 },
      }),
    });
    const data = await r.json();
    const raw = (data.message?.content || '').replace(/```json|```/g,'').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    const result = match ? JSON.parse(match[0]) : { category:'Uncategorized', subcategory:'General', confidence:0, summary:'', tags:[] };

    db.prepare('UPDATE knowledge_files SET tags=? WHERE id=?').run(JSON.stringify(result.tags || []), file.id);
    res.json({ ...result, id: file.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/knowledge-files/categorize-all', async (req, res) => {
  res.json({ ok: true, message: 'Categorization started in background' });
  const db = getDB();
  const files = db.prepare("SELECT * FROM knowledge_files WHERE tags='[]' OR tags IS NULL LIMIT 20").all();
  for (const file of files) {
    try {
      await fetch(`http://localhost:4000/api/knowledge-files/${file.id}/categorize`, { method: 'POST' });
      await new Promise(r => setTimeout(r, 1000));
    } catch {}
  }
});

// ─── BOARD ────────────────────────────────────────────────────────────────────
function boardBoxWithItems(db, id) {
  const box = db.prepare('SELECT * FROM board_boxes WHERE id=?').get(id);
  if (!box) return null;
  box.items = db.prepare('SELECT * FROM board_items WHERE box_id=? ORDER BY sort_order ASC, created_at ASC').all(id);
  return box;
}

app.get('/api/board/boxes', (req, res) => {
  const db = getDB();
  const boxes = db.prepare('SELECT * FROM board_boxes ORDER BY z_index ASC, created_at ASC').all();
  const result = boxes.map(b => ({
    ...b,
    items: db.prepare('SELECT * FROM board_items WHERE box_id=? ORDER BY sort_order ASC').all(b.id),
  }));
  res.json(result);
});

app.post('/api/board/boxes', (req, res) => {
  const { title='New Box', color='#00f5d4', x=24, y=24, w=280, h=240 } = req.body;
  const db = getDB();
  const id = uuid(); const now = new Date().toISOString();
  const maxZ = db.prepare('SELECT MAX(z_index) as m FROM board_boxes').get()?.m || 0;
  db.prepare('INSERT INTO board_boxes (id, title, color, x, y, w, h, z_index, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, title, color, x, y, w, h, maxZ+1, now);
  res.json(boardBoxWithItems(db, id));
});

app.put('/api/board/boxes/:id', (req, res) => {
  const { title, color, x, y, w, h, z_index } = req.body;
  getDB().prepare('UPDATE board_boxes SET title=COALESCE(?,title), color=COALESCE(?,color), x=COALESCE(?,x), y=COALESCE(?,y), w=COALESCE(?,w), h=COALESCE(?,h), z_index=COALESCE(?,z_index) WHERE id=?')
    .run(title??null, color??null, x??null, y??null, w??null, h??null, z_index??null, req.params.id);
  res.json({ ok:true });
});

app.post('/api/board/boxes/:id/bring-front', (req, res) => {
  const db = getDB();
  const maxZ = db.prepare('SELECT MAX(z_index) as m FROM board_boxes').get()?.m || 0;
  db.prepare('UPDATE board_boxes SET z_index=? WHERE id=?').run(maxZ+1, req.params.id);
  res.json({ ok:true });
});

app.delete('/api/board/boxes/:id', (req, res) => {
  getDB().prepare('DELETE FROM board_boxes WHERE id=?').run(req.params.id);
  res.json({ ok:true });
});

// Board items
app.post('/api/board/boxes/:id/items', (req, res) => {
  const { text, sort_order=0 } = req.body;
  const db = getDB();
  const id = uuid(); const now = new Date().toISOString();
  db.prepare('INSERT INTO board_items (id, box_id, text, done, sort_order, created_at) VALUES (?,?,?,0,?,?)')
    .run(id, req.params.id, text, sort_order, now);
  res.json({ id, box_id: req.params.id, text, done:0, sort_order, created_at: now });
});

app.put('/api/board/items/:id', (req, res) => {
  const { text, done, sort_order } = req.body;
  getDB().prepare('UPDATE board_items SET text=COALESCE(?,text), done=COALESCE(?,done), sort_order=COALESCE(?,sort_order) WHERE id=?')
    .run(text??null, done??null, sort_order??null, req.params.id);
  res.json({ ok:true });
});

app.delete('/api/board/items/:id', (req, res) => {
  getDB().prepare('DELETE FROM board_items WHERE id=?').run(req.params.id);
  res.json({ ok:true });
});

// AI: summarize board content
app.post('/api/board/summarize', async (req, res) => {
  const db = getDB();
  const boxes = db.prepare('SELECT * FROM board_boxes').all().map(b => ({
    ...b,
    items: db.prepare('SELECT * FROM board_items WHERE box_id=?').all(b.id),
  }));

  const boardText = boxes.map(b => {
    const items = b.items.map(i => `  ${i.done?'[x]':'[ ]'} ${i.text}`).join('\n');
    return `## ${b.title}\n${items || '  (empty)'}`;
  }).join('\n\n');

  const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.1:latest';

  const prompt = `Analyze this board and give a sharp executive summary.\n\nBOARD CONTENT:\n${boardText}\n\nRespond as JSON:\n{"summary":"2-3 sentences overall","boxes":[{"title":"box title","insight":"one sentence","completion":"X/Y done","priority":"high|medium|low"}],"next_actions":["action 1","action 2","action 3"]}`;

  try {
    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, stream:false, messages:[{role:'user',content:prompt}], options:{temperature:0.3,num_predict:600} }),
    });
    const data = await r.json();
    const raw = (data.message?.content||'').replace(/```json|```/g,'').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    res.json(match ? JSON.parse(match[0]) : { summary: raw, boxes:[], next_actions:[] });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// AI: create board from text/context
app.post('/api/board/ai-create', async (req, res) => {
  const { prompt: userPrompt, clear = false } = req.body;
  const db = getDB();
  const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.1:latest';

  // Load KB context
  const kbFiles = db.prepare('SELECT original_name, content FROM knowledge_files ORDER BY created_at DESC LIMIT 3').all();
  const kbText = kbFiles.map(f => `${f.original_name}:\n${(f.content||'').substring(0,600)}`).join('\n\n');

  const systemPrompt = `You are an executive board planner. Create a structured board with boxes and checklist items based on the user's request.
${kbText ? `\nContext from knowledge base:\n${kbText}` : ''}

Respond ONLY with valid JSON:
{
  "boxes": [
    {
      "title": "Box Title",
      "color": "#00f5d4",
      "items": ["Item 1", "Item 2", "Item 3"]
    }
  ]
}

Use these colors: #00f5d4 (teal), #6c63ff (purple), #f59e0b (amber), #f15bb5 (pink), #22c55e (green), #3b82f6 (blue), #ef4444 (red).
Create 3-6 boxes with 3-7 items each. Be specific and actionable.`;

  try {
    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, stream:false, messages:[{role:'system',content:systemPrompt},{role:'user',content:userPrompt}], options:{temperature:0.4,num_predict:1200} }),
    });
    const data = await r.json();
    const raw = (data.message?.content||'').replace(/```json|```/g,'').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'AI did not return valid JSON' });
    const result = JSON.parse(match[0]);

    // Clear existing board if requested
    if (clear) {
      db.prepare('DELETE FROM board_items').run();
      db.prepare('DELETE FROM board_boxes').run();
    }

    // Create boxes and items
    const COLS = 3;
    const now = new Date().toISOString();
    const created = [];
    (result.boxes||[]).forEach((box, i) => {
      const id = uuid();
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      db.prepare('INSERT INTO board_boxes (id, title, color, x, y, w, h, z_index, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(id, box.title, box.color || '#00f5d4', 24 + col*300, 24 + row*260, 280, 240, i+1, now);
      (box.items||[]).forEach((text, j) => {
        db.prepare('INSERT INTO board_items (id, box_id, text, done, sort_order, created_at) VALUES (?,?,?,0,?,?)')
          .run(uuid(), id, text, j, now);
      });
      created.push({ id, title: box.title, itemCount: (box.items||[]).length });
    });

    res.json({ ok:true, created, boxCount: created.length });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ─── AUTOMATION PLANNER (n8n integration) ─────────────────────────────────────
app.post('/api/automation/audit', async (req, res) => {
  const db = getDB();
  const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.1:latest';

  // Pull context from EVA
  const projects  = db.prepare('SELECT title, description, status FROM projects LIMIT 10').all();
  const tasks     = db.prepare("SELECT title, status, priority FROM tasks LIMIT 20").all();
  const ideas     = db.prepare('SELECT title, body FROM ideas LIMIT 10').all();
  const kbFiles   = db.prepare('SELECT original_name FROM knowledge_files LIMIT 10').all();
  const sessions  = db.prepare('SELECT title, context FROM strategy_sessions LIMIT 5').all();

  const context = `PROJECTS: ${JSON.stringify(projects)}\nTASKS: ${JSON.stringify(tasks)}\nIDEAS: ${JSON.stringify(ideas)}\nKB FILES: ${JSON.stringify(kbFiles)}\nSTRATEGY SESSIONS: ${JSON.stringify(sessions)}`;

  const prompt = `You are an automation consultant. Analyze this executive's work and identify the 5 best recurring workflows to automate with n8n.

CONTEXT:
${context}

For each workflow, provide specific n8n implementation details.

Respond ONLY as JSON:
{
  "workflows": [
    {
      "title": "Workflow name",
      "description": "What it does",
      "trigger": "What triggers it (schedule/webhook/email/etc)",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "n8n_nodes": ["n8n node names to use"],
      "time_saved": "X hours/week",
      "priority": "high|medium|low",
      "complexity": "simple|medium|complex"
    }
  ],
  "summary": "Overall automation opportunity summary"
}`;

  try {
    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, stream:false, messages:[{role:'user',content:prompt}], options:{temperature:0.3,num_predict:1500} }),
    });
    const data = await r.json();
    const raw = (data.message?.content||'').replace(/```json|```/g,'').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    res.json(match ? JSON.parse(match[0]) : { error:'parse failed', raw });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/automation/build-n8n', async (req, res) => {
  const { workflow } = req.body;
  const N8N_URL = process.env.N8N_URL || 'http://host.docker.internal:5678';

  // Generate n8n workflow JSON
  const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.1:latest';

  const prompt = `Generate a valid n8n workflow JSON for this automation:
Title: ${workflow.title}
Description: ${workflow.description}
Trigger: ${workflow.trigger}
Steps: ${workflow.steps.join(', ')}
n8n nodes to use: ${(workflow.n8n_nodes||[]).join(', ')}

Return ONLY a valid n8n workflow JSON object that can be imported directly into n8n.
The JSON must have: name, nodes, connections, settings fields.
Keep it simple and working.`;

  try {
    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, stream:false, messages:[{role:'user',content:prompt}], options:{temperature:0.2,num_predict:2000} }),
    });
    const data = await r.json();
    const raw = (data.message?.content||'').replace(/```json|```/g,'').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.json({ ok:false, error:'Could not generate workflow JSON', n8nUrl: N8N_URL });

    const workflowJson = JSON.parse(match[0]);

    // Try to push to n8n
    try {
      const n8nRes = await fetch(`${N8N_URL}/api/v1/workflows`, {
        method:'POST',
        headers:{'Content-Type':'application/json', 'X-N8N-API-KEY': process.env.N8N_API_KEY||''},
        body: JSON.stringify(workflowJson),
      });
      if (n8nRes.ok) {
        const n8nData = await n8nRes.json();
        return res.json({ ok:true, n8nId: n8nData.id, n8nUrl:`${N8N_URL}/workflow/${n8nData.id}`, workflow: workflowJson });
      }
    } catch {}

    // n8n not reachable — return JSON for manual import
    res.json({ ok:false, manual:true, workflow: workflowJson, n8nUrl: N8N_URL, message:'n8n not reachable — use the JSON to import manually' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ─── ADVISOR / CHIEF OF STAFF ──────────────────────────────────────────────────
app.post('/api/advisor/ask', async (req, res) => {
  const { question, mode='advisor', history=[] } = req.body;
  const db = getDB();
  const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.1:latest';

  const projects = db.prepare("SELECT title, status, priority, progress, notes FROM projects WHERE status='active' LIMIT 8").all();
  const tasks    = db.prepare("SELECT title, status, priority FROM tasks WHERE status!='done' LIMIT 15").all();
  const insights = db.prepare('SELECT title, body FROM nexus_insights ORDER BY roi_estimate DESC LIMIT 5').all();
  const kbFiles  = db.prepare('SELECT original_name, content FROM knowledge_files ORDER BY created_at DESC LIMIT 3').all();
  const kbContext = kbFiles.map(f=>`${f.original_name}: ${(f.content||'').substring(0,500)}`).join('\n\n');

  const PERSONAS = {
    advisor: `You are the user's personal AI advisor — brutally honest, strategic, and direct. You help with life, career, and business decisions. You have full context of their work.`,
    chief_of_staff: `You are the user's AI Chief of Staff. You manage priorities, surface open loops, and ensure nothing important falls through the cracks. Be proactive and action-oriented.`,
  };

  const system = `${PERSONAS[mode]||PERSONAS.advisor}

CURRENT CONTEXT:
Active Projects: ${JSON.stringify(projects)}
Open Tasks: ${JSON.stringify(tasks)}
Top Insights: ${JSON.stringify(insights)}
${kbContext ? `Knowledge Base:\n${kbContext}` : ''}

Be specific, reference their actual data, and give concrete recommendations.`;

  const messages = [...history.map(h=>({role:h.role,content:h.content})), {role:'user',content:question}];

  try {
    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, stream:false, messages:[{role:'system',content:system},...messages], options:{temperature:0.6,num_predict:1000} }),
    });
    const data = await r.json();
    res.json({ reply: data.message?.content || 'No response', mode });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/advisor/monthly-checkin', async (req, res) => {
  const db = getDB();
  const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.1:latest';

  const projects = db.prepare('SELECT * FROM projects LIMIT 10').all();
  const tasks    = db.prepare('SELECT * FROM tasks LIMIT 20').all();
  const metrics  = db.prepare('SELECT * FROM metrics ORDER BY created_at DESC LIMIT 20').all();
  const ideas    = db.prepare('SELECT title, category FROM ideas ORDER BY created_at DESC LIMIT 10').all();
  const insights = db.prepare('SELECT * FROM nexus_insights LIMIT 10').all();

  const prompt = `Generate a comprehensive monthly check-in report for this executive.

DATA:
Projects: ${JSON.stringify(projects)}
Tasks: ${JSON.stringify(tasks)}
Metrics: ${JSON.stringify(metrics)}
Ideas: ${JSON.stringify(ideas)}
Insights: ${JSON.stringify(insights)}

Respond as JSON:
{
  "month": "Month Year",
  "headline": "One sentence summary of the month",
  "wins": ["Win 1", "Win 2", "Win 3"],
  "concerns": ["Concern 1", "Concern 2"],
  "metrics_review": "How metrics trended",
  "decisions_needed": ["Decision 1", "Decision 2"],
  "next_month_priorities": ["Priority 1", "Priority 2", "Priority 3"],
  "advisor_note": "Personal note from your AI advisor — honest assessment"
}`;

  try {
    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, stream:false, messages:[{role:'user',content:prompt}], options:{temperature:0.4,num_predict:1200} }),
    });
    const data = await r.json();
    const raw = (data.message?.content||'').replace(/```json|```/g,'').trim();
    const match = raw.match(/\{[\s\S]*\}/);

    const result = match ? JSON.parse(match[0]) : { error:'parse failed' };
    // Save to briefs table
    if (result.headline) {
      db.prepare('INSERT INTO briefs (id, date, content, created_at) VALUES (?,?,?,?)').run(uuid(), new Date().toISOString().split('T')[0]+'-monthly', JSON.stringify(result), new Date().toISOString());
    }
    res.json(result);
  } catch(err) { res.status(500).json({ error: err.message }); }
});
