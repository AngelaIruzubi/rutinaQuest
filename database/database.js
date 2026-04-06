import { Platform } from 'react-native';
import { hoyAppStr } from '../utils/fecha';

let db = null;

// ─── FECHA SIMULADA ───────────────────────────────────────────────────────────
// Debe ser el mismo valor que en index.tsx e historial.tsx
// Formato: 'YYYY-MM-DD'  |  null para fecha real

// ─────────────────────────────────────────────────────────────────────────────

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

// ── Historial: completadas Y canceladas ───────────────────────────────────────
// Compatibilidad con datos viejos:
//   - estado='completada' o estado='cancelada'  → los nuevos
//   - completed=1 con estado NULL o 'pendiente' → datos viejos ya completados
//   - estado='cancelada' ya cubre cancelaciones nuevas
export function getTareasHistorial() {
  if (Platform.OS === 'web') {
    return getTareas()
      .filter(t =>
        t.estado === 'completada' ||
        t.estado === 'cancelada'  ||
        t.completed === 1          // compatibilidad con datos viejos
      )
      .sort((a, b) => {
        const fa = a.fechaCompletada || a.fechaDia || '';
        const fb = b.fechaCompletada || b.fechaDia || '';
        return fb.localeCompare(fa);
      });
  }
  return getDB().getAllSync(`
    SELECT * FROM tareas
    WHERE estado IN ('completada','cancelada')
       OR completed = 1
    ORDER BY COALESCE(fechaCompletada, fechaDia) DESC
  `);
}

// ── Insertar tarea ─────────────────────────────────────────────────────────────
export function insertTarea(tarea) {
  const hoy = hoyAppStr(); // usa fecha simulada si está activa

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

// ── Marcar completada ──────────────────────────────────────────────────────────
export function updateTareaCompletada(id, completed, stars = 5) {
  const fecha  = completed ? hoyAppStr() : null; // usa fecha simulada
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

// ── Cancelar tarea (queda en historial, no se borra físicamente) ───────────────
export function cancelarTarea(id) {
  const hoy = hoyAppStr();

  if (Platform.OS === 'web') {
    const tareas = getTareas().map(t =>
      t.id === id
        ? {
            ...t,
            estado: 'cancelada',
            completed: 0,
            fechaCompletada: hoy,
          }
        : t
    );
    localStorage.setItem('tareas', JSON.stringify(tareas));
    return;
  }

  getDB().runSync(
    `UPDATE tareas
     SET estado='cancelada', completed=0, fechaCompletada=?
     WHERE id=?`,
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
// - Tareas pendientes de días ANTERIORES → se marcan como canceladas (van al historial)
// - Tareas de HOY (pendientes o completadas) → NO se tocan
// - Devuelve SOLO las tareas de hoy (para mostrar en index)
export function limpiarTareasViejas() {
  const hoy = hoyAppStr(); // usa fecha simulada si está activa

  if (Platform.OS === 'web') {
    const todas = getTareas();

    const actualizadas = todas.map(t => {
      const fechaDia = t.fechaDia ?? hoy;
      const estado = t.estado ?? (t.completed === 1 ? 'completada' : 'pendiente');

      const esDiaAnterior = fechaDia !== hoy;
      const esPendiente = estado === 'pendiente';

      if (esDiaAnterior && esPendiente) {
        return {
          ...t,
          fechaDia,
          estado: 'cancelada',
          completed: 0,
          fechaCompletada: fechaDia,
        };
      }

      return {
        ...t,
        fechaDia,
        estado,
      };
    });

    localStorage.setItem('tareas', JSON.stringify(actualizadas));

    const tareasHoy = actualizadas.filter(t => t.fechaDia === hoy);

    // Buscar el día anterior más reciente con tareas
    const diasAnteriores = actualizadas.filter(t => t.fechaDia && t.fechaDia !== hoy);
    const fechaUltimoDia = diasAnteriores.reduce(
      (max, t) => (!max || t.fechaDia > max) ? t.fechaDia : max, null
    );
    const tareasUltimoDia = fechaUltimoDia
      ? diasAnteriores.filter(t => t.fechaDia === fechaUltimoDia)
      : [];
    // Usar estado ANTES del map para saber si eran pendientes (ahora canceladas)
    // 'cancelada' incluye las recién canceladas por este reset + las ya canceladas antes
    // Solo nos interesan las del último día anterior
    const canceladasAyer  = tareasUltimoDia.filter(t =>
      t.estado === 'cancelada'
    ).length;
    const completadasAyer = tareasUltimoDia.filter(t =>
      t.estado === 'completada' || t.completed === 1
    ).length;

    return { tareasHoy, canceladasAyer, completadasAyer };
  }

  // ── SQLite nativo ────────────────────────────────────────────────────────

  // Rellenar tareas antiguas sin fechaDia
  getDB().runSync(
    `UPDATE tareas SET fechaDia=? WHERE fechaDia IS NULL`,
    [hoy]
  );

  // Si alguna tarea antigua no tiene estado, reconstruirlo
  getDB().runSync(`
    UPDATE tareas
    SET estado = CASE
      WHEN completed = 1 THEN 'completada'
      ELSE 'pendiente'
    END
    WHERE estado IS NULL
  `);

  // Encontrar el día anterior más reciente con tareas
  const ultimoDiaRow = getDB().getFirstSync(
    `SELECT MAX(fechaDia) as fecha FROM tareas WHERE fechaDia < ?`, [hoy]
  );
  const fechaUltimoDia = ultimoDiaRow?.fecha ?? null;

  // Contar pendientes (aún no canceladas), completadas y ya-canceladas de ese día
  // IMPORTANTE: contar ANTES del UPDATE que cancela pendientes
  const ayer = fechaUltimoDia ? (getDB().getFirstSync(
    `SELECT
       COUNT(CASE WHEN estado IN ('pendiente','cancelada') THEN 1 END) as canceladas,
       COUNT(CASE WHEN estado = 'completada'               THEN 1 END) as completadas
     FROM tareas WHERE fechaDia = ?`,
    [fechaUltimoDia]
  ) ?? { canceladas: 0, completadas: 0 }) : { canceladas: 0, completadas: 0 };

  // Cancelar SOLO pendientes de días anteriores
  getDB().runSync(
    `UPDATE tareas
     SET estado='cancelada',
         completed=0,
         fechaCompletada=fechaDia
     WHERE fechaDia != ?
       AND estado='pendiente'`,
    [hoy]
  );

  const tareasHoy = getDB().getAllSync(
    `SELECT * FROM tareas WHERE fechaDia = ? ORDER BY id DESC`,
    [hoy]
  );

  return {
    tareasHoy,
    canceladasAyer: ayer.canceladas,
    completadasAyer: ayer.completadas,
  };
}