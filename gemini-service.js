// ============================================================
//  gemini-service.js — Integración con Google Gemini (Vía Backend Proxy)
//  No expone la API key en el frontend.
// ============================================================

const GeminiService = (() => {

    // Si la app se carga vía file://, nos conectamos a localhost:3000
    const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

    async function generateExamples(phrase, translation) {
        console.log(`[GeminiService] Generando ejemplos para: "${phrase}"`);
        try {
            const res = await fetch(`${API_BASE}/api/gemini/examples`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phrase, translation })
            });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error('[GeminiService] Falló generateExamples, usando fallback:', err.message);
            return [
                { en: `I really need to practice using "${phrase}" more often.`, es: `Realmente necesito practicar el uso de "${phrase}" más seguido.` },
                { en: `"${phrase}" is a phrase you'll hear a lot in everyday English.`, es: `"${phrase}" es una frase que escucharás mucho en el inglés cotidiano.` },
                { en: `Once you understand "${phrase}", your English will sound much more natural.`, es: `Una vez que entiendas "${phrase}", tu inglés sonará mucho más natural.` }
            ];
        }
    }

    async function evaluatePronunciation(userText, expectedText) {
        console.log(`[GeminiService] Evaluando pronunciación para: "${expectedText}"`);
        try {
            const res = await fetch(`${API_BASE}/api/gemini/pronunciation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userText, expectedText })
            });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error('[GeminiService] Falló evaluatePronunciation, usando fallback:', err.message);
            // Fallback similitud
            const similarity = calculateSimilarity(userText.toLowerCase(), expectedText.toLowerCase());
            const score = Math.round(similarity * 100);
            return score >= 85
                ? { score, label: '¡Excelente! 🎉', message: 'Tu pronunciación estuvo muy bien. ¡Continúa practicando así!' }
                : score >= 65
                ? { score, label: '¡Muy bien! 👍', message: 'Buen intento. Practica un poco más la entonación.' }
                : { score, label: 'Sigue practicando 💪', message: 'Intenta de nuevo. Escucha el audio primero y repite despacio.' };
        }
    }

    async function translateAndSuggest(text) {
        console.log(`[GeminiService] Traduciendo: "${text}"`);
        try {
            const res = await fetch(`${API_BASE}/api/gemini/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error('[GeminiService] Falló translateAndSuggest, usando fallback:', err.message);
            return {
                phrase: text,
                translation: text,
                phonetic: '(...)',
                explanation: 'No se pudo conectar con la IA. Verifica tu conexión a internet.',
                related: []
            };
        }
    }

    function calculateSimilarity(a, b) {
        if (a === b) return 1;
        if (!a || !b) return 0;
        const wordsA = a.split(/\s+/);
        const wordsB = b.split(/\s+/);
        const common = wordsA.filter(w => wordsB.includes(w)).length;
        return (2 * common) / (wordsA.length + wordsB.length);
    }

    return { generateExamples, evaluatePronunciation, translateAndSuggest };

})();
