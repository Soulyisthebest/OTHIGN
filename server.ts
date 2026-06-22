import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

// --- TIPOS DE DATOS ---
interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country: string;
  city?: string;
  visaType: string;
  status: "lead" | "documentacion" | "matriculado" | "completado" | "cancelado";
  dateAdded: string;
  notes?: string;
  assignedTeacherId?: string;
  payments?: { id: string; amount: number; date: string; concept: string; status: string }[];
  documents?: { id: string; name: string; type: string; status: string; url?: string }[];
  timeline?: { id: string; title: string; desc: string; date: string; type: string }[];
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher";
  specialty?: string;
  activeStudents: number;
}

interface DB {
  students: Student[];
  teachers: Teacher[];
  communityMessages: any[];
  customMetrics: {
    totalPageViews: number;
    totalVisits: number;
    avgSessionSeconds: number;
    bounceRatePercent: number;
  };
  alerts: any[];
}

// --- CONFIGURACIÓN DE BASE DE DATOS FILTRADA ---
// IMPORTANTE: Cambiamos el nombre a 'database_v2.json' para forzar a Railway 
// a crear un archivo limpio sin los 260 alumnos antiguos.
const DB_FILE = path.join(process.cwd(), "database_v2.json");

function getDefaultTeachers(): Teacher[] {
  return [
    { id: "tech_admin", name: "Dirección Atrévete", email: "direccion@atrevete.com", role: "admin", activeStudents: 0 },
    { id: "tech_1", name: "Profesor Carlos (Madrid)", email: "carlos@atrevete.com", role: "teacher", specialty: "Visados de Estudios", activeStudents: 0 },
    { id: "tech_2", name: "Profesora Ana (Barcelona)", email: "ana@atrevete.com", role: "teacher", specialty: "Arraigo & Residencia", activeStudents: 0 },
    { id: "tech_3", name: "Soporte Legal España", email: "legal@atrevete.com", role: "teacher", specialty: "Homologaciones", activeStudents: 0 }
  ];
}

// SEEDER TOTALMENTE LIMPIO (¡Sin alumnos ficticios!)
function seedDatabase(): DB {
  const students: Student[] = [];
  const communityMessages: any[] = [
    { 
      id: "msg_welcome", 
      user: "Sistema Atrévete 🤖", 
      text: "¡Bienvenidos al Portal Oficial de Atrévete a España! La comunidad en tiempo real está activa.", 
      time: new Date().toISOString(), 
      system: true 
    }
  ];

  const customMetrics = {
    totalPageViews: 0,
    totalVisits: 0,
    avgSessionSeconds: 0,
    bounceRatePercent: 0
  };

  const alerts: any[] = [];
  const teachers = getDefaultTeachers();

  return { students, communityMessages, customMetrics, alerts, teachers };
}

function readDB(): DB {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = seedDatabase();
      writeDB(initial);
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw) as DB;
  } catch (error) {
    console.error("Error leyendo DB, usando valores por defecto:", error);
    return seedDatabase();
  }
}

function writeDB(data: DB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error escribiendo DB:", error);
  }
}

// --- INICIALIZACIÓN DEL SERVIDOR ---
const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: "*" }));
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- ENDPOINTS DE LA API ---

// 1. Obtener Base de Datos Completa y Estadísticas Calculadas en Tiempo Real
app.get("/api/db/stats", (req, res) => {
  const db = readDB();
  
  const total = db.students.length;
  const leads = db.students.filter(s => s.status === "lead").length;
  const docs = db.students.filter(s => s.status === "documentacion").length;
  const matri = db.students.filter(s => s.status === "matriculado").length;
  const comp = db.students.filter(s => s.status === "completado").length;
  
  let totalRecaudado = 0;
  db.students.forEach(s => {
    s.payments?.forEach(p => {
      if (p.status === "paid" || p.status === "completado" || p.status === "success") {
        totalRecaudado += p.amount;
      }
    });
  });

  res.json({
    students: db.students,
    teachers: db.teachers,
    communityMessages: db.communityMessages,
    customMetrics: db.customMetrics,
    alerts: db.alerts,
    stats: {
      total,
      leads,
      documentacion: docs,
      matriculados: matri,
      completados: comp,
      recaudacionTotal: totalRecaudado
    }
  });
});

