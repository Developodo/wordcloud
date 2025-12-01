import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Servir frontend
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- Sesiones --------------------
let sessions = {};
function createSessionId() {
    return crypto.randomBytes(3).toString("hex").toUpperCase();
}

// Crear sesión (API)
app.post("/create-session", (req, res) => {
    const id = createSessionId();
    const question = req.body.question || "";
    sessions[id] = { wordMap: {}, participants: 0, question };
    res.json({ sessionId: id });
});

// Servir index.html para cualquier ruta no API
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// -------------------- WebSockets --------------------
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {

    socket.on("joinSession", (sessionId) => {
        if (!sessions[sessionId]) sessions[sessionId] = { wordMap: {}, participants: 0, question: "" };
        socket.join(sessionId);
        socket.data.sessionId = sessionId;
        sessions[sessionId].participants++;
        io.to(sessionId).emit("participants", sessions[sessionId].participants);
        io.to(sessionId).emit("cloud", sessions[sessionId].wordMap);

        // enviar pregunta solo al visitante que se une
        socket.emit("question", sessions[sessionId].question);
    });

    socket.on("sendWords", (words) => {
        const sessionId = socket.data.sessionId;
        if (!sessionId) return;
        const s = sessions[sessionId];
        words.forEach(w => s.wordMap[w.toLowerCase()] = (s.wordMap[w.toLowerCase()] || 0) + 1);
        io.to(sessionId).emit("cloud", s.wordMap);
    });

    socket.on("reset", () => {
        const sessionId = socket.data.sessionId;
        if (!sessionId) return;
        sessions[sessionId].wordMap = {};
        io.to(sessionId).emit("cloud", {});
    });

    socket.on("disconnect", () => {
        const sessionId = socket.data.sessionId;
        if (!sessionId || !sessions[sessionId]) return;
        sessions[sessionId].participants--;
        io.to(sessionId).emit("participants", sessions[sessionId].participants);
        if (sessions[sessionId].participants <= 0) delete sessions[sessionId];
    });

});

// -------------------- Start server --------------------
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
