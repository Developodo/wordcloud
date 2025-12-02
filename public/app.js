// app.js — Cliente para organizador y visitante

// -------------------- Configuración --------------------
const BACKEND = window.BACKEND_URL || window.location.origin;
const socket = io(BACKEND);
const $ = id => document.getElementById(id);

let currentSession = null;
const url_ = new URL(location.href);
let sid = url_.searchParams.get('session') || (location.hash.match(/session=([^&]+)/)?.[1]) || location.hash.split('/').pop();
window.FORCED_SESSION = sid;
currentSession = sid;

const blacklist = [
    "puta", "putas", "puto", "putos", "zorra", "zorras", "zorro", "zorros", "gilipollas", "gilipollas", "imbécil", "imbéciles", "idiota", "idiotas",
    "tonto", "tontos", "tonta", "tontas", "cabron", "cabrones", "cabrona", "cabronas", "cabrón", "cabrones", "cabrona", "cabronas", "coño", "coños",
    "mierda", "mierdas", "caca", "cacas", "pedo", "pedos", "pajero", "pajeros", "pajera", "pajeras", "chupapolla", "chupapollas", "verga", "vergas",
    "polla", "pollas", "pene", "penes", "culo", "culos", "cagón", "cagones", "cagona", "cagonas", "tarado", "tarados", "tarada", "taradas", "maricón",
    "maricones", "maricona", "mariconas", "bastardo", "bastardos", "bastarda", "bastardas", "maldito", "malditos", "maldita", "malditas", "imbécil",
    "imbéciles", "idiota", "idiotas", "tonto", "tontos", "tonta", "tontas", "gilipollas", "gilipollas", "cerdo", "cerdos", "cerda", "cerdas", "mamón",
    "mamones", "mamona", "mamonas", "pajilla", "pajillas", "cojones", "cojón", "cojonazo", "cojonazos", "cojonera", "cojoneras", "pajero", "pajeros",
    "pajera", "pajeras", "zopenco", "zopencos", "zopenca", "zopencas", "memo", "memos", "mema", "memas", "trol", "troles", "trola", "trolas", "idiota",
    "idiotas", "imbécil", "imbéciles", "gilipollas", "gilipollas", "tarado", "tarados", "tarada", "taradas", "cabronazo", "cabronazos", "cabroncillo",
    "cabroncillos", "mierdoso", "mierdosos", "mierdosa", "mierdosas", "cagada", "cagadas", "cagón", "cagones", "cagona", "cagonas", "mierdecilla",
    "mierdecillas", "gilipollez", "gilipolleces", "tonto", "tontos", "tonta", "tontas", "zafio", "zafios", "zafia", "zafias", "bruto", "brutos", "bruta",
    "brutas", "imbécil", "imbéciles", "idiota", "idiotas", "cretino", "cretinos", "cretina", "cretinas", "estúpido", "estúpidos", "estúpida", "estúpidas",
    "subnormal", "subnormales", "gili", "gilis", "cabrón", "cabrones", "cabrona", "cabronas", "manco", "mancos", "manca", "mancas", "tonto", "tontos", "tonta",
    "tontas", "zoquete", "zoquetes", "zoqueta", "zoquetas", "patán", "patanes", "patana", "patanas", "zángano", "zánganos", "zángana", "zánganas", "baboso",
    "babosos", "babosa", "babosas", "tonto", "tontos", "tonta", "tontas", "gilipollas", "gilipollas", "imbécil", "imbéciles", "idiota", "idiotas", "cretino",
    "cretinos", "cretina", "cretinas", "tarado", "tarados", "tarada", "taradas", "estúpido", "estúpidos", "estúpida", "estúpidas", "gilipollas", "gilipollas",
    "mierda", "mierdas", "caca", "cacas", "pedazo", "pedazos", "culo", "culos", "coño", "coños", "pene", "penes", "polla", "pollas", "verga", "vergas", "mamón",
    "mamones", "mamona", "mamonas", "zorra", "zorras", "zorro", "zorros", "cabron", "cabrones", "cabrona", "cabronas", "idiota", "idiotas", "imbécil", "imbéciles",
    "pajero", "pajeros", "pajera", "pajeras", "maricón", "maricones", "maricona", "mariconas", "bastardo", "bastardos", "bastarda", "bastardas", "maldito",
    "malditos", "maldita", "malditas", "cerdo", "cerdos", "cerda", "cerdas", "baboso", "babosos", "babosa", "babosas", "tarado", "tarados", "tarada", "taradas",
    "memo", "memos", "mema", "memas", "trol", "troles", "trola", "trolas", "zoquete", "zoquetes", "zoqueta", "zoquetas", "subnormal", "subnormales", "cretino",
    "cretinos", "cretina", "cretinas", "zafio", "zafios", "zafia", "zafias", "patán", "patanes", "patana", "patanas", "imbécil", "imbéciles", "idiota", "idiotas",
    "gilipollas", "gilipollas", "tonto", "tontos", "tonta", "tontas", "estúpido", "estúpidos", "estúpida", "estúpidas", "cabronazo", "cabronazos", "cabroncillo",
    "cabroncillos", "mierdoso", "mierdosos", "mierdosa", "mierdosas", "cagón", "cagones", "cagona", "cagonas", "mierdecilla", "mierdecillas", "gilipollez",
    "gilipolleces", "zángano", "zánganos", "zángana", "zánganas", "zoquete", "zoquetes", "zoqueta", "zoquetas", "tonto", "tontos", "tonta", "tontas", "bruto",
    "brutos", "bruta", "brutas", "manco", "mancos", "manca", "mancas", "idiota", "idiotas", "cretino", "cretinos", "cretina", "cretinas", "tarado", "tarados",
    "tarada", "taradas", "cabroncillo", "cabroncillos", "baboso", "babosos", "babosa", "babosas", "tonto", "tontos", "tonta", "tontas", "gilipollas", "gilipollas",
    "imbécil", "imbéciles", "idiota", "idiotas", "mierda", "mierdas", "caca", "cacas", "pedo", "pedos", "pene", "penes", "polla", "pollas", "verga", "vergas",
    "coño", "coños", "culo", "culos", "mamón", "mamones", "mamona", "mamonas", "zorra", "zorras", "zorro", "zorros", "cabron", "cabrones", "cabrona", "cabronas",
    "maldito", "malditos", "maldita", "malditas", "bastardo", "bastardos", "bastarda", "bastardas", "pajero", "pajeros", "pajera", "pajeras", "maricón", "maricones",
    "maricona", "mariconas", "cretino", "cretinos", "cretina", "cretinas", "imbécil", "imbéciles", "idiota", "idiotas", "gilipollas", "gilipollas", "tonto", "tontos",
    "tonta", "tontas", "cabronazo", "cabronazos", "cabroncillo", "cabroncillos", "mierdoso", "mierdosos", "mierdosa", "mierdosas", "cagón", "cagones", "cagona", "cagonas",
    "mierdecilla", "mierdecillas", "gilipollez", "gilipolleces", "zángano", "zánganos", "zángana", "zánganas", "zoquete", "zoquetes", "zoqueta", "zoquetas"
];


