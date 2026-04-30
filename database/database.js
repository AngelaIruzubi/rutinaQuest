import { Platform } from 'react-native';
import { hoyAppStr } from '../utils/fecha';

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

// ── Historial: completadas, canceladas Y vencidas ─────────────────────────────
// estados:
//   'completada'      → tarea realizada ✓
//   'cancelada'       → eliminada manualmente por el usuario
//   'vencida'         → se quedó pendiente al pasar el día (genera penalización)
export function getTareasHistorial() {
  if (Platform.OS === 'web') {
    return getTareas()
      .filter(t =>
        t.estado === 'completada' ||
        t.estado === 'cancelada'  ||
        t.estado === 'vencida'    ||
        t.completed === 1
      )
      .sort((a, b) => {
        const fa = a.fechaCompletada || a.fechaDia || '';
        const fb = b.fechaCompletada || b.fechaDia || '';
        return fb.localeCompare(fa);
      });
  }
  return getDB().getAllSync(`
    SELECT * FROM tareas
    WHERE estado IN ('completada','cancelada','vencida')
       OR completed = 1
    ORDER BY COALESCE(fechaCompletada, fechaDia) DESC
  `);
}

// ── Insertar tarea ────────────────────────────────────────────────────────────
export function insertTarea(tarea, fechaDiaParam) {
  const fechaDia = fechaDiaParam ?? hoyAppStr();

  if (Platform.OS === 'web') {
    const tareas = getTareas();
    localStorage.setItem('tareas', JSON.stringify([
      ...tareas,
      { ...tarea, fechaDia, fechaCompletada: null, stars: 0, estado: 'pendiente' },
    ]));
    return;
  }
  getDB().runSync(
    `INSERT INTO tareas
       (id, title, pictogramId, hora, completed, stars, fechaCompletada, fechaDia, estado)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [tarea.id, tarea.title, tarea.pictogramId ?? null,
     tarea.hora ?? 'Sin hora', 0, 0, null, fechaDia, 'pendiente']
  );
}

// ── Obtener tareas de una fecha concreta ──────────────────────────────────────
export function getTareasPorFecha(fecha) {
  if (Platform.OS === 'web') {
    return getTareas().filter(t =>
      t.fechaDia === fecha && t.estado !== 'cancelada' && t.estado !== 'vencida'
    );
  }
  return getDB().getAllSync(
    `SELECT * FROM tareas
     WHERE fechaDia = ? AND estado NOT IN ('cancelada','vencida')
     ORDER BY hora ASC`,
    [fecha]
  );
}

// ── Obtener fechas con tareas (para el calendario) ────────────────────────────
export function getFechasConTareas() {
  if (Platform.OS === 'web') {
    const tareas = getTareas().filter(t =>
      t.estado !== 'cancelada' && t.estado !== 'vencida' && t.fechaDia
    );
    const fechas = {};
    for (const t of tareas) {
      if (!fechas[t.fechaDia]) fechas[t.fechaDia] = 0;
      fechas[t.fechaDia]++;
    }
    return fechas;
  }
  const rows = getDB().getAllSync(
    `SELECT fechaDia, COUNT(*) as count
     FROM tareas
     WHERE estado NOT IN ('cancelada','vencida') AND fechaDia IS NOT NULL
     GROUP BY fechaDia`
  );
  const fechas = {};
  for (const r of rows) fechas[r.fechaDia] = r.count;
  return fechas;
}

// ── Marcar completada ─────────────────────────────────────────────────────────
export function updateTareaCompletada(id, completed, stars = 5) {
  const fecha  = completed ? hoyAppStr() : null;
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

// ── Cancelar tarea manualmente (NO genera penalización) ──────────────────────
// El usuario la elimina a propósito → estado 'cancelada'
export function cancelarTarea(id) {
  const hoy = hoyAppStr();

  if (Platform.OS === 'web') {
    const tareas = getTareas().map(t =>
      t.id === id
        ? { ...t, estado: 'cancelada', completed: 0, fechaCompletada: hoy }
        : t
    );
    localStorage.setItem('tareas', JSON.stringify(tareas));
    return;
  }
  getDB().runSync(
    `UPDATE tareas SET estado='cancelada', completed=0, fechaCompletada=? WHERE id=?`,
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

// ── RESET DIARIO ──────────────────────────────────────────────────────────────
// Se llama al arrancar la app.
//
// ESTADOS resultantes:
//   'vencida'   → pendiente al terminar el día → SÍ genera penalización de -10
//   'cancelada' → eliminada manualmente por el usuario → NO genera penalización
//   'completada'→ realizada → NO genera penalización
//
// Devuelve:
//   tareasHoy       → tareas para mostrar en pantalla principal
//   vencidasAyer    → tareas que se quedaron sin hacer (para penalizar)
//   completadasAyer → tareas completadas ayer (info, no penaliza)
export function limpiarTareasViejas() {
  const hoy  = hoyAppStr();
  // Calcular ayer en formato YYYY-MM-DD
  const [y, m, d] = hoy.split('-').map(Number);
  const ayerDate  = new Date(y, m - 1, d - 1);
  const ayer      = `${ayerDate.getFullYear()}-${String(ayerDate.getMonth()+1).padStart(2,'0')}-${String(ayerDate.getDate()).padStart(2,'0')}`;

  if (Platform.OS === 'web') {
    const todas = getTareas();

    // Marcar como vencidas las pendientes de días anteriores
    const actualizadas = todas.map(t => {
      const fechaDia = t.fechaDia ?? hoy;
      const estado   = t.estado ?? (t.completed === 1 ? 'completada' : 'pendiente');
      if (fechaDia < hoy && estado === 'pendiente') {
        return { ...t, fechaDia, estado: 'vencida', completed: 0, fechaCompletada: fechaDia };
      }
      return { ...t, fechaDia, estado };
    });

    localStorage.setItem('tareas', JSON.stringify(actualizadas));

    const tareasHoy = actualizadas.filter(t => t.fechaDia === hoy);
    // Solo contamos las vencidas de AYER, no de toda la historia
    const vencidasAyer = actualizadas.filter(t =>
      t.fechaDia === ayer && t.estado === 'vencida'
    ).length;

    return { tareasHoy, vencidasAyer };
  }

  // ── SQLite nativo ─────────────────────────────────────────────────────────
  getDB().runSync(`UPDATE tareas SET fechaDia=? WHERE fechaDia IS NULL`, [hoy]);
  getDB().runSync(`
    UPDATE tareas
    SET estado = CASE WHEN completed = 1 THEN 'completada' ELSE 'pendiente' END
    WHERE estado IS NULL
  `);

  // Marcar pendientes de días anteriores como vencidas
  getDB().runSync(
    `UPDATE tareas
     SET estado='vencida', completed=0, fechaCompletada=fechaDia
     WHERE fechaDia < ? AND estado='pendiente'`,
    [hoy]
  );

  // Solo contar vencidas de AYER (no acumula días anteriores)
  const vencidasAyer = getDB().getFirstSync(
    `SELECT COUNT(*) as total FROM tareas
     WHERE fechaDia = ? AND estado = 'vencida'`,
    [ayer]
  )?.total ?? 0;

  const tareasHoy = getDB().getAllSync(
    `SELECT * FROM tareas WHERE fechaDia = ? ORDER BY id DESC`, [hoy]
  );

  return { tareasHoy, vencidasAyer };
}