const MAX_TEXT_LENGTH = 500;

function responseFor(text) {
  const clean = text.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  if (/cancel|stop|never mind/i.test(clean)) return 'Understood. I have stopped the previous task. What should I do instead?';
  if (/safety|hazard|danger/i.test(clean)) return 'Safety check started. Tell me the location and the immediate hazard, and I will keep the response brief.';
  return `I heard: ${clean}. I am checking that now. You can interrupt me at any time to revise or cancel it.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { text, generation } = req.body || {};
    if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: 'Enter 1 to 500 characters.' });
    const spokenText = responseFor(text);
    if (!process.env.RIME_API_KEY) return res.status(200).json({ generation, text: spokenText, provider: 'Local development fallback', audioBase64: null });
    const result = await fetch(process.env.RIME_ENDPOINT || 'https://users.rime.ai/v1/rime-tts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RIME_API_KEY}`, Accept: 'audio/mpeg', 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: spokenText, modelId: process.env.RIME_MODEL_ID || 'mistv3', speaker: process.env.RIME_SPEAKER || 'astra', lang: process.env.RIME_LANG || 'eng', samplingRate: 22050 })
    });
    if (!result.ok) throw new Error(`Rime returned ${result.status}`);
    const audioBase64 = Buffer.from(await result.arrayBuffer()).toString('base64');
    return res.status(200).json({ generation, text: spokenText, provider: 'Rime', audioBase64 });
  } catch (error) {
    console.error('[voice-ward] synthesis failed', { message: error.message });
    return res.status(502).json({ error: 'Voice synthesis failed. Check the server logs.' });
  }
}