function containsBadWord(text) {
    const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
    return blacklist.some(word => normalized.includes(word));
}

// -------------------- Funciones comunes --------------------
function joinSession(sessionId) {
    currentSession = sessionId;
    socket.emit('joinSession', sessionId);
}

socket.on('participants', n => {
    const countEl = $('count');
    if (countEl) countEl.textContent = n - 1;
});

socket.on("wordCount", count => {
    const wordCountEl = $('wordCount');
    if (wordCountEl) wordCountEl.textContent = count;
});

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

    const randomSoftColor = () => {
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 30) + 70;
        const lightness = Math.floor(Math.random() * 30) + 40;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    try {
        WordCloud(canvas, {
            list,
            gridSize: Math.max(8, Math.round(16 * width / 1024)),
            weightFactor: freq => {
                const maxFreq = list.length ? Math.max(...list.map(([_, f]) => f)) : 1;
                const base = Math.min(width, height) / 4;
                return Math.min(base * (freq / maxFreq), width / 4);
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

// Comparar nubes para no repintar si no hay cambios
function isCloudEqual(a, b) {
    const ka = Object.keys(a || {});
    const kb = Object.keys(b || {});
    if (ka.length !== kb.length) return false;
    for (const key of ka) {
        if (!b.hasOwnProperty(key) || a[key] !== b[key]) return false;
    }
    return true;
}

socket.on('cloud', map => {
    if (!window.lastCloudData || !isCloudEqual(window.lastCloudData, map)) {
        window.lastCloudData = map;
        const canvas = $('cloud');
        if (!canvas) return;

        canvas.style.transition = 'none';
        canvas.style.opacity = '0';
        canvas.style.transform = 'scale(0.9)';
        canvas.offsetHeight;

        canvas.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        canvas.style.opacity = '1';
        canvas.style.transform = 'scale(1)';

        renderWordCloud(map);
    }
});

// Redimensionar automáticamente
function updateCanvasSize() {
    if (window.lastCloudData) renderWordCloud(window.lastCloudData);
}

window.addEventListener('resize', updateCanvasSize);

socket.on('connect_error', (err) => console.warn('connect_error', err));

// -------------------- Organizador --------------------
if (window.APP_ROLE === 'organizer') {
    const createBtn = $('createBtn');
    const newQuestionBtn = $('newQuestionBtn');

    createBtn?.addEventListener('click', async () => {
        const question = prompt("Introduce la pregunta para esta sesión:");
        if (!question) return alert("Debes introducir una pregunta sobre la que hacer la nube de palabras");
        document.getElementById('game').style.display = 'block';
        const res = await fetch(`${BACKEND}/create-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });
        const { sessionId } = await res.json();
        currentSession = sessionId;

        $('sessionId') && ($('sessionId').textContent = sessionId);
        const url = `${BACKEND}/visitor.html#session=${sessionId}`;
        const sessionUrlEl = $('sessionUrl');
        if (sessionUrlEl) {
            sessionUrlEl.href = url;
            sessionUrlEl.textContent = url;
        }

        const qrEl = $('qrcode');
        if (qrEl) {
            qrEl.innerHTML = '';
            new QRCode(qrEl, { text: url, width: 240, height: 240 });
            document.dispatchEvent(new Event("qr-loaded"));
        }

        $('sessionBox')?.classList.remove('hidden');
        newQuestionBtn && (newQuestionBtn.style.display = 'inline-block');

        joinSession(sessionId);
    });

    newQuestionBtn?.addEventListener('click', () => {
        if (!currentSession) return alert("Crea primero una sesión");
        const question = prompt("Introduce la nueva pregunta:");
        if (!question) return;

        socket.emit("newQuestion", { sessionId: currentSession, question });
        $('wordCount') && ($('wordCount').textContent = '0');
    });
}

// -------------------- Visitante --------------------
if (window.APP_ROLE === 'visitor' && currentSession) {
    let canSend = true;
    const sendBtn = $('sendBtn');
    const wordsInput = $('wordsInput');
    const sessionKey = `sentWords_${currentSession}`;
    let lastQuestion = null;

    if (localStorage.getItem(sessionKey)) {
        wordsInput && (wordsInput.disabled = true);
        sendBtn && (sendBtn.disabled = true);
        canSend = false;
    }

    socket.on('connect', () => {
        if (window.FORCED_SESSION) {
            currentSession = window.FORCED_SESSION;
            joinSession(currentSession);
            if (localStorage.getItem(sessionKey)) {
                wordsInput && (wordsInput.disabled = true);
                sendBtn && (sendBtn.disabled = true);
                canSend = false;
            }
        }
    });

    const normalizeText = text => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '').trim();

    function sendWordsFromInput() {
        if (!canSend || !currentSession) return alert('No puedes enviar ahora');
        const raw = wordsInput.value.trim();
        if (!raw) return;

        const wordsArray = raw.split(/\s+/); // separa TODAS las palabras

        // Validación de número de palabras
        if (wordsArray.length > 2) {
            alert('Solo se permiten hasta 2 palabras.');
            return;
        }

        const words = wordsArray.map(normalizeText);
        const phrase = words.join(' '); if (!phrase) return;
        if (containsBadWord(phrase)) { alert('Tu mensaje contiene palabras no permitidas.'); wordsInput.value = ''; return; }

        socket.emit('sendWords', [phrase]);
        localStorage.setItem(`sentWords_${currentSession}`, '1');

        wordsInput.value = '';
        wordsInput.disabled = true;
        sendBtn.disabled = true;
        canSend = false;
    }

    sendBtn?.addEventListener('click', sendWordsFromInput);
    wordsInput?.addEventListener('keypress', e => { if (e.key === 'Enter') sendWordsFromInput(); });

    socket.on("question", q => {
        if (q !== lastQuestion && lastQuestion !== null) {
            localStorage.removeItem(sessionKey);
            wordsInput && (wordsInput.disabled = false);
            sendBtn && (sendBtn.disabled = false);
            canSend = true;
            wordsInput && wordsInput.focus();
            lastQuestion = q;
        }
        if (lastQuestion == null) lastQuestion = q;
    });
}


