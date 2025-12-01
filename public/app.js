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

    $('createBtn')?.addEventListener('click', async () => {
        const question = prompt("Introduce la pregunta para esta sesión:");
        if (!question) return alert("Debes introducir una pregunta");

        const res = await fetch(BACKEND + '/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });
        const { sessionId } = await res.json();
        currentSession = sessionId;

        $('sessionId')?.textContent = sessionId;
        const url = BACKEND + '/visitor.html#session=' + sessionId;
        $('sessionUrl')?.textContent = url;

        // Generar QR
        const qrEl = $('qrcode');
        if (qrEl) {
            qrEl.innerHTML = '';
            new QRCode(qrEl, { text: url, width: 240, height: 240 });
        }

        $('sessionBox')?.classList.remove('hidden');
        $('newQuestionBtn')?.style.setProperty('display', 'inline-block');

        joinSession(sessionId);
    });


    // Nueva pregunta
    $('newQuestionBtn')?.addEventListener('click', () => {
        if (!currentSession) return alert("Crea primero una sesión");

        const question = prompt("Introduce la nueva pregunta:");
        if (!question) return;

        socket.emit("newQuestion", { sessionId: currentSession, question });

        const el = $('wordCount');
        if (el) el.textContent = '0';
    });
}

// -------------------- Visitante --------------------
if (window.APP_ROLE === 'visitor') {
    socket.on('connect', () => {
        if (window.FORCED_SESSION) {
            currentSession = window.FORCED_SESSION;
            joinSession(currentSession);
        }
    });

    $('sendBtn')?.addEventListener('click', sendWordsFromInput);
}

// -------------------- Funciones comunes --------------------
function joinSession(sessionId) {
    currentSession = sessionId;
    socket.emit('joinSession', sessionId);
}

// Recibir número de participantes
socket.on('participants', n => {
    const el = $('count');
    if (el) el.textContent = n;
});

// Recibir nube de palabras y renderizar
socket.on('cloud', map => {
    const list = Object.entries(map || {}).map(([w, f]) => [w, f]);
    const canvas = $('cloud');
    if (!canvas) return;
    const width = canvas.clientWidth || canvas.width;

    try {
        WordCloud(canvas, {
            list,
            gridSize: Math.round(16 * width / 1024),
            weightFactor: function (size) {
                const maxFreq = list.length ? Math.max(...list.map(([_, f]) => f)) : 1;
                return width / 20 * (size / maxFreq);
            },
            fontFamily: 'Segoe UI, Arial',
            color: 'random-dark',
            rotateRatio: 0.5,
            rotationSteps: 2,
            rotateAngles: [0, 90],
            backgroundColor: '#ffffff',
            drawOutOfBound: false
        });
    } catch (e) {
        console.warn('WordCloud render error', e);
    }
});

// Recibir pregunta
socket.on("question", q => {
    const el = $('question');
    if (el) el.textContent = q;
});

// Recibir número total de palabras enviadas
socket.on("wordCount", count => {
    const el = $('wordCount');
    if (el) el.textContent = count;
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
