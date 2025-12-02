// app.js — Cliente para organizador y visitante

// Configuración del backend
const BACKEND = window.BACKEND_URL || window.location.origin;

// Inicializar Socket.IO
const socket = io(BACKEND);

// Helper
const $ = (id) => document.getElementById(id);

const url_ = new URL(location.href);
let sid = url_.searchParams.get('session');
if (!sid && location.hash) {
    const m = location.hash.match(/session=([^&]+)/);
    if (m) sid = m[1];
}
if (!sid) {
    const h = location.hash.split('/');
    sid = h[h.length - 1];
}

window.FORCED_SESSION = sid;
currentSession = sid; // 🔥 CLAVE: definimos la sesión antes de conectarnos

const blacklist = [ /* ... tu lista completa ... */];

// Función para filtrar palabrotas
function containsBadWord(text) {
    const normalized = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '');
    return blacklist.some(word => normalized.includes(word));
}

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
            if (sessionUrlEl) {
                sessionUrlEl.href = url;
                sessionUrlEl.textContent = url;
            }

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
if (window.APP_ROLE === 'visitor' && currentSession) {

    let canSend = true;
    const sendBtn = $('sendBtn');
    const wordsInput = $('wordsInput');

    const sessionKey = `sentWords_${currentSession}`;
    if (localStorage.getItem(sessionKey)) {
        if (wordsInput) wordsInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        canSend = false;
    }

    let lastQuestion = null;

    socket.on('connect', () => {
        if (window.FORCED_SESSION) {
            currentSession = window.FORCED_SESSION;
            joinSession(currentSession);

            const sessionKey = `sentWords_${currentSession}`;
            if (localStorage.getItem(sessionKey)) {
                if (wordsInput) wordsInput.disabled = true;
                if (sendBtn) sendBtn.disabled = true;
                canSend = false;
            }
        }
    });

    if (sendBtn) sendBtn.addEventListener('click', sendWordsFromInput);
    if (wordsInput) wordsInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendWordsFromInput();
    });

    function normalizeText(text) {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    function sendWordsFromInput() {
        if (!canSend) return;
        if (!currentSession) return alert('No estás en ninguna sesión');

        const raw = wordsInput.value.trim();
        if (!raw) return;

        const wordsArray = raw.split(/\s+/).slice(0, 2).map(normalizeText);
        if (wordsArray.length === 0) return;

        const phrase = wordsArray.join(' ');

        if (containsBadWord(phrase)) {
            alert('Tu mensaje contiene palabras no permitidas.');
            wordsInput.value = '';
            return;
        }

        socket.emit('sendWords', [phrase]);
        localStorage.setItem(`sentWords_${currentSession}`, '1');

        wordsInput.value = '';
        wordsInput.disabled = true;
        sendBtn.disabled = true;
        canSend = false;
    }

    socket.on("question", q => {
        if (q !== lastQuestion && lastQuestion !== null) {
            localStorage.removeItem(sessionKey);
            if (wordsInput) wordsInput.disabled = false;
            if (sendBtn) sendBtn.disabled = false;
            canSend = true;
            if (wordsInput) wordsInput.focus();
            lastQuestion = q;
        }
        if (lastQuestion == null) lastQuestion = q;
    });
}

socket.on("question", q => {
    const questionEl = $('question');
    if (questionEl) questionEl.textContent = q;

    questionEl.style.transition = 'none';
    questionEl.style.transform = 'scale(1.2)';
    questionEl.style.backgroundColor = '#fffa65';
    questionEl.style.color = '#1a73e8';
    questionEl.offsetHeight;
    questionEl.style.transition = 'all 0.8s ease';
    questionEl.style.transform = 'scale(1)';
    questionEl.style.backgroundColor = 'transparent';

    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
});

// -------------------- Funciones comunes --------------------
function joinSession(sessionId) {
    currentSession = sessionId;
    socket.emit('joinSession', sessionId);
}

socket.on('participants', n => {
    const countEl = $('count');
    if (countEl) countEl.textContent = n;
});

socket.on("wordCount", count => {
    const wordCountEl = $('wordCount');
    if (wordCountEl) wordCountEl.textContent = count;
});

// -------------------- Nube de palabras --------------------
// -------------------- Nube de palabras --------------------
function renderWordCloud(map) {
    const list = Object.entries(map || {}).map(([w, f]) => [w, f]);
    const canvas = $('cloud');
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    function randomSoftColor() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 30) + 70;
        const lightness = Math.floor(Math.random() * 30) + 40;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    try {
        WordCloud(canvas, {
            list,

            // Tamaño de celda adaptado al ancho real
            gridSize: Math.max(8, Math.round(16 * width / 1024)),

            // ⛔ nuevo: garantiza que ninguna palabra supere ancho ni alto
            weightFactor: freq => {
                const maxFreq = list.length ? Math.max(...list.map(([_, f]) => f)) : 1;
                const base = (Math.min(width, height) / 4);
                const scaled = base * (freq / maxFreq);
                return Math.min(scaled, width / 4); // límite duro
            },

            fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
            color: () => randomSoftColor(),

            rotateRatio: 0,
            rotationSteps: 1,
            rotateAngles: [0],

            drawOutOfBound: false,
            shuffle: true,
            ellipticity: 1,
            origin: [width / 2, height / 2],
            backgroundColor: '#ffffff',
        });
        canvas.style.display = 'block';
    } catch (e) {
        console.warn('WordCloud render error', e);
    }
}


// -------------------- LA ANIMACIÓN AL LLEGAR NUEVA PALABRA --------------------
socket.on('cloud', map => {
    window.lastCloudData = map;

    const canvas = $('cloud');
    if (!canvas) return;

    // 🔥 animación suave tipo Mentimeter
    canvas.style.transition = 'none';
    canvas.style.opacity = '0';
    canvas.style.transform = 'scale(0.9)';
    canvas.offsetHeight; // forzar reflow

    canvas.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    canvas.style.opacity = '1';
    canvas.style.transform = 'scale(1)';

    renderWordCloud(map);
});


// -------------------- Redimensionamiento automático --------------------
window.addEventListener('resize', () => {
    if (window.lastCloudData) renderWordCloud(window.lastCloudData);
});


socket.on('connect_error', (err) => console.warn('connect_error', err));
