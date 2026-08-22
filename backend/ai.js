/**
 * EVA AI Provider — Ollama (offline) or Claude API
 * Priority: Claude API (if key set) → Ollama → mock
 */

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://host.docker.internal:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:latest';
const CLAUDE_MODEL = 'claude-sonnet-4-6';

// ── Claude API ────────────────────────────────────────────
async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('No Claude API key');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude ${res.status}: ${err.substring(0, 200)}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

// ── Ollama (/api/chat — works with all recent Ollama versions) ────────────────
async function callOllama(prompt) {
  const url = `${OLLAMA_URL}/api/chat`;
  console.log(`[EVA] Calling Ollama: ${url} model=${OLLAMA_MODEL}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:   OLLAMA_MODEL,
      stream:  false,
      messages: [
        {
          role: 'system',
          content: 'You are EVA, an executive AI assistant. Respond ONLY with valid JSON. No markdown, no explanation, no preamble.',
        },
        { role: 'user', content: prompt },
      ],
      options: { temperature: 0.3, num_predict: 1200 },
    }),
    signal: AbortSignal.timeout(120000), // 2 min timeout for large models
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama ${res.status}: ${err.substring(0, 200)}`);
  }

  const data = await res.json();
  const text = data.message?.content || data.response || '';
  console.log(`[EVA] Ollama response length: ${text.length} chars`);
  return text;
}

// ── Mock (no AI configured) ───────────────────────────────
function mockResponse(prompt) {
  if (prompt.includes('"type"') || prompt.includes('insights') || prompt.includes('Analyze')) {
    return JSON.stringify([{
      type: 'action',
      title: 'Connect Ollama to EVA',
      body: 'Ollama is running on this server but EVA cannot reach it. Check that OLLAMA_URL in docker-compose.yml points to the correct address and the model name matches (run: ollama list).',
      priority: 'high',
    }]);
  }
  if (prompt.includes('brief') || prompt.includes('morning')) {
    return JSON.stringify({
      greeting: 'Good morning!',
      focus: 'Connect Ollama to enable AI-powered briefs.',
      priorities: ['Set up Ollama connection'],
      yesterday_summary: 'No AI provider connected yet.',
      warnings: ['Ollama not reachable — check OLLAMA_URL in .env'],
      content_ready: [],
      quote: 'The secret of getting ahead is getting started.',
    });
  }
  return JSON.stringify({ error: 'No AI provider configured', hint: 'Check Ollama is running: ollama list' });
}

// ── Main export ───────────────────────────────────────────
export async function callAI(prompt, parseJSON = false) {
  const provider = process.env.AI_PROVIDER || 'auto';
  let raw;

  try {
    if (provider === 'claude' && process.env.ANTHROPIC_API_KEY) {
      raw = await callClaude(prompt);
    } else if (provider === 'ollama') {
      raw = await callOllama(prompt);
    } else {
      // auto: Claude first, then Ollama, then mock
      if (process.env.ANTHROPIC_API_KEY) {
        try { raw = await callClaude(prompt); }
        catch (e) {
          console.warn('[EVA] Claude failed, trying Ollama:', e.message);
          try { raw = await callOllama(prompt); }
          catch (e2) { console.warn('[EVA] Ollama failed:', e2.message); raw = mockResponse(prompt); }
        }
      } else {
        try { raw = await callOllama(prompt); }
        catch (e) { console.warn('[EVA] Ollama failed:', e.message); raw = mockResponse(prompt); }
      }
    }
  } catch (err) {
    console.error('[EVA] AI call failed:', err.message);
    raw = mockResponse(prompt);
  }

  if (!parseJSON) return raw;

  // Strip markdown fences
  const clean = raw
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    return JSON.parse(clean);
  } catch {
    // Try to extract JSON object or array from messy response
    const objMatch = clean.match(/(\{[\s\S]*\})/);
    const arrMatch = clean.match(/(\[[\s\S]*\])/);
    const match = arrMatch || objMatch;
    if (match) {
      try { return JSON.parse(match[1]); } catch {}
    }
    console.error('[EVA] JSON parse failed. Raw:', clean.substring(0, 300));
    return { raw: clean, error: 'JSON parse failed' };
  }
}
