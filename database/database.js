import { Platform } from 'react-native';

let db = null;

function getDB() {
  if (!db) {
    const SQLite = require('expo-sqlite');
    db = SQLite.openDatabaseSync('taskmanager.db');
  }
  return db;
}

export function initDB() {
  if (Platform.OS === 'web') return;

  const SQLite = require('expo-sqlite');
  db = SQLite.openDatabaseSync('taskmanager.db');

  db.execSync(`
    CREATE TABLE IF NOT EXISTS usuario (
      id        INTEGER PRIMARY KEY,
      tonoPiel  INTEGER DEFAULT 0,
      colorPelo INTEGER DEFAULT 0,
      cara      INTEGER DEFAULT 0,
      ojos      INTEGER DEFAULT 0,
      peloCorto INTEGER DEFAULT 0,
      peloLargo INTEGER DEFAULT -1,
      shirt     INTEGER DEFAULT 0,
      nivel     INTEGER DEFAULT 1,
      puntos    INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tareas (
      id               TEXT PRIMARY KEY,
      title            TEXT NOT NULL,
      pictogramId      INTEGER,
      hora             TEXT,
      completed        INTEGER DEFAULT 0,
      fechaCompletada  TEXT
    );
    INSERT OR IGNORE INTO usuario (id) VALUES (1);
  `);

  // Migraciones
  const migraciones = [
  `ALTER TABLE usuario ADD COLUMN ojos INTEGER DEFAULT 0`,
  `ALTER TABLE tareas ADD COLUMN fechaCompletada TEXT`,   
  `ALTER TABLE tareas ADD COLUMN stars INTEGER DEFAULT 0`, 
];
for (const sql of migraciones) {
  try { db.execSync(sql); } catch {}  
}
}

// ── USUARIO ──────────────────────────────────────────────

const USUARIO_DEFAULT = {
  tonoPiel: 0, cara: 0, ojos: 0,
  peloCorto: 0, peloLargo: -1, shirt: 0,
  nivel: 1, puntos: 0,
};

export function getUsuario() {
  if (Platform.OS === 'web') {
    const data = localStorage.getItem('usuario');
    return data ? JSON.parse(data) : USUARIO_DEFAULT;
  }
  return getDB().getFirstSync('SELECT * FROM usuario WHERE id = 1');
}

export function updateUsuario(fields) {
  if (Platform.OS === 'web') {
    const current = getUsuario();
    localStorage.setItem('usuario', JSON.stringify({ ...current, ...fields }));
    return;
  }
  const keys   = Object.keys(fields).map(k => `${k}=?`).join(', ');
  const values = Object.values(fields);
  getDB().runSync(`UPDATE usuario SET ${keys} WHERE id=1`, values);
}

// ── TAREAS ───────────────────────────────────────────────

export function getTareas() {
  if (Platform.OS === 'web') {
    const data = localStorage.getItem('tareas');
    return data ? JSON.parse(data) : [];
  }
  return getDB().getAllSync('SELECT * FROM tareas');
}

export function getTareasCompletadas() {
  if (Platform.OS === 'web') {
    const tareas = getTareas();
    return tareas.filter(t => t.completed === 1).sort((a, b) => {
      return new Date(b.fechaCompletada) - new Date(a.fechaCompletada);
    });
  }
  return db.getAllSync('SELECT * FROM tareas WHERE completed = 1 ORDER BY fechaCompletada DESC');
}

export function insertTarea(tarea) {
  if (Platform.OS === 'web') {
    const tareas = getTareas();
    localStorage.setItem('tareas', JSON.stringify([...tareas, tarea]));
    return;
  }
  db.runSync(
    'INSERT INTO tareas (id, title, pictogramId, hora, completed, stars, fechaCompletada) VALUES (?,?,?,?,?,?,?)',
    [tarea.id, tarea.title, tarea.pictogramId, tarea.hora, 0, 0, null]
  );
}

// Ahora guarda también la fecha y las estrellas al completar
export function updateTareaCompletada(id, completed, stars = 5) {
  const fecha = completed ? new Date().toISOString().slice(0, 10) : null; // "2025-03-24"
 
  if (Platform.OS === 'web') {
    const tareas = getTareas().map(t =>
      t.id === id
        ? { ...t, completed: completed ? 1 : 0, fechaCompletada: fecha, stars }
        : t
    );
    localStorage.setItem('tareas', JSON.stringify(tareas));
    return;
  }
 
  // SQLite nativo
  db.runSync(
    'UPDATE tareas SET completed = ?, fechaCompletada = ?, stars = ? WHERE id = ?',
    [completed ? 1 : 0, fecha, stars, id]
  );
}

export function updateTareaHora(id, nuevaHora) {
  if (Platform.OS === 'web') {
    const tareas = getTareas().map(t =>
      t.id === id ? { ...t, hora: nuevaHora } : t
    );
    localStorage.setItem('tareas', JSON.stringify(tareas));
    return;
  }
  db.runSync('UPDATE tareas SET hora = ? WHERE id = ?', [nuevaHora, id]);
}

export function deleteTarea(id) {
  if (Platform.OS === 'web') {
    const tareas = getTareas().filter(t => t.id !== id);
    localStorage.setItem('tareas', JSON.stringify(tareas));
    return;
  }
  getDB().runSync('DELETE FROM tareas WHERE id = ?', [id]);
}