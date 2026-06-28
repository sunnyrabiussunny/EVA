import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initDB, getDB } from './db.js';
import { callAI } from './ai.js';
import { v4 as uuid } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

await initDB();

// ─── HEALTH ───────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// ─── AI STATUS ────────────────────────────────────────────
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
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO projects (id, title, description, status, priority, deadline, tags, progress, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`).run(id, title, description || '', status, priority, deadline || null, JSON.stringify(tags), now, now);
  logActivity('project_created', `Created project: ${title}`);
  res.json({ id });
});

app.put('/api/projects/:id', (req, res) => {
  const db = getDB();
  const { title, description, status, priority, deadline, tags, progress, notes } = req.body;
  const now = new Date().toISOString();
  db.prepare(`UPDATE projects SET title=COALESCE(?,title), description=COALESCE(?,description),
    status=COALESCE(?,status), priority=COALESCE(?,priority), deadline=COALESCE(?,deadline),
    tags=COALESCE(?,tags), progress=COALESCE(?,progress), notes=COALESCE(?,notes), updated_at=?
    WHERE id=?`).run(title, description, status, priority, deadline,
    tags ? JSON.stringify(tags) : null, progress, notes, now, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/projects/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/projects/:id/analyze', async (req, res) => {
  const db = getDB();
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const prompt = `You are a sharp business analyst. Analyze this project and give brutally honest, specific next actions.

Project: ${project.title}
Description: ${project.description}
Status: ${project.status} | Priority: ${project.priority} | Progress: ${project.progress}%
Notes: ${project.notes || 'None'}
Deadline: ${project.deadline || 'None'}

Respond in this EXACT JSON format, nothing else:
{"health":"good","summary":"2 sentence honest assessment","next_actions":["action 1","action 2","action 3"],"risks":["risk 1"],"opportunities":["opportunity 1"]}`;
  const result = await callAI(prompt, true);
  res.json(result);
});

// ─── TASKS ────────────────────────────────────────────────
app.get('/api/tasks', (req, res) => {
  const db = getDB();
  const { project_id, status } = req.query;
  let q = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];
  if (project_id) { q += ' AND project_id=?'; params.push(project_id); }
  if (status) { q += ' AND status=?'; params.push(status); }
  q += ' ORDER BY priority DESC, due_date ASC';
  res.json(db.prepare(q).all(...params));
});

app.post('/api/tasks', (req, res) => {
  const db = getDB();
  const { title, project_id, priority = 'medium', due_date, notes } = req.body;
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO tasks (id, title, project_id, priority, due_date, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'todo', ?)`).run(id, title, project_id || null, priority, due_date || null, notes || null, now);
  res.json({ id });
});

