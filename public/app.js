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

const blacklist = [
    'mierda', 'mierdas', 'puta', 'putas', 'coño', 'coños', 'joder', 'jodete', 'gilipollas', 'cabron', 'cabrona', 'cabrones', 'hostia', 'hostias', 'pendejo', 'pendeja', 'idiota', 'imbecil', 'imbeciles', 'culero', 'culeros', 'chingar', 'chingada', 'chinga', 'carajo', 'maricon', 'maricones', 'zorra', 'zorras', 'baboso', 'babosa', 'mamon', 'mamona', 'cojones', 'culi', 'hijodeputa', 'hijueputa', 'polla', 'pollas', 'verga', 'vergas', 'chingon', 'chingona', 'tonto', 'tonta', 'burro', 'burra', 'culiado', 'forro', 'chupapolla', 'mierdoso', 'chingadera', 'gilipollez', 'pendejada', 'malparido', 'malparida', 'cabronazo', 'mariconazo', 'cagada', 'cagado', 'desgraciado', 'desgraciada', 'hijoputa', 'hijueputa', 'pajero', 'pajera', 'culo', 'mamada', 'panocha', 'papaya', 'choto', 'chucha', 'chingapinga', 'chingue', 'chingas', 'chingues', 'pedo', 'pedazo', 'maldito', 'maldita', 'retardado', 'retardada', 'zoquete', 'gandul', 'gandula', 'bastardo', 'bastarda', 'tarado', 'tarada', 'lamemierda', 'cojonudo', 'cojonuda', 'culiao', 'culia', 'mariconada', 'putamadre', 'putaquepario', 'hijodemilputa', 'coñaculo', 'vergon', 'vergonazo', 'trolas', 'pajota', 'imbesil', 'cagandote', 'cagandola', 'culiatros', 'puton', 'putona', 'gilipuertas', 'cojuda', 'cojudas', 'cerdo', 'cerdos', 'cerda', 'cerdas', 'perra', 'perras', 'perro', 'perros', 'zopenca', 'zopencas', 'culona', 'culonas', 'cojida', 'cojidas', 'jodido', 'jodida', 'pajotero', 'pajotera', 'tontito', 'tontita', 'gilipoyas', 'cagón', 'cagona', 'hostias', 'mierdica', 'huevon', 'huevón', 'malparidos', 'malparidas', 'cagando', 'cojudo', 'cojuda', 'cabrone', 'burdel', 'estupido', 'estúpido', 'estúpida', 'idiotas', 'zoquetes', 'chingatumadre', 'pendejoso', 'pendejosa', 'culiatra', 'hijueputamadre', 'coñaculo', 'cojones', 'mierdas', 'putas', 'pendejazo', 'pendejita', 'malparido', 'malparida', 'hijoputa', 'hijueputa', 'cojida', 'cojidas', 'tonto', 'tonta', 'imbecil', 'imbeciles', 'zoquete', 'zoquetes', 'maricon', 'maricona', 'puton', 'putona', 'cagón', 'cagona', 'burdel', 'pajero', 'pajera', 'gilipollas', 'gilipoyas', 'hostia', 'hostias', 'chingar', 'chingada', 'chingas', 'chingue', 'cojudo', 'cojuda', 'culiao', 'culia', 'cabron', 'cabrona', 'cabrones', 'desgraciado', 'desgraciada', 'idiota', 'idiotas', 'retardado', 'retardada', 'lamemierda', 'mierdoso', 'mierdosa', 'maldito', 'maldita', 'papaya', 'pajota', 'imbesil', 'hijodemilputa', 'chingapinga', 'vergon', 'vergonazo', 'panocha', 'mamada', 'choto', 'chucha'
];

// Función para filtrar palabrotas
function containsBadWord(text) {
    const normalized = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // quita tildes
        .replace(/\s+/g, ''); // elimina espacios

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
if (window.APP_ROLE === 'visitor' && currentSession) {

    let canSend = true;
    const sendBtn = $('sendBtn');
    const wordsInput = $('wordsInput');

    // 🔥 BLOQUEO INMEDIATO — incluso antes de conectar socket
    const sessionKey = `sentWords_${currentSession}`;
    if (localStorage.getItem(sessionKey)) {
        if (wordsInput) wordsInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        canSend = false;
    }
    let lastQuestion = null; // para controlar nuevas preguntas
    socket.on('connect', () => {
        if (window.FORCED_SESSION) {
            currentSession = window.FORCED_SESSION;
            joinSession(currentSession);

            // 🔒 Verificar si ya se envió y bloquear
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

    // Función para normalizar texto: minúsculas y quitar tildes
    function normalizeText(text) {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    // Función para enviar palabras/frases
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

    // Desbloqueo al recibir nueva pregunta
    socket.on("question", q => {

        if (q !== lastQuestion && lastQuestion !== null) {
            // Nueva pregunta distinta, desbloquear
            localStorage.removeItem(sessionKey);
            if (wordsInput) wordsInput.disabled = false;
            if (sendBtn) sendBtn.disabled = false;
            canSend = true;
            if (wordsInput) wordsInput.focus();
            lastQuestion = q;
        }
        if (lastQuestion == null) {
            lastQuestion = q;
        }
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
    questionEl.style.color = '#333';

    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
});

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

// Recibir número total de palabras/frases únicas
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

socket.on('cloud', renderWordCloud);

// -------------------- Redimensionamiento automático --------------------
window.addEventListener('resize', () => {
    if (window.lastCloudData) renderWordCloud(window.lastCloudData);
});

socket.on('cloud', map => {
    window.lastCloudData = map;
});

// -------------------- Manejo de errores de conexión --------------------
socket.on('connect_error', (err) => console.warn('connect_error', err));
