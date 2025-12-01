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

    $('createBtn').addEventListener('click', async () => {
        // Crear sesión en el backend
        const res = await fetch(BACKEND + '/create-session', { method: 'POST' });
        const { sessionId } = await res.json();
        currentSession = sessionId;

        // Mostrar sessionId
        $('sessionId').textContent = sessionId;

        // Generar URL visitante
        const url = BACKEND + '/visitor.html#session=' + sessionId;
        $('sessionUrl').textContent = url;

        // Generar QR
        document.getElementById('qrcode').innerHTML = '';
        new QRCode(document.getElementById('qrcode'), { text: url, width: 160, height: 160 });

        $('sessionBox').classList.remove('hidden');

        // El organizador también se une a la sala
        joinSession(sessionId);
    });

    // Enviar palabras
    $('sendBtn').addEventListener('click', sendWordsFromInput);

    // Reset de la nube
    $('resetBtn').addEventListener('click', () => {
        if (!currentSession) return alert('Crea una sesión primero');
        if (!confirm('Resetear la nube?')) return;
        socket.emit('reset');
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
    try {
        WordCloud(document.getElementById('cloud'), { list, rotateRatio: 0.25, weightFactor: 10 });
    } catch (e) {
        console.warn('WordCloud render error', e);
    }
});

// Función para enviar palabras
function sendWordsFromInput() {
    if (!currentSession) return alert('No estás en ninguna sesión');

    const inp = $('wordsInput');
    if (!inp) return;
    const raw = inp.value.trim();
    if (!raw) return;
    const words = raw.split(/\s+/).slice(0, 3); // máximo 3 palabras
    socket.emit('sendWords', words);
    inp.value = '';
}

// Manejo de errores de conexión
socket.on('connect_error', (err) => console.warn('connect_error', err));
