// ============================================================
//  app.js — Habla Inglés Real | Lógica completa de la app
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Fallback de seguridad si VoiceService no se cargó o no está disponible
    if (typeof VoiceService === 'undefined') {
        window.VoiceService = {
            speak: () => Promise.resolve(),
            stop: () => {},
            stopListening: () => {},
            listenForPractice: () => Promise.resolve({ transcript: '', similarity: 0, isFallback: true }),
            on: () => { return window.VoiceService; },
            support: { recognition: false, synthesis: false }
        };
    }

    lucide.createIcons();

    // --------------------------------------------------------
    // BASE DE DATOS MOCKEADA (localStorage)
    // --------------------------------------------------------
    const DB = {
        getUsers: () => {
            const u = JSON.parse(localStorage.getItem('hir_users') || '{}');
            for (const phone in u) {
                if (!u[phone].plan) u[phone].plan = 'free';
            }
            return u;
        },
        setUsers: (u) => localStorage.setItem('hir_users', JSON.stringify(u)),
        getSession: () => {
            const s = JSON.parse(localStorage.getItem('hir_session') || 'null');
            if (s && !s.plan) s.plan = 'free';
            return s;
        },
        setSession: (s) => localStorage.setItem('hir_session', JSON.stringify(s)),
        clearSession: () => localStorage.removeItem('hir_session'),
        getSaved: () => JSON.parse(localStorage.getItem('hir_saved') || '{"words":[],"expressions":[],"phrases":[]}'),
        setSaved: (s) => localStorage.setItem('hir_saved', JSON.stringify(s)),
        getHistorial: () => JSON.parse(localStorage.getItem('hir_historial') || '[]'),
        addHistorial: (item) => {
            const h = DB.getHistorial();
            h.unshift({ ...item, date: new Date().toLocaleDateString('es-CO') });
            localStorage.setItem('hir_historial', JSON.stringify(h.slice(0, 30)));
        }
    };

    // --------------------------------------------------------
    // DATOS DE CONTENIDO MOCKEADO
    // --------------------------------------------------------
    const TOPICS_DATA = {
        'frases-comunes': {
            label: 'Frases comunes',
            items: [
                { phrase: 'How would it be?', translation: '¿Cómo sería?', phonetic: '/hau wud it bi/', type: 'expresión' },
                { phrase: 'Once in a while', translation: 'De vez en cuando', phonetic: '/wʌns ɪn ə waɪl/', type: 'expresión' },
                { phrase: 'By the way', translation: 'Por cierto / A propósito', phonetic: '/baɪ ðə weɪ/', type: 'expresión' },
                { phrase: 'Get used to', translation: 'Acostumbrarse a', phonetic: '/ɡɛt juːzd tuː/', type: 'expresión' },
                { phrase: 'It depends', translation: 'Depende', phonetic: '/ɪt dɪˈpɛndz/', type: 'frase' },
                { phrase: 'In other words', translation: 'En otras palabras', phonetic: '/ɪn ˈʌðər wɜːrdz/', type: 'expresión' },
                { phrase: 'At the end of the day', translation: 'Al final del día', phonetic: '/æt ðə ɛnd əv ðə deɪ/', type: 'expresión' },
            ]
        },
        'phrasal-verbs': {
            label: 'Phrasal Verbs',
            items: [
                { phrase: 'Give up', translation: 'Rendirse / Abandonar', phonetic: '/ɡɪv ʌp/', type: 'phrasal verb' },
                { phrase: 'Look forward to', translation: 'Esperar con ansias', phonetic: '/lʊk ˈfɔːrwərd tuː/', type: 'phrasal verb' },
                { phrase: 'Figure out', translation: 'Descubrir / Entender', phonetic: '/ˈfɪɡjər aʊt/', type: 'phrasal verb' },
                { phrase: 'Carry on', translation: 'Continuar', phonetic: '/ˈkæri ɒn/', type: 'phrasal verb' },
                { phrase: 'Put off', translation: 'Posponer', phonetic: '/pʊt ɒf/', type: 'phrasal verb' },
            ]
        },
        'verbos': {
            label: 'Verbos',
            items: [
                { phrase: 'To achieve', translation: 'Lograr / Alcanzar', phonetic: '/tuː əˈtʃiːv/', type: 'verbo' },
                { phrase: 'To manage', translation: 'Gestionar / Lograr hacer', phonetic: '/tuː ˈmænɪdʒ/', type: 'verbo' },
                { phrase: 'To rely on', translation: 'Confiar en / Depender de', phonetic: '/tuː rɪˈlaɪ ɒn/', type: 'verbo' },
                { phrase: 'To improve', translation: 'Mejorar', phonetic: '/tuː ɪmˈpruːv/', type: 'verbo' },
            ]
        },
        'expresiones': {
            label: 'Expresiones',
            items: [
                { phrase: 'As a matter of fact', translation: 'De hecho', phonetic: '/æz ə ˈmætər əv fækt/', type: 'expresión' },
                { phrase: 'Keep in mind', translation: 'Tener en cuenta', phonetic: '/kiːp ɪn maɪnd/', type: 'expresión' },
                { phrase: 'That being said', translation: 'Dicho esto', phonetic: '/ðæt ˈbiːɪŋ sɛd/', type: 'expresión' },
                { phrase: 'On the other hand', translation: 'Por otro lado', phonetic: '/ɒn ðiː ˈʌðər hænd/', type: 'expresión' },
            ]
        },
        'trabajo': {
            label: 'Inglés para trabajo',
            items: [
                { phrase: "I'd like to request", translation: 'Me gustaría solicitar', phonetic: '/aɪd laɪk tuː rɪˈkwɛst/', type: 'frase' },
                { phrase: 'As per your request', translation: 'Según lo solicitado', phonetic: '/æz pɜːr jɔːr rɪˈkwɛst/', type: 'frase' },
                { phrase: 'Looking forward to hearing from you', translation: 'En espera de su respuesta', phonetic: '/ˈlʊkɪŋ ˈfɔːrwərd tuː ˈhɪərɪŋ frʌm juː/', type: 'frase' },
            ]
        },
        'viajes': {
            label: 'Inglés para viajes',
            items: [
                { phrase: 'Where is the nearest...?', translation: '¿Dónde está el/la ... más cercano/a?', phonetic: '/wɛr ɪz ðə ˈnɪərɪst/', type: 'frase' },
                { phrase: 'Can I have a room, please?', translation: '¿Me puede dar una habitación?', phonetic: '/kæn aɪ hæv ə ruːm pliːz/', type: 'frase' },
                { phrase: 'How much does it cost?', translation: '¿Cuánto cuesta?', phonetic: '/haʊ mʌtʃ dʌz ɪt kɒst/', type: 'frase' },
            ]
        },
        'otros': {
            label: 'Otros temas',
            items: [
                { phrase: 'Coming soon...', translation: 'Próximamente...', phonetic: '/ˈkʌmɪŋ suːn/', type: 'frase' },
            ]
        }
    };

    const EXAMPLES_DATA = {
        'How would it be?': [
            { en: 'How would it be if we moved tomorrow?', es: '¿Cómo sería si nos mudáramos mañana?' },
            { en: 'How would it be if you changed jobs?', es: '¿Cómo sería si cambiaras de trabajo?' },
            { en: 'How would it be if we started today?', es: '¿Cómo sería si empezáramos hoy?' },
        ],
        'default': [
            { en: 'I use this expression every day.', es: 'Uso esta expresión todos los días.' },
            { en: 'It is very important to practice it.', es: 'Es muy importante practicarla.' },
            { en: 'Can you say it one more time?', es: '¿Puedes decirlo una vez más?' },
        ]
    };

    // --------------------------------------------------------
    // ESTADO GLOBAL
    // --------------------------------------------------------
    let currentScreen = 'mod-home';
    let currentItem   = null;
    let currentTopic  = null;
    let currentSavedTab = 'words';
    let isRecording   = false;

    // --------------------------------------------------------
    // VOICE SERVICE — Configurar callbacks globales
    // --------------------------------------------------------
    if (typeof VoiceService !== 'undefined') {
        VoiceService.on('onError', (msg) => showToast(msg));
        VoiceService.on('onSpeakStart', () => {
            // Feedback visual: resaltar botón Escuchar activo
            document.querySelectorAll('[data-speak],[data-saved-listen],[id="btnEscuchar"]').forEach(b => b.classList.add('opacity-60'));
        });
        VoiceService.on('onSpeakEnd', () => {
            document.querySelectorAll('[data-speak],[data-saved-listen],[id="btnEscuchar"]').forEach(b => b.classList.remove('opacity-60'));
        });
    }

    // Delegar clicks de "Escuchar" en cualquier botón data-speak
    document.addEventListener('click', (e) => {
        const speakBtn  = e.target.closest('[data-speak]');
        if (speakBtn)  { VoiceService.speak(speakBtn.dataset.speak); return; }
        const listenBtn = e.target.closest('[data-saved-listen]');
        if (listenBtn) { VoiceService.speak(listenBtn.dataset.savedListen); return; }
    });

    // --------------------------------------------------------
    // AUTH
    // --------------------------------------------------------
    const authContainer = document.getElementById('authContainer');
    const appContainer  = document.getElementById('appContainer');
    const loginView     = document.getElementById('loginView');
    const registerView  = document.getElementById('registerView');

    document.getElementById('goRegister').addEventListener('click', () => {
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
    });
    document.getElementById('goLogin').addEventListener('click', () => {
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
    });

    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name  = document.getElementById('regName').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const pass  = document.getElementById('regPass').value.trim();
        const users = DB.getUsers();
        const errEl = document.getElementById('regError');
        const okEl  = document.getElementById('regSuccess');
        if (users[phone]) { errEl.classList.remove('hidden'); okEl.classList.add('hidden'); return; }
        errEl.classList.add('hidden');
        users[phone] = { name, phone, password: pass, email: '', country: 'CO', level: 'A2', plan: 'free' };
        DB.setUsers(users);
        okEl.classList.remove('hidden');
        setTimeout(() => { registerView.classList.add('hidden'); loginView.classList.remove('hidden'); okEl.classList.add('hidden'); document.getElementById('loginPhone').value = phone; }, 1500);
    });

    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = document.getElementById('loginPhone').value.trim();
        const pass  = document.getElementById('loginPass').value.trim();
        const users = DB.getUsers();
        const errEl = document.getElementById('loginError');
        if (users[phone] && users[phone].password === pass) {
            errEl.classList.add('hidden');
            DB.setSession(users[phone]);
            launchApp(users[phone]);
        } else {
            errEl.classList.remove('hidden');
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        DB.clearSession();
        authContainer.classList.remove('hidden');
        appContainer.classList.add('opacity-0');
        setTimeout(() => { appContainer.classList.add('hidden'); appContainer.classList.remove('flex'); authContainer.classList.remove('opacity-0'); }, 400);
    });

    function launchApp(user) {
        authContainer.classList.add('opacity-0');
        setTimeout(() => {
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden', 'opacity-0');
            appContainer.classList.add('flex');
            populateUserUI(user);
            updateHomeTotalWords();
            lucide.createIcons();
        }, 400);
    }

    function populateUserUI(user) {
        const firstName = user.name.split(' ')[0];
        safeSet('homeGreetName', firstName);
        safeSet('profileNameDisplay', user.name);
        safeSet('profilePhoneDisplay', '+57 ' + user.phone);
        
        // Actualizar Badge del plan en el perfil
        const planBadge = document.getElementById('profilePlanBadge');
        if (planBadge) {
            const plan = user.plan || 'free';
            if (plan === 'free') {
                planBadge.textContent = 'Plan Gratuito';
                planBadge.className = 'mt-3 px-3 py-1 bg-white/10 text-gray-300 border border-white/10 rounded-full text-xs';
            } else if (plan === 'monthly') {
                planBadge.textContent = 'Premium Mensual';
                planBadge.className = 'mt-3 px-3 py-1 bg-accent/20 text-accentLight border border-accentLight/30 rounded-full text-xs font-semibold';
            } else if (plan === 'annual') {
                planBadge.textContent = 'Premium Anual';
                planBadge.className = 'mt-3 px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-xs font-bold';
            }
        }
    }

    // Auto-login si existe sesión
    const sess = DB.getSession();
    if (sess) {
        authContainer.classList.add('hidden', 'opacity-0');
        appContainer.classList.remove('hidden', 'opacity-0');
        appContainer.classList.add('flex');
        populateUserUI(sess);
        updateHomeTotalWords();
    }

    // --------------------------------------------------------
    // NAVEGACIÓN GENERAL (pantallas y nav)
    // --------------------------------------------------------
    function showScreen(id) {
        // Cancelar audio/grabación al cambiar de pantalla
        VoiceService.stop();
        VoiceService.stopListening();

        document.querySelectorAll('.screen').forEach(s => {
            s.classList.add('hidden');
            s.classList.remove('flex');
        });
        const target = document.getElementById(id);
        if (!target) return;
        target.classList.remove('hidden');
        target.classList.add('flex');
        currentScreen = id;

        // Actualizar nav activo
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('text-accentLight', 'active-nav');
            b.classList.add('text-gray-500');
        });
        const activeNav = document.querySelector(`.nav-btn[data-target="${id}"]`);
        if (activeNav) { activeNav.classList.add('text-accentLight', 'active-nav'); activeNav.classList.remove('text-gray-500'); }

        // Acciones al entrar a pantallas específicas
        if (id === 'mod-guardados') renderSaved(currentSavedTab);
        if (id === 'mod-historial') renderHistorial();
        if (id === 'mod-ajustes')   refreshProfileModal();
        if (id === 'mod-home')      updateHomeTotalWords();
    }

    // Delegar clicks de navegación
    document.addEventListener('click', (e) => {
        // nav-btn (bottom nav y tarjetas de home)
        const navBtn = e.target.closest('.nav-btn');
        if (navBtn) {
            const target = navBtn.getAttribute('data-target');
            if (target) { showScreen(target); return; }
        }
        // back-btn
        const backBtn = e.target.closest('.back-btn');
        if (backBtn) {
            const back = backBtn.getAttribute('data-back');
            if (back) { showScreen(back); return; }
        }
        // Tarjetas de tema
        const topicBtn = e.target.closest('.topic-btn');
        if (topicBtn) { openTopic(topicBtn.dataset.topic, topicBtn.dataset.label); return; }
        // Ítems del listado
        const itemBtn = e.target.closest('.listado-item');
        if (itemBtn) {
            const idx = parseInt(itemBtn.dataset.idx);
            const topic = TOPICS_DATA[currentTopic];
            if (topic) openPracticeItem(topic.items[idx], topic.label);
            return;
        }
        // Tabs de ejemplos
        const exTab = e.target.closest('.ex-tab');
        if (exTab) { switchExTab(parseInt(exTab.dataset.ex)); return; }
        // Tabs de guardados
        const savedTab = e.target.closest('.saved-tab');
        if (savedTab) { switchSavedTab(savedTab.dataset.savedTab); return; }
    });

    // --------------------------------------------------------
    // TEMAS Y LISTADO
    // --------------------------------------------------------
    function openTopic(topicKey, topicLabel) {
        currentTopic = topicKey;
        const data = TOPICS_DATA[topicKey];
        if (!data) return;
        safeSet('listadoTitle', data.label);
        const container = document.getElementById('listadoItems');
        container.innerHTML = data.items.map((item, i) => `
            <div class="listado-item bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors" data-idx="${i}">
                <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm">${item.phrase}</p>
                    <p class="text-gray-400 text-xs truncate">${item.translation} · <span class="font-mono">${item.phonetic}</span></p>
                </div>
                <i data-lucide="chevron-right" class="w-4 h-4 text-gray-500 shrink-0"></i>
            </div>
        `).join('');
        lucide.createIcons();
        showScreen('mod-listado');
    }

    // --------------------------------------------------------
    // PANTALLA DE PRÁCTICA DE ÍTEM
    // --------------------------------------------------------
    function openPracticeItem(item, categoryLabel) {
        currentItem = item;
        safeSet('practiceItemCategory', categoryLabel);
        safeSet('practicePhrase', item.phrase);
        safeSet('practiceTranslation', item.translation);
        safeSet('practicePhonetic', item.phonetic);
        showScreen('mod-practica-item');
        DB.addHistorial({ phrase: item.phrase, translation: item.translation });
    }

    // Botón "Escuchar" en pantalla de práctica de ítem
    document.getElementById('btnEscuchar')?.addEventListener('click', () => {
        if (!currentItem) return;
        VoiceService.speak(currentItem.phrase);
    });

    document.getElementById('btnPracticar')?.addEventListener('click', () => {
        if (!currentItem) return;
        safeSet('pronPhrase', currentItem.phrase);
        safeSet('pronPhonetic', currentItem.phonetic);
        resetPronunciacion();
        showScreen('mod-pronunciacion');
    });

    document.getElementById('btnEjemplos')?.addEventListener('click', () => {
        if (!currentItem) return;
        openEjemplos(currentItem.phrase);
        showScreen('mod-ejemplos');
    });

    document.getElementById('btnGuardar')?.addEventListener('click', () => {
        if (!currentItem) return;
        openSaveModal(currentItem);
    });

    document.getElementById('practiceDayWord')?.addEventListener('click', () => {
        currentItem = { phrase: 'Eventually', translation: 'Finalmente', phonetic: '/ɪˈven.tʃu.ə.li/', type: 'verbo' };
        safeSet('pronPhrase', currentItem.phrase);
        safeSet('pronPhonetic', currentItem.phonetic);
        resetPronunciacion();
        showScreen('mod-pronunciacion');
    });

    // Botón "Escuchar pronunciación" dentro de la pantalla de grabación
    document.getElementById('pronListenBtn')?.addEventListener('click', () => {
        const phrase = document.getElementById('pronPhrase')?.textContent?.trim();
        if (phrase) VoiceService.speak(phrase);
    });

    // --------------------------------------------------------
    // PRONUNCIACIÓN — VoiceService (STT real + Gemini evaluación)
    // --------------------------------------------------------
    function resetPronunciacion() {
        VoiceService.stopListening();
        isRecording = false;

        const waitEl   = document.getElementById('pronWaiting');
        const resultEl = document.getElementById('pronResult');
        const interimEl = document.getElementById('pronInterim');

        if (waitEl)   waitEl.classList.remove('hidden');
        if (resultEl) { resultEl.classList.add('hidden'); resultEl.innerHTML = ''; }
        if (interimEl) interimEl.textContent = '';

        const btn  = document.getElementById('recordPronBtn');
        const text = document.getElementById('recordPronText');
        if (btn)  btn.classList.remove('recording');
        if (text) text.textContent = VoiceService.support.recognition ? 'Grabar' : 'Evaluar';
    }

    document.getElementById('recordPronBtn')?.addEventListener('click', async () => {
        if (isRecording) { VoiceService.stopListening(); return; }

        const sess = DB.getSession();
        if (sess && (!sess.plan || sess.plan === 'free')) {
            const today = new Date().toLocaleDateString('es-CO');
            if (sess.lastPronDate === today && (sess.dailyPronCount || 0) >= 5) {
                showToast('Límite de 5 prácticas diarias alcanzado. ¡Pásate a Premium!');
                setTimeout(() => {
                    document.getElementById('openPlanesBtn')?.click();
                }, 1200);
                return;
            }
        }

        const expectedPhrase = document.getElementById('pronPhrase')?.textContent?.trim() || '';
        if (!expectedPhrase) return;

        const btn      = document.getElementById('recordPronBtn');
        const text     = document.getElementById('recordPronText');
        const interimEl = document.getElementById('pronInterim');

        // UI: Modo grabando
        isRecording = true;
        if (btn)  btn.classList.add('recording');
        if (text) text.textContent = VoiceService.support.recognition ? 'Escuchando...' : 'Evaluando...';
        if (interimEl) interimEl.textContent = '';

        // Mostrar resultados parciales en tiempo real
        VoiceService.on('onInterim', (partial) => {
            if (interimEl) {
                interimEl.textContent = `“${partial}”`;
                interimEl.classList.remove('hidden');
            }
        });

        // Llamar a VoiceService (graba voz real o fallback demo)
        const result = await VoiceService.listenForPractice(expectedPhrase);

        // Limpiar estado de grabación
        isRecording = false;
        if (btn)  btn.classList.remove('recording');
        if (text) text.textContent = VoiceService.support.recognition ? 'Grabar' : 'Evaluar';
        VoiceService.on('onInterim', null); // Desregistrar callback temporal

        // Si no se detectó voz y no fue fallback, no hacer nada
        if (result.noVoice) return;

        const transcript = result.isFallback ? expectedPhrase : (result.transcript || expectedPhrase);
        showPronResult(transcript, expectedPhrase);
    });

    function showPronResult(userSpoke, expectedPhrase) {
        document.getElementById('pronWaiting')?.classList.add('hidden');
        const resultEl = document.getElementById('pronResult');
        if (!resultEl) return;

        resultEl.classList.remove('hidden');
        resultEl.classList.add('flex', 'flex-col', 'items-center');
        resultEl.innerHTML = `
            <div class="flex flex-col items-center py-8">
                <div class="w-12 h-12 border-4 border-accentLight border-t-transparent rounded-full animate-spin mb-4"></div>
                <p class="text-gray-400 text-sm">La IA está evaluando tu pronunciación...</p>
                ${userSpoke !== expectedPhrase ? `<p class="text-xs text-gray-600 mt-2">Detectado: &ldquo;${userSpoke}&rdquo;</p>` : ''}
            </div>
        `;

        GeminiService.evaluatePronunciation(userSpoke, expectedPhrase).then(result => {
            const { score, label, message } = result;

            // Incrementar contador de práctica diaria si es plan gratuito
            const sess = DB.getSession();
            if (sess && (!sess.plan || sess.plan === 'free')) {
                const today = new Date().toLocaleDateString('es-CO');
                const users = DB.getUsers();
                if (sess.lastPronDate === today) {
                    sess.dailyPronCount = (sess.dailyPronCount || 0) + 1;
                } else {
                    sess.lastPronDate = today;
                    sess.dailyPronCount = 1;
                }
                users[sess.phone] = sess;
                DB.setSession(sess);
                DB.setUsers(users);
            }

            let borderColor = score >= 90 ? 'border-success' : score >= 70 ? 'border-warn' : 'border-red-400';

            resultEl.innerHTML = `
                <div class="w-28 h-28 rounded-full flex flex-col items-center justify-center mb-4 border-4 ${borderColor} shadow-xl fade-in-up">
                    <span class="text-4xl font-black">${score}%</span>
                </div>
                <h3 class="text-2xl font-bold mb-2 fade-in-up">${label}</h3>
                <p class="text-gray-400 text-sm text-center mb-2 leading-relaxed fade-in-up">${message}</p>
                ${userSpoke !== expectedPhrase ? `<p class="text-xs text-gray-600 mb-6 italic">Dijiste: &ldquo;${userSpoke}&rdquo;</p>` : '<div class="mb-6"></div>'}
                <div class="w-full space-y-3 fade-in-up">
                    <button id="pronRetryBtn" class="w-full py-3.5 bg-white/10 hover:bg-white/20 rounded-2xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                        <i data-lucide="rotate-cw" class="w-4 h-4"></i> Intentar de nuevo
                    </button>
                    <button id="pronEjemplosBtn" class="w-full py-3.5 bg-warn/20 hover:bg-warn/30 border border-warn/30 rounded-2xl font-semibold text-sm text-warn transition-colors flex items-center justify-center gap-2">
                        <i data-lucide="sparkles" class="w-4 h-4"></i> Ver ejemplos con IA
                    </button>
                </div>
            `;
            lucide.createIcons();
            document.getElementById('pronRetryBtn')?.addEventListener('click', resetPronunciacion);
            document.getElementById('pronEjemplosBtn')?.addEventListener('click', () => {
                if (!currentItem) return;
                openEjemplos(currentItem.phrase);
                showScreen('mod-ejemplos');
            });
        });
    }

    // --------------------------------------------------------
    // EJEMPLOS POR IA
    // --------------------------------------------------------
    let currentExamples = [];
    let currentExIdx = 0;

    function openEjemplos(phrase) {
        // Placeholder mientras carga la IA
        currentExamples = [
            { en: 'loading', es: '' },
            { en: 'loading', es: '' },
            { en: 'loading', es: '' }
        ];
        currentExIdx = 0;

        // Resetear tabs
        document.querySelectorAll('.ex-tab').forEach((t, i) => {
            t.classList.toggle('bg-accent', i === 0);
            t.classList.toggle('text-white', i === 0);
            t.classList.toggle('bg-white/10', i !== 0);
            t.classList.toggle('text-gray-400', i !== 0);
        });

        // Mostrar spinner inicial
        renderExample(0);
        GeminiService.generateExamples(phrase, currentItem?.translation || '').then(examples => {
            if (Array.isArray(examples) && examples.length >= 3) currentExamples = examples.slice(0, 3);
            if (currentExIdx < 3) renderExample(currentExIdx);
        });
    }

    function renderExample(idx) {
        const ex = currentExamples[idx];
        const container = document.getElementById('examplesContainer');
        if (!ex || ex.en === 'loading') {
            container.innerHTML = `<div class="flex flex-col items-center py-10"><div class="w-12 h-12 border-4 border-warn border-t-transparent rounded-full animate-spin mb-4"></div><p class="text-gray-400 text-sm">La IA está generando ejemplos...</p></div>`;
            return;
        }
        _renderExampleCard(container, ex, idx);
    }

    function _renderExampleCard(container, ex, idx) {
        container.innerHTML = `
            <div class="bg-gradient-to-br from-warn/20 to-amber-500/10 border border-warn/20 rounded-3xl p-7 text-center mb-4 fade-in-up">
                <p class="text-[10px] text-gray-400 uppercase tracking-widest mb-3">Ejemplo ${idx + 1}</p>
                <h3 class="text-2xl font-bold leading-snug mb-3">&ldquo;${ex.en}&rdquo;</h3>
                <p class="text-warn text-sm">&ldquo;${ex.es}&rdquo;</p>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <button class="ex-action py-3 bg-neon/20 border border-neon/30 rounded-2xl text-sm font-semibold text-neon flex items-center justify-center gap-1.5" data-action="listen" data-speak="${ex.en}">
                    <i data-lucide="volume-2" class="w-4 h-4"></i> Escuchar
                </button>
                <button class="ex-action py-3 bg-accent/80 hover:bg-accent rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5" data-action="practice">
                    <i data-lucide="mic" class="w-4 h-4"></i> Practicar
                </button>
                <button class="ex-action py-3 bg-success/20 border border-success/30 rounded-2xl text-sm font-semibold text-success flex items-center justify-center gap-1.5" data-action="save-phrase">
                    <i data-lucide="bookmark-plus" class="w-4 h-4"></i> Guardar oración
                </button>
                <button class="ex-action py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-semibold text-gray-300 flex items-center justify-center gap-1.5" data-action="save-words">
                    <i data-lucide="bookmark" class="w-4 h-4"></i> Guardar palabras
                </button>
            </div>
        `;
        lucide.createIcons();
        container.querySelectorAll('.ex-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'listen') { VoiceService.speak(ex.en); return; }
                if (action === 'practice') {
                    currentItem = { phrase: ex.en, translation: ex.es, phonetic: '', type: 'frase' };
                    safeSet('pronPhrase', ex.en);
                    safeSet('pronPhonetic', '');
                    resetPronunciacion();
                    showScreen('mod-pronunciacion');
                }
                if (action === 'save-phrase') { quickSave('phrases', ex.en); showToast('¡Oración guardada!'); }
                if (action === 'save-words') { openSaveModal({ phrase: ex.en, translation: ex.es, phonetic: '', type: 'frase' }); }
            });
        });
    }

    function switchExTab(idx) {
        currentExIdx = idx;
        document.querySelectorAll('.ex-tab').forEach((t, i) => {
            t.classList.toggle('bg-accent', i === idx);
            t.classList.toggle('text-white', i === idx);
            t.classList.toggle('bg-white/10', i !== idx);
            t.classList.toggle('text-gray-400', i !== idx);
        });
        renderExample(idx);
    }

    // --------------------------------------------------------
    // PRÁCTICA LIBRE
    // --------------------------------------------------------
    document.getElementById('libreSubmit')?.addEventListener('click', handleLibreSubmit);
    document.getElementById('libreInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLibreSubmit(); });

    function handleLibreSubmit() {
        const input  = document.getElementById('libreInput');
        const query  = input.value.trim();
        if (!query) return;
        input.value  = '';
        const history = document.getElementById('libreHistory');

        // Limpiar placeholder
        if (history.querySelector('div.text-center')) history.innerHTML = '';

        // Mensaje del usuario
        history.innerHTML += `
            <div class="flex justify-end">
                <div class="bg-accent/80 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]">
                    <p class="text-sm font-medium">${query}</p>
                </div>
            </div>
        `;

        // Spinner de IA
        const spinnerId = 'ia-spinner-' + Date.now();
        history.innerHTML += `
            <div id="${spinnerId}" class="flex justify-start">
                <div class="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                    <div class="w-4 h-4 border-2 border-accentLight border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-xs text-gray-400">La IA está pensando...</span>
                </div>
            </div>
        `;
        history.scrollTop = history.scrollHeight;

        // Llamar a Gemini real
        GeminiService.translateAndSuggest(query).then(suggestion => {
            // Quitar spinner
            document.getElementById(spinnerId)?.remove();

            history.innerHTML += `
                <div class="flex justify-start fade-in-up">
                    <div class="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[90%] space-y-1">
                        <div class="flex items-center gap-1 mb-1">
                            <i data-lucide="sparkles" class="w-3 h-3 text-warn"></i>
                            <span class="text-[10px] text-warn font-semibold uppercase">IA sugiere</span>
                        </div>
                        <p class="font-bold text-white">${suggestion.phrase}</p>
                        <p class="text-accentLight text-xs">${suggestion.phonetic}</p>
                        <p class="text-gray-400 text-xs">${suggestion.translation}</p>
                        ${suggestion.explanation ? `<p class="text-gray-500 text-xs mt-1 italic">${suggestion.explanation}</p>` : ''}
                    </div>
                </div>
                <button class="use-libre-phrase w-full py-3 bg-accent/20 hover:bg-accent/40 border border-accent/30 rounded-xl text-sm font-bold text-accentLight transition-colors"
                    data-phrase="${suggestion.phrase}"
                    data-translation="${suggestion.translation}"
                    data-phonetic="${suggestion.phonetic}">
                    Usar esta frase →
                </button>
            `;
            lucide.createIcons();

            // Frases relacionadas
            if (suggestion.related?.length) {
                history.innerHTML += `
                    <div class="flex flex-wrap gap-2 mt-1">
                        ${suggestion.related.map(r => `
                            <button class="use-libre-phrase px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors" data-phrase="${r.phrase}" data-translation="${r.translation}" data-phonetic="">
                                ${r.phrase}
                            </button>
                        `).join('')}
                    </div>
                `;
            }

            document.querySelectorAll('.use-libre-phrase').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentItem = { phrase: btn.dataset.phrase, translation: btn.dataset.translation, phonetic: btn.dataset.phonetic, type: 'frase' };
                    openPracticeItem(currentItem, 'Práctica libre');
                });
            });

            history.scrollTop = history.scrollHeight;
        });
    }

    function generateSuggestion(query) {
        const map = {
            'cómo sería': { phrase: 'How would it be?', translation: '¿Cómo sería?', phonetic: '/hau wud it bi/' },
            'de vez en cuando': { phrase: 'Once in a while', translation: 'De vez en cuando', phonetic: '/wʌns ɪn ə waɪl/' },
            'por cierto': { phrase: 'By the way', translation: 'Por cierto', phonetic: '/baɪ ðə weɪ/' },
            'rendirse': { phrase: 'Give up', translation: 'Rendirse / Abandonar', phonetic: '/ɡɪv ʌp/' },
            'lograr': { phrase: 'To achieve', translation: 'Lograr / Alcanzar', phonetic: '/tuː əˈtʃiːv/' },
        };
        const key = query.toLowerCase();
        for (const k in map) { if (key.includes(k)) return map[k]; }
        return { phrase: `"${query}" in English`, translation: query, phonetic: '/.../' };
    }

    // --------------------------------------------------------
    // MIS GUARDADOS
    // --------------------------------------------------------
    function quickSave(type, text) {
        const sess = DB.getSession();
        const saved = DB.getSaved();
        
        if (type === 'words' && (!sess || !sess.plan || sess.plan === 'free')) {
            if ((saved.words?.length || 0) >= 20) {
                showToast('Límite de 20 palabras alcanzado. ¡Pásate a Premium!');
                setTimeout(() => {
                    document.getElementById('openPlanesBtn')?.click();
                }, 1200);
                return;
            }
        }
        
        if (!saved[type].includes(text)) {
            saved[type].push(text);
            DB.setSaved(saved);
            updateHomeTotalWords();
        }
    }

    function switchSavedTab(tab) {
        currentSavedTab = tab;
        document.querySelectorAll('.saved-tab').forEach(t => {
            const isActive = t.dataset.savedTab === tab;
            t.classList.toggle('bg-accent/80', isActive);
            t.classList.toggle('text-white', isActive);
            t.classList.toggle('bg-white/5', !isActive);
            t.classList.toggle('text-gray-400', !isActive);
        });
        renderSaved(tab);
    }

    function renderSaved(tab) {
        const saved = DB.getSaved();
        const items = saved[tab] || [];
        const container = document.getElementById('savedContent');
        if (!container) return;
        if (items.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-600 text-sm mt-12">
                    <i data-lucide="bookmark" class="w-10 h-10 mx-auto mb-2 opacity-40"></i>
                    <p>No tienes ${tab === 'words' ? 'palabras' : tab === 'expressions' ? 'expresiones' : 'frases'} guardadas</p>
                </div>`;
            lucide.createIcons();
            return;
        }
        container.innerHTML = items.map((item, i) => `
            <div class="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <p class="flex-1 text-sm font-medium">${item}</p>
                <div class="flex items-center gap-2 shrink-0">
                    <button class="p-2 bg-neon/10 hover:bg-neon/20 rounded-lg text-neon transition-colors" data-saved-listen="${item}">
                        <i data-lucide="volume-2" class="w-4 h-4"></i>
                    </button>
                    <button class="p-2 bg-accent/10 hover:bg-accent/20 rounded-lg text-accentLight transition-colors" data-saved-practice="${item}" data-saved-type="${tab}">
                        <i data-lucide="mic" class="w-4 h-4"></i>
                    </button>
                    <button class="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors" data-saved-delete="${i}" data-saved-tab="${tab}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `).join('');
        lucide.createIcons();

        // Delete handlers
        container.querySelectorAll('[data-saved-delete]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.savedDelete);
                const savedTab = btn.dataset.savedTab;
                const s = DB.getSaved();
                s[savedTab].splice(idx, 1);
                DB.setSaved(s);
                renderSaved(savedTab);
                updateHomeTotalWords();
            });
        });

        // Practice handlers
        container.querySelectorAll('[data-saved-practice]').forEach(btn => {
            btn.addEventListener('click', () => {
                currentItem = { phrase: btn.dataset.savedPractice, translation: '', phonetic: '', type: btn.dataset.savedType };
                safeSet('pronPhrase', currentItem.phrase);
                safeSet('pronPhonetic', currentItem.phonetic);
                resetPronunciacion();
                showScreen('mod-pronunciacion');
            });
        });
    }

    function updateHomeTotalWords() {
        const saved = DB.getSaved();
        const total = (saved.words?.length || 0) + (saved.expressions?.length || 0) + (saved.phrases?.length || 0);
        safeSet('homeTotalWords', total);
    }

    // --------------------------------------------------------
    // HISTORIAL
    // --------------------------------------------------------
    function renderHistorial() {
        const historial = DB.getHistorial();
        const container = document.getElementById('historialContent');
        if (!container) return;
        if (historial.length === 0) { container.innerHTML = `<div class="text-center text-gray-600 text-sm mt-12"><i data-lucide="clock" class="w-10 h-10 mx-auto mb-2 opacity-40"></i><p>Tu historial aparecerá aquí</p></div>`; lucide.createIcons(); return; }
        container.innerHTML = historial.map(h => `
            <div class="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/10">
                <div class="flex-1">
                    <p class="font-semibold text-sm">${h.phrase}</p>
                    <p class="text-gray-400 text-xs">${h.translation} · ${h.date}</p>
                </div>
                <i data-lucide="chevron-right" class="w-4 h-4 text-gray-500"></i>
            </div>`).join('');
        lucide.createIcons();
    }

    // --------------------------------------------------------
    // MODAL GUARDAR
    // --------------------------------------------------------
    function openSaveModal(item) {
        const modal = document.getElementById('saveModal');
        const opts  = document.getElementById('saveOptions');
        const words = item.phrase.split(' ').filter(w => w.length > 2);

        opts.innerHTML = `
            <div>
                <p class="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Oración completa</p>
                <button class="save-opt w-full text-left py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors" data-type="phrases" data-val="${item.phrase}">
                    " ${item.phrase} "
                </button>
            </div>
            <div>
                <p class="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold mt-2">Palabras individuales</p>
                <div class="flex flex-wrap gap-2">
                    ${words.map(w => `<button class="save-opt py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors" data-type="words" data-val="${w}">${w}</button>`).join('')}
                </div>
            </div>
            <div>
                <p class="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold mt-2">Expresión</p>
                <button class="save-opt w-full text-left py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors" data-type="expressions" data-val="${item.phrase}">
                    ${item.phrase}
                </button>
            </div>
        `;

        opts.querySelectorAll('.save-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                quickSave(btn.dataset.type, btn.dataset.val);
                btn.classList.add('bg-success/20', 'border-success/40', 'text-success');
                btn.textContent = '✓ Guardado';
                setTimeout(() => closeSaveModal(), 800);
            });
        });

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    }

    function closeSaveModal() {
        const modal = document.getElementById('saveModal');
        modal.classList.add('opacity-0');
        setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
    }

    document.getElementById('closeSaveModal')?.addEventListener('click', closeSaveModal);
    document.getElementById('saveModal')?.addEventListener('click', (e) => { if (e.target.id === 'saveModal') closeSaveModal(); });

    // --------------------------------------------------------
    // MODAL EDITAR PERFIL
    // --------------------------------------------------------
    document.getElementById('openEditProfile')?.addEventListener('click', () => {
        const sess = DB.getSession();
        if (sess) {
            document.getElementById('editName').value = sess.name || '';
            document.getElementById('editEmail').value = sess.email || '';
            document.getElementById('editCountry').value = sess.country || 'CO';
            document.getElementById('editLevel').value = sess.level || 'A2';
        }
        const modal = document.getElementById('editProfileModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    });

    document.getElementById('closeEditProfile')?.addEventListener('click', () => {
        const modal = document.getElementById('editProfileModal');
        modal.classList.add('opacity-0');
        setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
    });

    document.getElementById('editProfileForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const sess = DB.getSession();
        const users = DB.getUsers();
        if (!sess || !users[sess.phone]) return;
        sess.name    = document.getElementById('editName').value.trim();
        sess.email   = document.getElementById('editEmail').value.trim();
        sess.country = document.getElementById('editCountry').value;
        sess.level   = document.getElementById('editLevel').value;
        users[sess.phone] = sess;
        DB.setSession(sess);
        DB.setUsers(users);
        populateUserUI(sess);
        document.getElementById('closeEditProfile').click();
        showToast('Perfil actualizado');
    });

    function refreshProfileModal() {
        const sess = DB.getSession();
        if (!sess) return;
        populateUserUI(sess);
    }

    // --------------------------------------------------------
    // TOAST NOTIFICATION
    // --------------------------------------------------------
    function showToast(msg) {
        const t = document.createElement('div');
        t.className = 'fixed bottom-28 left-1/2 -translate-x-1/2 bg-surface border border-white/10 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-2xl z-[100] transition-opacity duration-300';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => { t.classList.add('opacity-0'); setTimeout(() => t.remove(), 300); }, 2000);
    }

    // --------------------------------------------------------
    // UTILIDADES
    // --------------------------------------------------------
    function safeSet(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // --------------------------------------------------------
    // PLANES Y SUSCRIPCIÓN
    // --------------------------------------------------------
    const planesModal   = document.getElementById('mod-planes');
    const purchaseModal = document.getElementById('purchaseModal');

    // Abrir pantalla de planes
    document.getElementById('openPlanesBtn')?.addEventListener('click', () => {
        const sess = DB.getSession();
        if (sess) {
            const planNames = { 'free': 'Gratuito', 'monthly': 'Premium Mensual', 'annual': 'Premium Anual' };
            safeSet('currentPlanLabel', planNames[sess.plan || 'free']);
        }
        planesModal.classList.remove('hidden');
        planesModal.classList.add('flex');
        setTimeout(() => planesModal.classList.remove('opacity-0'), 10);
        lucide.createIcons();
    });

    // Cerrar pantalla de planes
    document.getElementById('closePlanesBtn')?.addEventListener('click', () => {
        planesModal.classList.add('opacity-0');
        setTimeout(() => { planesModal.classList.add('hidden'); planesModal.classList.remove('flex'); }, 300);
    });

    // Click en botones de plan
    let planSelected = null;
    let planSelectedName = null;
    let planSelectedPrice = null;

    document.querySelectorAll('.plan-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sess = DB.getSession();
            if (!sess) return;
            const plan = btn.dataset.plan;
            if (plan === 'free' || plan === sess.plan) {
                showToast('Ya tienes este plan activo');
                return;
            }
            planSelected = plan;
            planSelectedName = btn.dataset.name;
            planSelectedPrice = btn.dataset.price;

            document.getElementById('purchasePlanName').textContent  = planSelectedName;
            document.getElementById('purchasePlanPrice').textContent = planSelectedPrice;

            // Icono según plan
            const iconEl = document.getElementById('purchaseIcon');
            if (plan === 'annual') {
                iconEl.className = 'w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg';
            } else {
                iconEl.className = 'w-14 h-14 bg-gradient-to-br from-accent to-neon rounded-2xl flex items-center justify-center shadow-lg';
            }

            purchaseModal.classList.remove('hidden');
            purchaseModal.classList.add('flex');
            setTimeout(() => purchaseModal.classList.remove('opacity-0'), 10);
            lucide.createIcons();
        });
    });

    // Cancelar compra
    const closePurchase = () => {
        purchaseModal.classList.add('opacity-0');
        setTimeout(() => { purchaseModal.classList.add('hidden'); purchaseModal.classList.remove('flex'); }, 300);
    };
    document.getElementById('cancelPurchaseBtn')?.addEventListener('click', closePurchase);
    purchaseModal?.addEventListener('click', (e) => { if (e.target === purchaseModal) closePurchase(); });

    // Confirmar compra
    document.getElementById('confirmPurchaseBtn')?.addEventListener('click', () => {
        const btn = document.getElementById('confirmPurchaseBtn');
        btn.innerHTML = '<span class="animate-spin mr-2">⏳</span> Procesando...';
        btn.disabled = true;

        setTimeout(() => {
            closePurchase();
            // Cerrar pantalla de planes
            planesModal.classList.add('opacity-0');
            setTimeout(() => { planesModal.classList.add('hidden'); planesModal.classList.remove('flex'); }, 300);

            btn.innerHTML = '<i data-lucide="lock" class="w-4 h-4"></i> Confirmar pago seguro';
            btn.disabled = false;

            // Actualizar plan en DB y sesión
            const sess = DB.getSession();
            const users = DB.getUsers();
            if (sess && users[sess.phone]) {
                sess.plan = planSelected;
                users[sess.phone] = sess;
                DB.setSession(sess);
                DB.setUsers(users);
                populateUserUI(sess);
            }

            showToast(`¡Bienvenido a ${planSelectedName}!`);
            lucide.createIcons();
        }, 2000);
    });

    // --------------------------------------------------------
    // INIT: Mostrar home si ya hay sesión
    // --------------------------------------------------------
    if (DB.getSession()) {
        showScreen('mod-home');
    }
});
