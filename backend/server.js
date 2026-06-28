import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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

// ─── AI PROVIDER STATUS ───────────────────────────────────
app.get('/api/ai/status', async (req, res) => {
  const db = getDB();
  const hasKey = !!(process.env.ANTHROPIC_API_KEY);
  const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
  let ollamaOk = false;
  try {
    const r = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
    ollamaOk = r.ok;
  } catch {}
  res.json({ claude: hasKey, ollama: ollamaOk, provider: process.env.AI_PROVIDER || 'auto' });
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

Respond in this exact JSON format:
{
  "health": "good|warning|critical",
  "summary": "2 sentence honest assessment",
  "next_actions": ["action 1", "action 2", "action 3"],
  "risks": ["risk 1", "risk 2"],
  "opportunities": ["opportunity 1"]
}`;
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
  const { platform, status } = req.query;
  let q = 'SELECT * FROM content ORDER BY created_at DESC LIMIT 100';
  const params = [];
  if (platform || status) {
    q = 'SELECT * FROM content WHERE 1=1';
    if (platform) { q += ' AND platform=?'; params.push(platform); }
    if (status) { q += ' AND status=?'; params.push(status); }
    q += ' ORDER BY created_at DESC LIMIT 100';
  }
  res.json(db.prepare(q).all(...params));
});

app.post('/api/content/generate', async (req, res) => {
  const db = getDB();
  const { platform = 'linkedin', angle, topic, context = '' } = req.body;
  const chosenAngle = angle || ANGLES[Math.floor(Math.random() * ANGLES.length)];

  const platformRules = {
    linkedin: 'Professional tone, 150-300 words, use line breaks for readability, 3-5 hashtags, end with a question or CTA',
    facebook: 'Conversational, 100-200 words, relatable story, 2-3 hashtags, emoji ok',
    twitter: 'Under 280 characters total, punchy, direct, 2-3 hashtags, no fluff'
  };

  const prompt = `You are a world-class content strategist specializing in ${platform}.

Write a ${chosenAngle} post for ${platform}.
Topic hint: ${topic || 'AI, business, building products, self-hosting, productivity'}
Context: ${context}
Platform rules: ${platformRules[platform]}

Make it feel genuinely human. Not corporate. Not templated. Bring a real perspective.

Respond ONLY in this JSON format:
{
  "title": "internal title for this post",
  "content": "the full post text",
  "hashtags": ["tag1", "tag2"],
  "cta": "call to action if any",
  "angle": "${chosenAngle}"
}`;

  const result = await callAI(prompt, true);
  const id = uuid();
  const now = new Date().toISOString();
  const content = result.content || '';
  const hashtags = JSON.stringify(result.hashtags || []);

  db.prepare(`INSERT INTO content (id, platform, angle, title, content, hashtags, cta, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ready', ?)`).run(
    id, platform, result.angle || chosenAngle, result.title || topic || '', content, hashtags, result.cta || '', now);

  res.json({ id, ...result });
});

app.put('/api/content/:id', (req, res) => {
  const db = getDB();
  const { status, content, title } = req.body;
  db.prepare(`UPDATE content SET status=COALESCE(?,status), content=COALESCE(?,content),
    title=COALESCE(?,title) WHERE id=?`).run(status, content, title, req.params.id);
  if (status === 'posted') {
    const row = db.prepare('SELECT platform FROM content WHERE id=?').get(req.params.id);
    if (row) {
      db.prepare(`INSERT INTO activity (id, type, description, created_at)
        VALUES (?, 'post_published', ?, ?)`).run(uuid(), `Published on ${row.platform}`, new Date().toISOString());
    }
  }
  res.json({ ok: true });
});

