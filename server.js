// server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.static("../public")); // Sirve la web
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// Sesiones en memoria
let sessions = {};

function createSessionId() {
    return crypto.randomBytes(3).toString("hex").toUpperCase();
}

// Crear sesión (REST)
app.post("/create-session", (req, res) => {
    const id = createSessionId();
    sessions[id] = {
        wordMap: {},
        participants: 0,
    };
    res.json({ sessionId: id });
});

// WebSockets
io.on("connection", (socket) => {
    console.log("Cliente conectado");

    // Unirse a sesión
    socket.on("joinSession", (sessionId) => {
        if (!sessions[sessionId]) {
            sessions[sessionId] = { wordMap: {}, participants: 0 };
        }

        socket.join(sessionId);
        socket.data.sessionId = sessionId;

        sessions[sessionId].participants++;
        io.to(sessionId).emit("participants", sessions[sessionId].participants);

        io.to(sessionId).emit("cloud", sessions[sessionId].wordMap);
    });

    // Recibir palabras
    socket.on("sendWords", (words) => {
        const sessionId = socket.data.sessionId;
        if (!sessionId) return;

        const s = sessions[sessionId];

        words.forEach((w) => {
            const key = w.toLowerCase();
            s.wordMap[key] = (s.wordMap[key] || 0) + 1;
        });

        io.to(sessionId).emit("cloud", s.wordMap);
    });

    // Reset
    socket.on("reset", () => {
        const sessionId = socket.data.sessionId;
        if (!sessionId) return;

        sessions[sessionId].wordMap = {};
        io.to(sessionId).emit("cloud", {});
    });

    // Desconexión
    socket.on("disconnect", () => {
        const sessionId = socket.data.sessionId;
        if (!sessionId || !sessions[sessionId]) return;

        sessions[sessionId].participants--;
        io.to(sessionId).emit("participants", sessions[sessionId].participants);

        if (sessions[sessionId].participants <= 0) {
            delete sessions[sessionId];
        }
    });
});

// Start
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
