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
    const wordsInput = $('wordsInput');

    if (sendBtn) sendBtn.addEventListener('click', sendWordsFromInput);
    if (wordsInput) wordsInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendWordsFromInput();
    });

    let canSend = true;

    // Función para normalizar texto: minúsculas y quitar tildes
    function normalizeText(text) {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    // Función para enviar palabras (máx 2)
    function sendWordsFromInput() {
        if (!canSend) return;
        if (!currentSession) return alert('No estás en ninguna sesión');

        const raw = wordsInput.value.trim();
        if (!raw) return;

        // Separar por espacios, máximo 2 palabras
        const words = raw.split(/\s+/).slice(0, 2).map(normalizeText);
        if (words.length === 0) return;

        // Enviar al servidor
        socket.emit('sendWords', words);

        // Limpiar input y bloquear hasta nueva pregunta
        wordsInput.value = '';
        wordsInput.disabled = true;
        sendBtn.disabled = true;
        canSend = false;
    }

    // Desbloquear input cuando llegue nueva pregunta
    socket.on("question", q => {
        const questionEl = $('question');
        if (questionEl) questionEl.textContent = q;

        // Efecto fade-in y resaltado
        questionEl.style.transition = 'none';
        questionEl.style.backgroundColor = '#ffff99';
        questionEl.style.padding = '5px';
        questionEl.style.borderRadius = '4px';
        questionEl.offsetHeight; // forzar reflow
        questionEl.style.transition = 'background-color 1s ease';
        questionEl.style.backgroundColor = 'transparent';

        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

        // Desbloquear input
        wordsInput.disabled = false;
        sendBtn.disabled = false;
        canSend = true;
        wordsInput.focus();
    });
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

// Recibir número total de palabras enviadas
socket.on("wordCount", count => {
    const wordCountEl = $('wordCount');
    if (wordCountEl) wordCountEl.textContent = count;
});

// -------------------- Nube de palabras --------------------
function renderWordCloud(map) {
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
            weightFactor: size => {
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
            origin: [width / 2, height / 2]
        });
        canvas.style.display = 'block';
    } catch (e) {
        console.warn('WordCloud render error', e);
    }
}

// Recibir nube de palabras
socket.on('cloud', renderWordCloud);

// -------------------- Redimensionamiento automático --------------------
window.addEventListener('resize', () => {
    // Re-renderizar nube si ya hay datos
    if (window.lastCloudData) renderWordCloud(window.lastCloudData);
});

// Guardar última nube para re-render en resize
socket.on('cloud', map => {
    window.lastCloudData = map;
    renderWordCloud(map);
});

// -------------------- Manejo de errores de conexión --------------------
socket.on('connect_error', (err) => console.warn('connect_error', err));