app.delete('/api/content/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM content WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── IDEAS ────────────────────────────────────────────────
app.get('/api/ideas', (req, res) => {
  const db = getDB();
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
  const prompt = `Expand this rough idea into a detailed concept with clear potential.

Idea: ${idea.title}
Notes: ${idea.body}

Give a concrete, specific expansion — not vague inspiration. Think like a product person.

Respond in JSON:
{
  "expanded": "detailed concept (3-4 paragraphs)",
  "category": "product|content|business|research|personal",
  "effort": "low|medium|high",
  "potential": "low|medium|high",
  "first_step": "single specific action to test this idea this week"
}`;
  const result = await callAI(prompt, true);
  db.prepare('UPDATE ideas SET expanded=?, category=COALESCE(?,category) WHERE id=?').run(
    result.expanded, result.category, idea.id);
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
    const rows = db.prepare(`SELECT * FROM knowledge WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC`).all(`%${q}%`, `%${q}%`);
    return res.json(rows);
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

  const prompt = `You are a brutally honest business advisor. Analyze this data and generate specific, actionable insights.

PROJECTS: ${JSON.stringify(projects)}
OPEN TASKS: ${JSON.stringify(tasks)}
RECENT CONTENT: ${JSON.stringify(recentContent)}
IDEAS: ${JSON.stringify(ideas)}

Generate 5 sharp, specific insights. Not generic advice. Real observations from the data.

Respond in JSON array:
[
  {
    "type": "opportunity|risk|action|content|branding",
    "title": "short headline",
    "body": "2-3 specific sentences with real observations",
    "priority": "high|medium|low"
  }
]`;

  const result = await callAI(prompt, true);
  const insights = Array.isArray(result) ? result : result.insights || [];
  const now = new Date().toISOString();

  db.prepare('DELETE FROM insights WHERE created_at < datetime("now", "-7 days")').run();

  const insert = db.prepare('INSERT INTO insights (id, type, title, body, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  const ids = [];
  for (const ins of insights.slice(0, 5)) {
    const id = uuid();
    insert.run(id, ins.type || 'action', ins.title, ins.body, ins.priority || 'medium', now);
    ids.push(id);
  }
  res.json({ count: ids.length, insights });
});

// ─── DAILY BRIEF ──────────────────────────────────────────
app.get('/api/brief/today', async (req, res) => {
  const db = getDB();
  const cached = db.prepare(`SELECT * FROM briefs WHERE date=date('now') ORDER BY created_at DESC LIMIT 1`).get();
  if (cached) return res.json(JSON.parse(cached.content));

  const projects = db.prepare("SELECT title, status, progress, priority, deadline FROM projects WHERE status='active' LIMIT 5").all();
  const tasks = db.prepare("SELECT title, priority, due_date FROM tasks WHERE status='todo' ORDER BY priority DESC, due_date ASC LIMIT 10").all();
  const content = db.prepare("SELECT platform, title FROM content WHERE status='ready' LIMIT 5").all();

  const prompt = `Generate a sharp morning brief. Be specific, not generic.

ACTIVE PROJECTS: ${JSON.stringify(projects)}
PENDING TASKS: ${JSON.stringify(tasks)}
READY CONTENT: ${JSON.stringify(content)}
TODAY: ${new Date().toDateString()}

Respond in JSON:
{
  "greeting": "one sentence good morning with actual day/date",
  "focus": "the single most important thing to do today and why",
  "priorities": ["priority 1", "priority 2", "priority 3"],
  "warnings": ["any deadline risk or blocker"],
  "content_ready": ["platform: title"],
  "quote": "a sharp, relevant quote (not from a motivational poster)"
}`;

  const result = await callAI(prompt, true);
  const now = new Date().toISOString();
  db.prepare('INSERT INTO briefs (id, date, content, created_at) VALUES (?, date("now"), ?, ?)').run(uuid(), JSON.stringify(result), now);
  res.json(result);
});

// ─── ACTIVITY ─────────────────────────────────────────────
app.get('/api/activity', (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT * FROM activity ORDER BY created_at DESC LIMIT 30').all());
});

// ─── SETTINGS ─────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  const db = getDB();
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const [k, v] of Object.entries(req.body)) upsert.run(k, String(v));
  res.json({ ok: true });
});

app.listen(4000, () => console.log('EVA backend running on :4000'));