// 2. Crear un Alumno Nuevo
app.post("/api/students", (req, res) => {
  const db = readDB();
  const body = req.body;

  if (!body.name || !body.email) {
    return res.status(400).json({ error: "Nombre y email requeridos" });
  }

  const newStudent: Student = {
    id: "stud_" + Date.now(),
    name: body.name,
    email: body.email,
    phone: body.phone || "",
    country: body.country || "Marruecos",
    city: body.city || "",
    visaType: body.visaType || "Estudios",
    status: body.status || "lead",
    dateAdded: new Date().toISOString(),
    notes: body.notes || "",
    assignedTeacherId: body.assignedTeacherId || "tech_1",
    payments: body.payments || [],
    documents: body.documents || [],
    timeline: body.timeline || [
      { id: "tl_" + Date.now(), title: "Perfil Creado", desc: "Alumno registrado en el sistema.", date: new Date().toISOString(), type: "system" }
    ]
  };

  db.students.unshift(newStudent);
  writeDB(db);

  io.emit("db_updated");
  res.status(201).json(newStudent);
});

// 3. Actualizar un Alumno Existente
app.put("/api/students/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const idx = db.students.findIndex(s => s.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Alumno no encontrado" });
  }

  db.students[idx] = { ...db.students[idx], ...req.body };
  writeDB(db);

  io.emit("db_updated");
  res.json(db.students[idx]);
});

// 4. Eliminar un Alumno
app.delete("/api/students/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const initialLen = db.students.length;
  
  db.students = db.students.filter(s => s.id !== id);
  
  if (db.students.length === initialLen) {
    return res.status(404).json({ error: "Alumno no encontrado" });
  }

  writeDB(db);
  io.emit("db_updated");
  res.json({ success: true, message: "Alumno eliminado correctamente" });
});

// 5. Actualizar Métricas Web de Google / Analytics Manuales
app.post("/api/metrics", (req, res) => {
  const db = readDB();
  db.customMetrics = { ...db.customMetrics, ...req.body };
  writeDB(db);
  io.emit("db_updated");
  res.json(db.customMetrics);
});

// --- ORQUESTACIÓN CON WEBSOCKETS (SOCKET.IO) ---
io.on("connection", (socket) => {
  console.log("Nuevo usuario conectado al WebSocket del servidor:", socket.id);

  // Al conectarse, enviamos la base de datos actual
  socket.emit("init_db", readDB());

  // Enviar un nuevo mensaje a la comunidad global
  socket.on("send_message", (msgData) => {
    const db = readDB();
    const newMsg = {
      id: "msg_" + Date.now(),
      user: msgData.user || "Anónimo",
      text: msgData.text || "",
      time: new Date().toISOString(),
      system: !!msgData.system
    };

    db.communityMessages.push(newMsg);
    // Limitamos la comunidad a los últimos 60 mensajes para optimizar
    if (db.communityMessages.length > 60) {
      db.communityMessages.shift();
    }

    writeDB(db);
    io.emit("new_message", newMsg);
  });

  socket.on("disconnect", () => {
    console.log("Usuario desconectado de la sesión web:", socket.id);
  });
});

// --- PRODUCCIÓN: SERVIR FRONTEND ---
const frontendPath = path.join(process.cwd(), "dist");
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
  console.log("Modo Producción Activo: Serviendo archivos estáticos desde /dist");
} else {
  app.get("/", (req, res) => {
    res.send("API Servidor Atrévete a España levantada y corriendo. Modo desarrollo.");
  });
}

// Iniciar Servidor
server.listen(port, () => {
  console.log(`🚀 Servidor backend ejecutándose perfectamente en http://localhost:${port}`);
  console.log(`Base de datos guardándose en: ${DB_FILE}`);
});