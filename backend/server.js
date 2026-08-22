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
    .map(r => { let h; try { h = Array.isArray(r.hashtags) ? r.hashtags : JSON.parse(r.hashtags || '[]'); } catch { h = []; } return { ...r, hashtags: h }; });
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
