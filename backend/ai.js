/**
 * AI Provider — auto-selects Claude API or Ollama
 * Priority: Claude API (if key set) → Ollama (if running) → mock
 */

const CLAUDE_MODEL = 'claude-sonnet-4-6';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('No Claude API key');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

async function callOllama(prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
    signal: AbortSignal.timeout(60000)
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return data.response;
}

function mockResponse(prompt) {
  // Minimal mock so UI doesn't break without AI
  if (prompt.includes('"type"')) {
    return JSON.stringify([{
      type: 'action',
      title: 'Set up your AI provider',
      body: 'Add ANTHROPIC_API_KEY to your .env file, or start Ollama locally. No AI provider is currently connected.',
      priority: 'high'
    }]);
  }
  return JSON.stringify({ error: 'No AI provider configured', hint: 'Add ANTHROPIC_API_KEY to .env or run Ollama locally' });
}

export async function callAI(prompt, parseJSON = false) {
  const provider = process.env.AI_PROVIDER || 'auto';
  let raw;

  try {
    if (provider === 'claude' || (provider === 'auto' && process.env.ANTHROPIC_API_KEY)) {
      raw = await callClaude(prompt);
    } else if (provider === 'ollama') {
      raw = await callOllama(prompt);
    } else {
      // auto: try Claude first, fallback Ollama, fallback mock
      try {
        raw = await callClaude(prompt);
      } catch {
        try {
          raw = await callOllama(prompt);
        } catch {
          raw = mockResponse(prompt);
        }
      }
    }
  } catch (err) {
    console.error('AI call failed:', err.message);
    raw = mockResponse(prompt);
  }

  if (!parseJSON) return raw;

  // Strip markdown fences if present
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    // Try to extract JSON from text
    const match = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try { return JSON.parse(match[1]); } catch {}
    }
    return { raw, error: 'JSON parse failed' };
  }
}
