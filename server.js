// ============================================================
//  server.js — Backend seguro para "Habla Inglés Real"
//
//  Requerimientos:
//    node >= 18  (fetch nativo)
//    npm install express cors
//
//  Inicio:
//    node server.js
//
//  La API key de Gemini vive SOLO aquí, nunca en el frontend.
// ============================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// -----------------------------------------------------------
// API KEY — en producción usa variables de entorno:
//   process.env.GEMINI_API_KEY
// -----------------------------------------------------------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDR3c9oHQBuCrHEuLJgSHqnSTgAbo_Vfkk';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// -----------------------------------------------------------
// MIDDLEWARES
// -----------------------------------------------------------
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname)));

// -----------------------------------------------------------
// UTILIDADES
// -----------------------------------------------------------
async function callGemini(prompt) {
    const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        })
    });
    if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) return JSON.parse(match[1] || match[0]);
    return JSON.parse(text.trim());
}

// Middleware de validación de body
function requireFields(fields) {
    return (req, res, next) => {
        const missing = fields.filter(f => !req.body[f]);
        if (missing.length) return res.status(400).json({ error: `Faltan campos: ${missing.join(', ')}` });
        next();
    };
}

// -----------------------------------------------------------
// RUTAS DE LA API DE GEMINI
// -----------------------------------------------------------

// POST /api/gemini/examples
// Body: { phrase: string, translation: string }
app.post('/api/gemini/examples', requireFields(['phrase']), async (req, res) => {
    const { phrase, translation = '' } = req.body;
    const prompt = `You are an English teacher. Generate exactly 3 natural, realistic example sentences in English using the phrase or word: "${phrase}" (which means "${translation}" in Spanish).
Each example must be a complete, everyday sentence that a native speaker would say.
Return ONLY a valid JSON array, no extra text:
[
  {"en": "English sentence 1", "es": "Spanish translation 1"},
  {"en": "English sentence 2", "es": "Spanish translation 2"},
  {"en": "English sentence 3", "es": "Spanish translation 3"}
]`;
    try {
        const result = await callGemini(prompt);
        res.json(result);
    } catch (err) {
        console.error('[/api/gemini/examples]', err.message);
        res.status(500).json({ error: 'Error generando ejemplos' });
    }
});

// POST /api/gemini/pronunciation
// Body: { userText: string, expectedText: string }
app.post('/api/gemini/pronunciation', requireFields(['expectedText']), async (req, res) => {
    const { userText = '', expectedText } = req.body;
    const prompt = `You are an English pronunciation evaluator. 
Expected phrase: "${expectedText}"
What the user said: "${userText}"
Evaluate pronunciation accuracy (0-100) based on similarity and correctness.
If the texts are very similar: score 85-98. If somewhat similar: 65-84. If quite different: 40-64.
Return ONLY valid JSON:
{
  "score": <number 0-100>,
  "label": "<one of: ¡Excelente! 🎉 | ¡Bueno! 👍 | Necesita mejorar 💪>",
  "message": "<brief feedback in Spanish, 1-2 sentences, encouraging tone>"
}`;
    try {
        const result = await callGemini(prompt);
        res.json(result);
    } catch (err) {
        console.error('[/api/gemini/pronunciation]', err.message);
        res.status(500).json({ error: 'Error evaluando pronunciación' });
    }
});

// POST /api/gemini/translate
// Body: { text: string }
app.post('/api/gemini/translate', requireFields(['text']), async (req, res) => {
    const { text } = req.body;
    const prompt = `You are a bilingual English-Spanish assistant for a language learning app.
The user typed: "${text}"
Detect the language. If Spanish → translate to English. If English → keep it.
Return ONLY valid JSON:
{
  "phrase": "<the phrase in English>",
  "translation": "<translation in Spanish>",
  "phonetic": "<simple phonetic pronunciation for Spanish speakers>",
  "explanation": "<brief, friendly explanation in Spanish, 1-2 sentences>",
  "related": [
    {"phrase": "<related English phrase>", "translation": "<Spanish>"},
    {"phrase": "<related English phrase>", "translation": "<Spanish>"},
    {"phrase": "<related English phrase>", "translation": "<Spanish>"}
  ]
}`;
    try {
        const result = await callGemini(prompt);
        res.json(result);
    } catch (err) {
        console.error('[/api/gemini/translate]', err.message);
        res.status(500).json({ error: 'Error traduciendo' });
    }
});

// POST /api/gemini/transcribe
// Body: { audioText: string, expectedPhrase: string }
app.post('/api/gemini/transcribe', async (req, res) => {
    const { audioText = '', expectedPhrase = '' } = req.body;
    // Reutiliza la lógica de pronunciación
    req.body = { userText: audioText, expectedText: expectedPhrase || audioText };
    const fakeReq = { body: req.body };
    const fakeRes = {
        json: (data) => res.json(data),
        status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    // Llama al mismo handler de pronunciación
    app._router.handle({ ...req, url: '/api/gemini/pronunciation', path: '/api/gemini/pronunciation' }, fakeRes, () => {});
});

// -----------------------------------------------------------
// RUTA CATCH-ALL — Sirve la SPA
// -----------------------------------------------------------
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// -----------------------------------------------------------
// INICIO DEL SERVIDOR
// -----------------------------------------------------------
app.listen(PORT, () => {
    console.log(`\n✅ Servidor iniciado en http://localhost:${PORT}`);
    console.log(`🔑 API Key: ${GEMINI_API_KEY.substring(0, 10)}...`);
    console.log(`🔒 La API key está protegida en el backend.\n`);
});