app.put('/api/tasks/:id', (req, res) => {
  const db = getDB();
  const { title, status, priority, due_date, notes } = req.body;
  db.prepare(`UPDATE tasks SET title=COALESCE(?,title), status=COALESCE(?,status),
    priority=COALESCE(?,priority), due_date=COALESCE(?,due_date), notes=COALESCE(?,notes)
    WHERE id=?`).run(title, status, priority, due_date, notes, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── CONTENT ──────────────────────────────────────────────
const PLATFORMS = ['linkedin', 'facebook', 'twitter'];
const ANGLES = ['Educational','Founder Story','Personal Branding','Product Update','Technical',
  'Case Study','Behind the Scenes','Lessons Learned','Business Insight','Marketing',
  'Industry Trend','Opinion','Announcement'];

app.get('/api/content', (req, res) => {
  const db = getDB();
  const { platform, status, q } = req.query;
  let query = 'SELECT * FROM content WHERE 1=1';
  const params = [];
  if (platform) { query += ' AND platform=?'; params.push(platform); }
  if (status) { query += ' AND status=?'; params.push(status); }
  if (q) { query += ' AND (title LIKE ? OR content LIKE ? OR angle LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  query += ' ORDER BY created_at DESC LIMIT 100';
  res.json(db.prepare(query).all(...params));
});

async function generateOnePost(platform, angle, topic, context = '') {
  const db = getDB();
  const settings = getSettings();
  const userName = settings.name || 'a professional';
  const userIndustry = settings.industry || 'AI, technology, and business';
  const userVoice = settings.voice || 'clear, direct, and authentic';
  const chosenAngle = angle || ANGLES[Math.floor(Math.random() * ANGLES.length)];
  const chosenPlatform = platform || PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];

  const platformRules = {
    linkedin: 'Professional tone. 150-300 words. Use line breaks between paragraphs. End with a question or insight. 3-5 hashtags.',
    facebook: 'Conversational and warm. 80-150 words. Relatable and personal. 2-3 hashtags.',
    twitter: 'Maximum 240 characters for the main post. Punchy. Direct. No fluff. 2 hashtags max.'
  };

  const prompt = `You are writing social media content for ${userName}, who works in ${userIndustry}.
Their writing style: ${userVoice}.

Write a ${chosenAngle} post for ${chosenPlatform}.
Topic: ${topic || 'building AI tools, self-hosting software, productivity, or business insights'}
Extra context: ${context || 'none'}
Platform rules: ${platformRules[chosenPlatform]}

IMPORTANT: Write real, substantive content. Not placeholder text. Not empty. A real post someone would actually publish.

Respond ONLY in this JSON format with no other text:
{"title":"short internal title","content":"the full post text ready to copy-paste","hashtags":["tag1","tag2","tag3"],"cta":"call to action if any","angle":"${chosenAngle}","platform":"${chosenPlatform}"}`;

  const result = await callAI(prompt, true);
  if (!result || result.error || !result.content || result.content.length < 20) {
    throw new Error('AI returned empty content');
  }

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO content (id, platform, angle, title, content, hashtags, cta, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ready', ?)`).run(
    id, chosenPlatform, result.angle || chosenAngle,
    result.title || topic || chosenAngle,
    result.content,
    JSON.stringify(result.hashtags || []),
    result.cta || '', now);
  return { id, ...result };
}

app.post('/api/content/generate', async (req, res) => {
  const { platform, angle, topic, context } = req.body;
  try {
    const result = await generateOnePost(platform, angle, topic, context);
    res.json(result);
  } catch (err) {
    console.error('Content generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/content/:id', (req, res) => {
  const db = getDB();
  const { status, content, title } = req.body;
  db.prepare(`UPDATE content SET status=COALESCE(?,status), content=COALESCE(?,content),
    title=COALESCE(?,title) WHERE id=?`).run(status, content, title, req.params.id);
  if (status === 'posted') logActivity('post_published', `Published content`);
  res.json({ ok: true });
});

app.delete('/api/content/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM content WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Auto-fill content queue to 10 ready posts (runs in background)
async function autoFillContentQueue() {
  const db = getDB();
  const readyCount = db.prepare("SELECT COUNT(*) as c FROM content WHERE status='ready'").get().c;
  const needed = Math.max(0, 10 - readyCount);
  if (needed === 0) return;
  console.log(`[EVA] Auto-generating ${needed} content posts...`);
  for (let i = 0; i < needed; i++) {
    try {
      await generateOnePost(
        PLATFORMS[i % PLATFORMS.length],
        ANGLES[Math.floor(Math.random() * ANGLES.length)],
        null, null
      );
      await new Promise(r => setTimeout(r, 2000)); // small delay between calls
    } catch (err) {
      console.error('[EVA] Auto content error:', err.message);
      break;
    }
  }
  console.log('[EVA] Auto content fill complete');
}

app.post('/api/content/autofill', async (req, res) => {
  res.json({ ok: true, message: 'Auto-fill started in background' });
  autoFillContentQueue().catch(console.error);
});

// ─── IDEAS ────────────────────────────────────────────────
app.get('/api/ideas', (req, res) => {
  const db = getDB();
  const { q } = req.query;
  if (q) {
    return res.json(db.prepare('SELECT * FROM ideas WHERE title LIKE ? OR body LIKE ? ORDER BY created_at DESC').all(`%${q}%`, `%${q}%`));
  }
  res.json(db.prepare('SELECT * FROM ideas ORDER BY created_at DESC').all());
});

app.post('/api/ideas', (req, res) => {
  const db = getDB();
  const { title, body, category } = req.body;
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO ideas (id, title, body, category, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id, title, body || '', category || 'general', now);
  res.json({ id });
});

app.post('/api/ideas/:id/expand', async (req, res) => {
  const db = getDB();
  const idea = db.prepare('SELECT * FROM ideas WHERE id=?').get(req.params.id);
  if (!idea) return res.status(404).json({ error: 'Not found' });
  const prompt = `Expand this rough idea into a detailed, actionable concept.

Idea: ${idea.title}
Notes: ${idea.body || 'none'}

Be specific and practical. Think like a product person.

Respond ONLY in this JSON format:
{"expanded":"detailed concept in 3-4 paragraphs","category":"product","effort":"medium","potential":"high","first_step":"one specific action to test this idea this week"}`;
  const result = await callAI(prompt, true);
  db.prepare('UPDATE ideas SET expanded=?, category=COALESCE(?,category) WHERE id=?').run(
    result.expanded || result.raw, result.category, idea.id);
  res.json(result);
});

app.delete('/api/ideas/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM ideas WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── KNOWLEDGE BASE ────────────────────────────────────────
app.get('/api/knowledge', (req, res) => {
  const db = getDB();
  const { q } = req.query;
  if (q) {
    return res.json(db.prepare('SELECT * FROM knowledge WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC').all(`%${q}%`, `%${q}%`));
  }
  res.json(db.prepare('SELECT * FROM knowledge ORDER BY created_at DESC').all());
});

app.post('/api/knowledge', (req, res) => {
  const db = getDB();
  const { title, content, tags = [], source } = req.body;
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO knowledge (id, title, content, tags, source, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, title, content, JSON.stringify(tags), source || '', now);
  res.json({ id });
});

app.delete('/api/knowledge/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM knowledge WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── AI INSIGHTS ──────────────────────────────────────────
app.get('/api/insights', (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT * FROM insights ORDER BY created_at DESC LIMIT 20').all());
});

app.post('/api/insights/generate', async (req, res) => {
  const db = getDB();
  const projects = db.prepare('SELECT title, status, progress, priority, notes FROM projects LIMIT 10').all();
  const tasks = db.prepare("SELECT title, status, priority FROM tasks WHERE status != 'done' LIMIT 20").all();
  const recentContent = db.prepare('SELECT platform, angle, status FROM content ORDER BY created_at DESC LIMIT 10').all();
  const ideas = db.prepare('SELECT title, category FROM ideas ORDER BY created_at DESC LIMIT 10').all();

  const prompt = `You are a sharp business advisor for EVA (Executive Virtual Assistant). Analyze this data and give specific, actionable insights.

PROJECTS: ${JSON.stringify(projects)}
OPEN TASKS: ${JSON.stringify(tasks)}
RECENT CONTENT: ${JSON.stringify(recentContent)}
IDEAS: ${JSON.stringify(ideas)}

Generate 5 specific insights based on actual data above. Not generic advice.

Respond ONLY as a JSON array:
[{"type":"opportunity","title":"short headline","body":"2-3 specific sentences","priority":"high"},{"type":"risk","title":"headline","body":"details","priority":"medium"}]`;

  const result = await callAI(prompt, true);
  const insights = Array.isArray(result) ? result : (result.insights || []);
  const now = new Date().toISOString();
  db.prepare('DELETE FROM insights WHERE created_at < datetime("now", "-7 days")').run();
  const insert = db.prepare('INSERT INTO insights (id, type, title, body, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  for (const ins of insights.slice(0, 5)) {
    insert.run(uuid(), ins.type || 'action', ins.title || 'Insight', ins.body || '', ins.priority || 'medium', now);
  }
  res.json({ count: insights.length, insights });
});

// ─── DAILY BRIEF ──────────────────────────────────────────
function getSettings() {
  const db = getDB();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  rows.forEach(r => { s[r.key] = r.value; });
  return s;
}

async function generateBrief() {
  const db = getDB();
  const projects = db.prepare("SELECT title, status, progress, priority, deadline FROM projects WHERE status='active' LIMIT 5").all();
  const tasks = db.prepare("SELECT title, priority, due_date FROM tasks WHERE status='todo' ORDER BY priority DESC, due_date ASC LIMIT 10").all();
  const doneTasks = db.prepare("SELECT title FROM tasks WHERE status='done' AND created_at > datetime('now','-1 day') LIMIT 5").all();
  const content = db.prepare("SELECT platform, title, angle FROM content WHERE status='ready' LIMIT 5").all();
  const settings = getSettings();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `Generate a sharp executive morning brief for ${settings.name || 'the user'} from EVA (Executive Virtual Assistant).

TODAY: ${today}
ACTIVE PROJECTS: ${JSON.stringify(projects)}
PENDING TASKS: ${JSON.stringify(tasks)}
COMPLETED YESTERDAY: ${JSON.stringify(doneTasks)}
CONTENT READY: ${JSON.stringify(content)}

Be specific and direct. Reference actual project names and tasks. No generic advice.

Respond ONLY in this JSON format:
{"greeting":"Good morning [name]! Today is [day].","focus":"The single most important thing to focus on today and exactly why","priorities":["specific priority 1","specific priority 2","specific priority 3"],"yesterday_summary":"What was accomplished yesterday based on completed tasks","warnings":["any deadline risk or blocker if applicable"],"content_ready":["platform: post title"],"quote":"a sharp relevant quote"}`;

  const result = await callAI(prompt, true);
  if (result && !result.error && result.greeting) {
    const now = new Date().toISOString();
    const today2 = new Date().toISOString().split('T')[0];
    db.prepare('DELETE FROM briefs WHERE date=?').run(today2);
    db.prepare('INSERT INTO briefs (id, date, content, created_at) VALUES (?, ?, ?, ?)').run(uuid(), today2, JSON.stringify(result), now);
    console.log('[EVA] Daily brief generated');
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
  res.json({ error: 'no_ai', greeting: `Good morning! Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`, focus: 'Set up your AI provider to get personalized briefs.', priorities: [], warnings: ['No AI provider configured — add ANTHROPIC_API_KEY to .env or ensure Ollama is running with llama3'], content_ready: [], yesterday_summary: '' });
});

// ─── ACTIVITY ─────────────────────────────────────────────
function logActivity(type, description) {
  const db = getDB();
  db.prepare('INSERT INTO activity (id, type, description, created_at) VALUES (?, ?, ?, ?)').run(uuid(), type, description, new Date().toISOString());
}

app.get('/api/activity', (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT * FROM activity ORDER BY created_at DESC LIMIT 30').all());
});

// ─── GLOBAL SEARCH ────────────────────────────────────────
app.get('/api/search', (req, res) => {
  const db = getDB();
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ results: [] });
  const term = `%${q}%`;
  const results = [];

  db.prepare('SELECT id, title, status, priority FROM projects WHERE title LIKE ? OR description LIKE ? LIMIT 5').all(term, term)
    .forEach(r => results.push({ ...r, type: 'project' }));

  db.prepare('SELECT id, title, status, priority FROM tasks WHERE title LIKE ? OR notes LIKE ? LIMIT 5').all(term, term)
    .forEach(r => results.push({ ...r, type: 'task' }));

  db.prepare('SELECT id, title, angle, platform, status FROM content WHERE title LIKE ? OR content LIKE ? LIMIT 5').all(term, term)
    .forEach(r => results.push({ ...r, type: 'content' }));

  db.prepare('SELECT id, title, category FROM ideas WHERE title LIKE ? OR body LIKE ? LIMIT 5').all(term, term)
    .forEach(r => results.push({ ...r, type: 'idea' }));

  db.prepare('SELECT id, title FROM knowledge WHERE title LIKE ? OR content LIKE ? LIMIT 5').all(term, term)
    .forEach(r => results.push({ ...r, type: 'knowledge' }));

  res.json({ results });
});

// ─── SETTINGS ─────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const rows = getDB().prepare('SELECT key, value FROM settings').all();
  const s = {};
  rows.forEach(r => { s[r.key] = r.value; });
  res.json(s);
});

app.put('/api/settings', (req, res) => {
  const db = getDB();
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const [k, v] of Object.entries(req.body)) upsert.run(k, String(v));
  res.json({ ok: true });
});

// ─── STARTUP: generate brief + auto-fill content ──────────
async function startupTasks() {
  console.log('[EVA] Running startup tasks...');
  try {
    await generateBrief();
  } catch (e) { console.error('[EVA] Brief error:', e.message); }
  try {
    await autoFillContentQueue();
  } catch (e) { console.error('[EVA] Content autofill error:', e.message); }
}

// Run startup after 5s delay (let DB settle)
setTimeout(startupTasks, 5000);

// Re-generate brief daily at 6am
setInterval(async () => {
  const hour = new Date().getHours();
  if (hour === 6) {
    console.log('[EVA] Daily brief refresh...');
    await generateBrief().catch(console.error);
    await autoFillContentQueue().catch(console.error);
  }
}, 60 * 60 * 1000);

app.listen(4000, () => console.log('[EVA] Backend running on :4000'));
