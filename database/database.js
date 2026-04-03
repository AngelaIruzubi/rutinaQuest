import { Platform } from 'react-native';
const FECHA_SIMULADA = '04/05/2026'; 

let db = null;

function getDB() {
  if (!db) {
    const SQLite = require('expo-sqlite');
    db = SQLite.openDatabaseSync('taskmanager.db');
  }
  return db;
}
function hoySimulado() {
  return FECHA_SIMULADA ?? new Date().toISOString().slice(0, 10);
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
      stars            INTEGER DEFAULT 0,
      fechaCompletada  TEXT,
      fechaDia         TEXT,
      estado           TEXT DEFAULT 'pendiente'
    );
    INSERT OR IGNORE INTO usuario (id) VALUES (1);
  `);

  const migraciones = [
    `ALTER TABLE usuario ADD COLUMN ojos INTEGER DEFAULT 0`,
    `ALTER TABLE tareas ADD COLUMN fechaCompletada TEXT`,
    `ALTER TABLE tareas ADD COLUMN stars INTEGER DEFAULT 0`,
    `ALTER TABLE tareas ADD COLUMN fechaDia TEXT`,
    `ALTER TABLE tareas ADD COLUMN estado TEXT DEFAULT 'pendiente'`,
  ];
  for (const sql of migraciones) {
    try { db.execSync(sql); } catch {}
  }
}

// ── USUARIO ───────────────────────────────────────────────────────────────────

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

// ── TAREAS ────────────────────────────────────────────────────────────────────

export function getTareas() {
  if (Platform.OS === 'web') {
    const data = localStorage.getItem('tareas');
    return data ? JSON.parse(data) : [];
  }
  return getDB().getAllSync('SELECT * FROM tareas');
}

// Para el historial: devuelve completadas Y canceladas
export function getTareasHistorial() {
  if (Platform.OS === 'web') {
    return getTareas()
      .filter(t => t.estado === 'completada' || t.estado === 'cancelada')
      .sort((a, b) => {
        const fa = a.fechaCompletada || a.fechaDia || '';
        const fb = b.fechaCompletada || b.fechaDia || '';
        return fb.localeCompare(fa);
      });
  }
  return getDB().getAllSync(
    `SELECT * FROM tareas
     WHERE estado IN ('completada','cancelada')
     ORDER BY COALESCE(fechaCompletada, fechaDia) DESC`
  );
}

export function insertTarea(tarea) {
  const hoy = hoySimulado();
  if (Platform.OS === 'web') {
    const tareas = getTareas();
    localStorage.setItem('tareas', JSON.stringify([
      ...tareas,
      { ...tarea, fechaDia: hoy, fechaCompletada: null, stars: 0, estado: 'pendiente' },
    ]));
    return;
  }
  getDB().runSync(
    `INSERT INTO tareas
       (id, title, pictogramId, hora, completed, stars, fechaCompletada, fechaDia, estado)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [tarea.id, tarea.title, tarea.pictogramId ?? null,
     tarea.hora ?? 'Sin hora', 0, 0, null, hoy, 'pendiente']
  );
}

// Marcar completada — estado = 'completada'
export function updateTareaCompletada(id, completed, stars = 5) {
  const fecha  = completed ? hoySimulado() : null;
  const estado = completed ? 'completada' : 'pendiente';

  if (Platform.OS === 'web') {
    const tareas = getTareas().map(t =>
      t.id === id
        ? { ...t, completed: completed ? 1 : 0, fechaCompletada: fecha, stars, estado }
        : t
    );
    localStorage.setItem('tareas', JSON.stringify(tareas));
    return;
  }
  getDB().runSync(
    `UPDATE tareas SET completed=?, fechaCompletada=?, stars=?, estado=? WHERE id=?`,
    [completed ? 1 : 0, fecha, stars, estado, id]
  );
}

// Cancelar tarea — estado = 'cancelada', queda en historial
export function cancelarTarea(id) {
  const hoy = hoySimulado();
  if (Platform.OS === 'web') {
    const tareas = getTareas().map(t =>
      t.id === id ? { ...t, estado: 'cancelada', fechaCompletada: hoy } : t
    );
    localStorage.setItem('tareas', JSON.stringify(tareas));
    return;
  }
  getDB().runSync(
    `UPDATE tareas SET estado='cancelada', fechaCompletada=? WHERE id=?`,
    [hoy, id]
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
  getDB().runSync('UPDATE tareas SET hora=? WHERE id=?', [nuevaHora, id]);
}

export function deleteTarea(id) {
  if (Platform.OS === 'web') {
    const tareas = getTareas().filter(t => t.id !== id);
    localStorage.setItem('tareas', JSON.stringify(tareas));
    return;
  }
  getDB().runSync('DELETE FROM tareas WHERE id=?', [id]);
}

// Reset diario: pendientes de días anteriores → canceladas
export function limpiarTareasViejas() {
  const hoy = hoySimulado();

  if (Platform.OS === 'web') {
    const todas = getTareas();
    const actualizadas = todas.map(t => {
      if (t.fechaDia && t.fechaDia !== hoy && t.estado === 'pendiente') {
        return { ...t, estado: 'cancelada', fechaCompletada: t.fechaDia };
      }
      return t;
    });
    localStorage.setItem('tareas', JSON.stringify(actualizadas));
    return actualizadas.filter(t => !t.fechaDia || t.fechaDia === hoy);
  }

  getDB().runSync(
    `UPDATE tareas SET fechaDia=? WHERE fechaDia IS NULL AND estado='pendiente'`,
    [hoy]
  );
  getDB().runSync(
    `UPDATE tareas SET estado='cancelada', fechaCompletada=fechaDia
     WHERE fechaDia!=? AND estado='pendiente'`,
    [hoy]
  );
  return getDB().getAllSync(`SELECT * FROM tareas WHERE fechaDia=?`, [hoy]);
}