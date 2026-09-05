export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    configured: Boolean(process.env.RIME_API_KEY),
    provider: process.env.RIME_API_KEY ? 'Rime' : 'Local development fallback',
    endpoint: process.env.RIME_ENDPOINT || 'https://users.rime.ai/v1/rime-tts',
    modelId: process.env.RIME_MODEL_ID || 'mistv3',
    speaker: process.env.RIME_SPEAKER || 'astra',
    lang: process.env.RIME_LANG || 'eng',
    audioFormat: 'audio/mpeg'
  });
}
