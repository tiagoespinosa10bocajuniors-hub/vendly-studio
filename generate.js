// Vendly Studio — intermediario seguro de IA (Vercel Serverless Function)
// La API key del equipo vive en process.env.ANTHROPIC_API_KEY (configurada en Vercel, nunca en el codigo).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(402).json({ error: { message: 'El equipo todavia no cargo la IA.', code: 'no_team_key' } });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (!body || !Array.isArray(body.messages)) return res.status(400).json({ error: { message: 'Pedido invalido' } });
  if (body.max_tokens && body.max_tokens > 8000) body.max_tokens = 8000;

  const headers = { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  const tools = Array.isArray(body.tools) ? body.tools : [];
  if (tools.some(function (t) { return t && typeof t.type === 'string' && t.type.indexOf('web_fetch') === 0; })) {
    headers['anthropic-beta'] = 'web-fetch-2025-09-10';
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await r.text();
    if (!r.ok) {
      let msg = '';
      try { const j = JSON.parse(text); msg = (j.error && j.error.message) || ''; } catch (e) {}
      if (/credit|balance|fund|quota/i.test(msg)) return res.status(402).json({ error: { message: msg, code: 'no_credits' } });
      return res.status(r.status).send(text);
    }
    res.setHeader('content-type', 'application/json');
    return res.status(200).send(text);
  } catch (e) {
    return res.status(502).json({ error: { message: 'proxy error: ' + (e && e.message) } });
  }
}
