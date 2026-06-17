document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM - Login
    const loginForm = document.getElementById('loginForm');
    const phoneInput = document.getElementById('phoneInput');
    const loginView = document.getElementById('loginView');
    const appView = document.getElementById('appView');
    const loginError = document.getElementById('loginError');

    // Referencias al DOM - App
    const recordBtn = document.getElementById('recordBtn');
    const btnText = document.getElementById('btnText');
    const micIcon = document.getElementById('micIcon');
    const feedbackArea = document.getElementById('feedbackArea');
    const scoreCircle = document.getElementById('scoreCircle');
    const scoreText = document.getElementById('scoreText');
    const aiFeedbackText = document.getElementById('aiFeedbackText');
    const tryAgainBtn = document.getElementById('tryAgainBtn');

    // --- LÓGICA DE LOGIN ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = phoneInput.value.trim();

        // Validación simple (mockeada)
        if (phone.length < 7) {
            loginError.classList.remove('hidden');
            return;
        }

        loginError.classList.add('hidden');

        // Transición de pantallas
        loginView.classList.add('opacity-0', 'scale-95');
        
        setTimeout(() => {
            loginView.classList.add('hidden');
            appView.classList.remove('hidden');
            
            // Pequeño retraso para la animación de entrada
            setTimeout(() => {
                appView.classList.remove('opacity-0');
            }, 50);
        }, 500); // Coincide con la duración de Tailwind transition
    });

    // --- LÓGICA DE GRABACIÓN ---
    let isRecording = false;

    recordBtn.addEventListener('click', () => {
        if (isRecording) return; // Prevenir doble click
        
        // Estado inicial: Grabando
        isRecording = true;
        btnText.innerText = "Escuchando...";
        recordBtn.classList.add('recording-pulse');
        
        // Ocultar feedback si estaba abierto
        hideFeedback();

        // Simulación de procesamiento de IA (3 segundos)
        setTimeout(() => {
            // Terminar estado de grabación
            isRecording = false;
            btnText.innerText = "Toca para hablar";
            recordBtn.classList.remove('recording-pulse');
            
            // Mostrar Feedback Mockeado
            showFeedback(85, "¡Casi perfecto! Intenta pronunciar la 'sh' con más fuerza, simulando el sonido para pedir silencio.");
        }, 3000);
    });

    tryAgainBtn.addEventListener('click', () => {
        hideFeedback();
    });

    function showFeedback(score, feedbackMsg) {
        // Quitar display none
        feedbackArea.classList.remove('hidden');
        
        // Retraso para permitir transición CSS
        setTimeout(() => {
            feedbackArea.classList.remove('opacity-0', 'translate-y-4');
            feedbackArea.classList.add('opacity-100', 'translate-y-0');
            
            // Animar el círculo de puntaje
            scoreText.innerText = score;
            scoreCircle.style.strokeDasharray = `${score}, 100`;
            
            // Actualizar texto
            aiFeedbackText.innerText = feedbackMsg;
        }, 50);
    }

    function hideFeedback() {
        feedbackArea.classList.remove('opacity-100', 'translate-y-0');
        feedbackArea.classList.add('opacity-0', 'translate-y-4');
        
        // Esperar que termine la animación para ocultar
        setTimeout(() => {
            feedbackArea.classList.add('hidden');
            // Reiniciar progreso del círculo
            scoreCircle.style.strokeDasharray = `0, 100`;
        }, 500);
    }
});
