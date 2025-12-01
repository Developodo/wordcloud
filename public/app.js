// app.js — Cliente para organizador y visitante

// Configuración del backend
const BACKEND = window.BACKEND_URL || window.location.origin;

// Inicializar Socket.IO
const socket = io(BACKEND);

// Helper
const $ = (id) => document.getElementById(id);

let currentSession = null;

// -------------------- Organizador --------------------
if (window.APP_ROLE === 'organizer') {

    const createBtn = $('createBtn');
    if (createBtn) {
        createBtn.addEventListener('click', async () => {
            const question = prompt("Introduce la pregunta para esta sesión:");
            if (!question) return alert("Debes introducir una pregunta");

            const res = await fetch(BACKEND + '/create-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });
            const { sessionId } = await res.json();
            currentSession = sessionId;

            const sessionIdEl = $('sessionId');
            if (sessionIdEl) sessionIdEl.textContent = sessionId;

            const url = BACKEND + '/visitor.html#session=' + sessionId;
            const sessionUrlEl = $('sessionUrl');
            if (sessionUrlEl) sessionUrlEl.textContent = url;

            // Generar QR
            const qrEl = $('qrcode');
            if (qrEl) {
                qrEl.innerHTML = '';
                new QRCode(qrEl, { text: url, width: 240, height: 240 });
            }

            const sessionBoxEl = $('sessionBox');
            if (sessionBoxEl) sessionBoxEl.classList.remove('hidden');

            const newQuestionBtn = $('newQuestionBtn');
            if (newQuestionBtn) newQuestionBtn.style.setProperty('display', 'inline-block');

            joinSession(sessionId);
        });
    }

    const newQuestionBtn = $('newQuestionBtn');
    if (newQuestionBtn) {
        newQuestionBtn.addEventListener('click', () => {
            if (!currentSession) return alert("Crea primero una sesión");

            const question = prompt("Introduce la nueva pregunta:");
            if (!question) return;

            socket.emit("newQuestion", { sessionId: currentSession, question });

            const wordCountEl = $('wordCount');
            if (wordCountEl) wordCountEl.textContent = '0';
        });
    }
}

// -------------------- Visitante --------------------
if (window.APP_ROLE === 'visitor') {
    socket.on('connect', () => {
        if (window.FORCED_SESSION) {
            currentSession = window.FORCED_SESSION;
            joinSession(currentSession);
        }
    });

    const sendBtn = $('sendBtn');
    if (sendBtn) sendBtn.addEventListener('click', sendWordsFromInput);
}

// -------------------- Funciones comunes --------------------
function joinSession(sessionId) {
    currentSession = sessionId;
    socket.emit('joinSession', sessionId);
}

// Recibir número de participantes
socket.on('participants', n => {
    const countEl = $('count');
    if (countEl) countEl.textContent = n;
});

// Recibir nube de palabras y renderizar
socket.on('cloud', map => {
    const list = Object.entries(map || {}).map(([w, f]) => [w, f]);
    const canvas = $('cloud');
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Ajuste para alta resolución (retina)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Resetear transformaciones
    ctx.scale(dpr, dpr); // Escalado físico

    // Función de colores suaves tipo Mentimeter
    function randomSoftColor() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 30) + 70;
        const lightness = Math.floor(Math.random() * 30) + 40;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    try {
        WordCloud(canvas, {
            list,
            gridSize: Math.round(16 * width / 1024),
            weightFactor: function (size) {
                const maxFreq = list.length ? Math.max(...list.map(([_, f]) => f)) : 1;
                return Math.min(width, height) / 4 * (size / maxFreq);
            },
            fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
            color: () => randomSoftColor(),
            rotateRatio: 0,
            rotationSteps: 1,
            rotateAngles: [0],
            backgroundColor: '#ffffff',
            drawOutOfBound: false,
            shuffle: true,
            ellipticity: 1,
            origin: [width / 2, height / 2] // ✅ Centrar la nube
        });
    } catch (e) {
        console.warn('WordCloud render error', e);
    }
});


// Recibir pregunta
socket.on("question", q => {
    const questionEl = $('question');
    if (questionEl) questionEl.textContent = q;
    // Aplicar efecto de aviso: fade-in y resaltado
    questionEl.style.transition = 'none';
    questionEl.style.backgroundColor = '#ffff99'; // amarillo
    questionEl.style.padding = '5px';
    questionEl.style.borderRadius = '4px';
    questionEl.offsetHeight; // forzar reflow
    questionEl.style.transition = 'background-color 1s ease';
    questionEl.style.backgroundColor = 'transparent';

    // Vibrar el móvil si es compatible
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]); // vibración breve
    }
});

// Recibir número total de palabras enviadas
socket.on("wordCount", count => {
    const wordCountEl = $('wordCount');
    if (wordCountEl) wordCountEl.textContent = count;
});

// Función para enviar palabras (máx 3)
function sendWordsFromInput() {
    if (!currentSession) return alert('No estás en ninguna sesión');

    const inp = $('wordsInput');
    if (!inp) return;
    const raw = inp.value.trim();
    if (!raw) return;
    const words = raw.split(/\s+/).slice(0, 3);
    socket.emit('sendWords', words);
    inp.value = '';
}

// Manejo de errores de conexión
socket.on('connect_error', (err) => console.warn('connect_error', err));
