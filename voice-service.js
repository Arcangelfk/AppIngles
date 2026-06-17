// ============================================================
//  voice-service.js — Servicio de Voz Unificado (Singleton)
//  Web Speech API: SpeechSynthesis + SpeechRecognition
//
//  Compatibilidad: Chrome 70+, Edge 79+, Safari 14.1+, Firefox 80+
//  Uso:
//    await VoiceService.speak("Hello world");
//    const text = await VoiceService.listenForPractice("Hello world");
// ============================================================

const VoiceService = (() => {

    // --------------------------------------------------------
    // DETECCIÓN DE SOPORTE
    // --------------------------------------------------------
    const SUPPORT = {
        synthesis:   typeof window.speechSynthesis !== 'undefined',
        recognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    };

    // --------------------------------------------------------
    // ESTADO INTERNO
    // --------------------------------------------------------
    let _voices       = [];
    let _englishVoice = null;
    let _isSpeaking   = false;
    let _isListening  = false;
    let _recognition  = null;

    // Callbacks externos (asignables desde app.js)
    const _callbacks = {
        onSpeakStart:   null,
        onSpeakEnd:     null,
        onListenStart:  null,
        onListenEnd:    null,
        onInterim:      null,  // (text) => void
        onError:        null,  // (message) => void
    };

    // --------------------------------------------------------
    // LOG INTERNO
    // --------------------------------------------------------
    const log  = (...args) => console.log('[VoiceService]', ...args);
    const warn = (...args) => console.warn('[VoiceService]', ...args);

    // --------------------------------------------------------
    // TEXTO A VOZ — SpeechSynthesis
    // --------------------------------------------------------

    /**
     * Carga la lista de voces disponibles.
     * Debe llamarse una vez al iniciar la app.
     */
    function loadVoices() {
        if (!SUPPORT.synthesis) return Promise.resolve([]);

        return new Promise(resolve => {
            const tryLoad = () => {
                _voices = window.speechSynthesis.getVoices();
                if (_voices.length > 0) {
                    _englishVoice = _selectBestEnglishVoice(_voices);
                    log(`✅ ${_voices.length} voces cargadas. Voz seleccionada: "${_englishVoice?.name || 'default'}"`);
                    resolve(_voices);
                }
            };
            tryLoad();
            // Chrome necesita el evento voiceschanged
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = tryLoad;
            }
        });
    }

    /**
     * Selecciona la mejor voz en inglés.
     * Prioridad: femenina nativa → masculina nativa → cualquier en-US → cualquier en-*
     */
    function _selectBestEnglishVoice(voices) {
        const enUS       = voices.filter(v => v.lang === 'en-US');
        const enAny      = voices.filter(v => v.lang.startsWith('en'));
        const femaleHint = ['female', 'woman', 'girl', 'samantha', 'victoria', 'karen', 'moira', 'zoe', 'sara', 'alex', 'ava', 'allison', 'kate', 'claire'];

        const isFemale   = v => femaleHint.some(h => v.name.toLowerCase().includes(h));

        return (
            enUS.find(v => isFemale(v) && v.localService)  ||  // Femenina nativa en-US
            enUS.find(v => v.localService)                  ||  // Cualquier nativa en-US
            enUS.find(v => isFemale(v))                     ||  // Femenina en-US (red)
            enUS[0]                                         ||  // Primera en-US
            enAny[0]                                        ||  // Primera en-*
            null
        );
    }

    /** Devuelve la voz seleccionada */
    function getEnglishVoice() { return _englishVoice; }

    /**
     * Lee un texto en inglés.
     * @param {string} text - Texto a leer
     * @param {object} options - { rate, pitch, volume, onInterim }
     * @returns {Promise<void>} Resuelve cuando termina la reproducción
     */
    function speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!SUPPORT.synthesis) {
                warn('SpeechSynthesis no soportado');
                _notify('onError', 'Tu navegador no soporta la reproducción de audio');
                return resolve();
            }
            if (!text?.trim()) return resolve();

            // Cancelar cualquier reproducción anterior
            stop();

            const utt       = new SpeechSynthesisUtterance(text.trim());
            utt.lang        = 'en-US';
            utt.rate        = options.rate   ?? 0.85;
            utt.pitch       = options.pitch  ?? 1;
            utt.volume      = options.volume ?? 1;

            // Asignar voz seleccionada si está disponible
            if (_englishVoice) utt.voice = _englishVoice;

            utt.onstart = () => {
                _isSpeaking = true;
                log(`▶ Speaking: "${text.substring(0, 50)}..."`);
                _notify('onSpeakStart', text);
            };

            utt.onend = () => {
                _isSpeaking = false;
                log('⏹ Speech ended');
                _notify('onSpeakEnd');
                resolve();
            };

            utt.onerror = (e) => {
                _isSpeaking = false;
                // 'interrupted' es normal cuando cancelamos manualmente
                if (e.error !== 'interrupted' && e.error !== 'canceled') {
                    warn('Speech error:', e.error);
                    _notify('onError', `Error de audio: ${e.error}`);
                }
                resolve(); // No rechazar, continuar con la app
            };

            // Workaround bug Chrome: speechSynthesis se pausa si la pestaña pierde foco
            const keepAlive = setInterval(() => {
                if (!_isSpeaking) { clearInterval(keepAlive); return; }
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }, 10000);

            utt.onend = () => {
                _isSpeaking = false;
                clearInterval(keepAlive);
                _notify('onSpeakEnd');
                resolve();
            };

            window.speechSynthesis.speak(utt);
        });
    }

    /** Cancela la reproducción actual inmediatamente */
    function stop() {
        if (SUPPORT.synthesis) {
            window.speechSynthesis.cancel();
            _isSpeaking = false;
        }
    }

    // --------------------------------------------------------
    // VOZ A TEXTO — SpeechRecognition
    // --------------------------------------------------------

    /**
     * Activa el micrófono y espera que el usuario hable.
     * Muestra resultados parciales mientras habla.
     *
     * @param {string} expectedPhrase - Frase que el usuario debe decir
     * @param {object} options - { onInterim, timeout }
     * @returns {Promise<{transcript, score, similarity}>}
     */
    function listenForPractice(expectedPhrase, options = {}) {
        return new Promise((resolve, reject) => {
            if (!SUPPORT.recognition) {
                warn('SpeechRecognition no soportado');
                _notify('onError', 'Tu navegador no soporta el reconocimiento de voz');
                // Devolver el texto esperado como fallback (modo demo)
                return resolve({ transcript: expectedPhrase, score: null, isFallback: true });
            }

            // Asegurar que no hay grabación activa
            stopListening();

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            _recognition = new SpeechRecognition();

            _recognition.lang            = 'en-US';
            _recognition.interimResults  = true;     // Resultados parciales en tiempo real
            _recognition.maxAlternatives = 3;
            _recognition.continuous      = false;

            let finalTranscript = '';
            let interimTranscript = '';
            let resolved = false;

            // Timeout de seguridad (10 segundos máximo)
            const timeout = setTimeout(() => {
                if (!resolved && _recognition) {
                    log('Timeout de grabación');
                    try { _recognition.stop(); } catch (_) {}
                }
            }, options.timeout ?? 10000);

            _recognition.onstart = () => {
                _isListening = true;
                log('🎙 Grabación iniciada');
                _notify('onListenStart');
            };

            _recognition.onresult = (event) => {
                interimTranscript = '';
                finalTranscript   = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const t = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += t;
                    } else {
                        interimTranscript += t;
                    }
                }

                // Notificar resultados parciales en tiempo real
                const current = finalTranscript || interimTranscript;
                if (current) {
                    _notify('onInterim', current);
                    if (options.onInterim) options.onInterim(current);
                }
            };

            _recognition.onend = () => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timeout);
                _isListening = false;
                _recognition = null;

                const transcript = finalTranscript.trim() || interimTranscript.trim();
                log(`✅ Transcripción: "${transcript}"`);
                _notify('onListenEnd', transcript);

                if (!transcript) {
                    _notify('onError', 'No se detectó voz. Inténtalo de nuevo.');
                    return resolve({ transcript: '', score: null, isFallback: false, noVoice: true });
                }

                // Calcular similitud con la frase esperada
                const similarity = _calculateSimilarity(
                    transcript.toLowerCase(),
                    expectedPhrase.toLowerCase()
                );

                resolve({ transcript, similarity, isFallback: false });
            };

            _recognition.onerror = (event) => {
                if (resolved) return;
                clearTimeout(timeout);
                _isListening = false;
                _recognition = null;

                warn('Recognition error:', event.error);

                const errMessages = {
                    'not-allowed':        'Permiso de micrófono denegado. Ve a Configuración del navegador.',
                    'no-speech':          'No se detectó voz. Habla más fuerte y cerca del micrófono.',
                    'audio-capture':      'No se encontró micrófono. Conecta uno e intenta de nuevo.',
                    'network':            'Error de red. Verifica tu conexión a internet.',
                    'aborted':            null, // Cancelación normal
                };

                const msg = errMessages[event.error] ?? `Error: ${event.error}`;
                if (msg) _notify('onError', msg);

                resolved = true;
                resolve({ transcript: '', score: null, isFallback: false, error: event.error });
            };

            // Iniciar grabación
            try {
                _recognition.start();
            } catch (e) {
                warn('No se pudo iniciar la grabación:', e.message);
                resolved = true;
                resolve({ transcript: expectedPhrase, score: null, isFallback: true });
            }
        });
    }

    /** Detiene la grabación activa */
    function stopListening() {
        if (_recognition) {
            try { _recognition.abort(); } catch (_) {}
            _recognition  = null;
            _isListening  = false;
        }
    }

    // --------------------------------------------------------
    // CÁLCULO DE SIMILITUD (Jaccard sobre palabras)
    // --------------------------------------------------------
    function _calculateSimilarity(a, b) {
        if (!a || !b) return 0;
        if (a === b)  return 1;

        // Normalizar: minúsculas, quitar puntuación
        const clean  = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        const wordsA = new Set(clean(a).split(/\s+/).filter(Boolean));
        const wordsB = new Set(clean(b).split(/\s+/).filter(Boolean));

        const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
        const union        = new Set([...wordsA, ...wordsB]).size;

        return union === 0 ? 0 : intersection / union;
    }

    // --------------------------------------------------------
    // SISTEMA DE CALLBACKS
    // --------------------------------------------------------
    function _notify(event, ...args) {
        if (_callbacks[event]) {
            try { _callbacks[event](...args); } catch (e) { warn('Callback error:', e); }
        }
    }

    function on(event, fn) {
        if (event in _callbacks) _callbacks[event] = fn;
        return publicAPI; // Permite chaining
    }

    // --------------------------------------------------------
    // INICIALIZACIÓN AUTOMÁTICA
    // --------------------------------------------------------
    if (SUPPORT.synthesis) {
        // Cargar voces en cuanto estén disponibles
        loadVoices();
        // Algunos navegadores cargan voces en diferido
        window.addEventListener('load', loadVoices, { once: true });
    }

    log(`Soporte — TTS: ${SUPPORT.synthesis}, STT: ${SUPPORT.recognition}`);

    // --------------------------------------------------------
    // API PÚBLICA
    // --------------------------------------------------------
    const publicAPI = {
        // TTS
        speak,
        stop,
        loadVoices,
        getEnglishVoice,

        // STT
        listenForPractice,
        stopListening,

        // Estado (solo lectura)
        get isSpeaking()  { return _isSpeaking;  },
        get isListening() { return _isListening; },

        // Soporte
        get support() { return { ...SUPPORT }; },

        // Calcular similitud (público para uso en gemini-service)
        calculateSimilarity: _calculateSimilarity,

        // Registro de callbacks
        on,
    };

    return publicAPI;

})();
