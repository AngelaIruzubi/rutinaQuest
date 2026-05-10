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
    `ALTER TABLE tareas ADD COLUMN repeticion TEXT DEFAULT 'ninguna'`,
    `ALTER TABLE tareas ADD COLUMN tareaBaseId TEXT`,
  ];
  for (const sql of migraciones) {
    try { db.execSync(sql); } catch {}
  }
}

// ── USUARIO ───────────
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

// ── TAREAS ────

export function getTareas() {
  if (Platform.OS === 'web') {
    const data = localStorage.getItem('tareas');
    return data ? JSON.parse(data) : [];
  }
  return getDB().getAllSync('SELECT * FROM tareas');
}


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


export function insertTarea(tarea, fechaDiaParam) {
  const fechaDia   = fechaDiaParam ?? hoyAppStr();
  const repeticion = tarea.repeticion ?? 'ninguna';
  const tareaBaseId = tarea.tareaBaseId ?? null;

  if (Platform.OS === 'web') {
    const tareas = getTareas();
    localStorage.setItem('tareas', JSON.stringify([
      ...tareas,
      { ...tarea, fechaDia, fechaCompletada: null, stars: 0, estado: 'pendiente', repeticion, tareaBaseId },
    ]));
    return;
  }
  getDB().runSync(
    `INSERT INTO tareas
       (id, title, pictogramId, hora, completed, stars, fechaCompletada, fechaDia, estado, repeticion, tareaBaseId)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [tarea.id, tarea.title, tarea.pictogramId ?? null,
     tarea.hora ?? 'Sin hora', 0, 0, null, fechaDia, 'pendiente', repeticion, tareaBaseId]
  );
}


export function generarTareasRepetitivas() {
  const hoy = hoyAppStr();
  const [y, m, d] = hoy.split('-').map(Number);
  const diaSemana = new Date(y, m - 1, d).getDay(); 

  if (Platform.OS === 'web') {
    const todas = getTareas();
    const nuevas = [];

  
    const bases = todas.filter(t =>
      t.repeticion && t.repeticion !== 'ninguna' && !t.tareaBaseId &&
      t.estado !== 'cancelada'
    );

    for (const base of bases) {
   
      const yaExiste = todas.some(t =>
        (t.tareaBaseId === base.id || t.id === base.id) && t.fechaDia === hoy
      );
      if (yaExiste) continue;

     
      if (base.repeticion === 'semanal') {
        const [by, bm, bd] = (base.fechaDia ?? hoy).split('-').map(Number);
        const diaSemanaBase = new Date(by, bm - 1, bd).getDay();
        if (diaSemana !== diaSemanaBase) continue;
      }

      nuevas.push({
        id: `${hoy}_rep_${base.id}_${Math.random().toString(36).slice(2, 6)}`,
        title: base.title,
        pictogramId: base.pictogramId ?? null,
        hora: base.hora ?? 'Sin hora',
        fechaDia: hoy,
        fechaCompletada: null,
        stars: 0,
        estado: 'pendiente',
        completed: 0,
        repeticion: 'ninguna', 
        tareaBaseId: base.id,  
      });
    }

    if (nuevas.length > 0) {
      localStorage.setItem('tareas', JSON.stringify([...todas, ...nuevas]));
    }
    return nuevas.length;
  }


  const bases = getDB().getAllSync(
    `SELECT * FROM tareas WHERE repeticion != 'ninguna' AND (tareaBaseId IS NULL OR tareaBaseId = '')`,
  );

  let creadas = 0;
  for (const base of bases) {
    
    const yaExiste = getDB().getFirstSync(
      `SELECT id FROM tareas WHERE (tareaBaseId = ? OR id = ?) AND fechaDia = ?`,
      [base.id, base.id, hoy]
    );
    if (yaExiste) continue;

    if (base.repeticion === 'semanal') {
      const [by, bm, bd] = (base.fechaDia ?? hoy).split('-').map(Number);
      const diaSemanaBase = new Date(by, bm - 1, bd).getDay();
      if (diaSemana !== diaSemanaBase) continue;
    }

    const newId = `${hoy}_rep_${base.id}_${Math.random().toString(36).slice(2, 6)}`;
    getDB().runSync(
      `INSERT INTO tareas (id, title, pictogramId, hora, completed, stars, fechaCompletada, fechaDia, estado, repeticion, tareaBaseId)
       VALUES (?,?,?,?,0,0,null,?,'pendiente','ninguna',?)`,
      [newId, base.title, base.pictogramId ?? null, base.hora ?? 'Sin hora', hoy, base.id]
    );
    creadas++;
  }
  return creadas;
}


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


export function updateTareaTituloPicto(id, titulo, pictogramId) {
  if (Platform.OS === 'web') {
    const tareas = getTareas().map(t =>
      t.id === id ? { ...t, title: titulo, pictogramId: pictogramId ?? null } : t
    );
    localStorage.setItem('tareas', JSON.stringify(tareas));
    return;
  }
  getDB().runSync(
    'UPDATE tareas SET title=?, pictogramId=? WHERE id=?',
    [titulo, pictogramId ?? null, id]
  );
}


export function updateTareaBaseCompleta(baseId, titulo, pictogramId, hora) {
  if (Platform.OS === 'web') {
    const tareas = getTareas().map(t => {
   
      if (t.id === baseId || (t.tareaBaseId === baseId && t.estado === 'pendiente')) {
        return { ...t, title: titulo, pictogramId: pictogramId ?? null, hora: hora ?? 'Sin hora' };
      }
      return t;
    });
    localStorage.setItem('tareas', JSON.stringify(tareas));
    return;
  }

  getDB().runSync(
    'UPDATE tareas SET title=?, pictogramId=?, hora=? WHERE id=?',
    [titulo, pictogramId ?? null, hora ?? 'Sin hora', baseId]
  );

  getDB().runSync(
    `UPDATE tareas SET title=?, pictogramId=?, hora=?
     WHERE tareaBaseId=? AND estado='pendiente'`,
    [titulo, pictogramId ?? null, hora ?? 'Sin hora', baseId]
  );
}

export function deleteTarea(id) {
  if (Platform.OS === 'web') {
    const tareas = getTareas().filter(t => t.id !== id);
    localStorage.setItem('tareas', JSON.stringify(tareas));
    return;
  }
  getDB().runSync('DELETE FROM tareas WHERE id=?', [id]);
}


export function eliminarTareaYRepetitivas(baseId) {
  const hoy = hoyAppStr();

  if (Platform.OS === 'web') {
    const tareas = getTareas().map(t => {
      if (t.id !== baseId && t.tareaBaseId !== baseId) return t;
      // Completadas: se conservan en historial pero se detiene la repetición
      if (t.estado === 'completada' || t.completed === 1) {
        return { ...t, repeticion: 'ninguna' };
      }
      // Pendientes: cancelar y detener repetición
      return { ...t, estado: 'cancelada', completed: 0, fechaCompletada: hoy, repeticion: 'ninguna' };
    });
    localStorage.setItem('tareas', JSON.stringify(tareas));
    return;
  }

  getDB().runSync('DELETE FROM tareas WHERE id=? OR tareaBaseId=?', [baseId, baseId]);
}

// ── RESET DIARIO ─────

export function limpiarTareasViejas() {
  const hoy  = hoyAppStr();
 
  const [y, m, d] = hoy.split('-').map(Number);
  const ayerDate  = new Date(y, m - 1, d - 1);
  const ayer      = `${ayerDate.getFullYear()}-${String(ayerDate.getMonth()+1).padStart(2,'0')}-${String(ayerDate.getDate()).padStart(2,'0')}`;

  if (Platform.OS === 'web') {
    const todas = getTareas();
    const [yy, mm, dd] = hoy.split('-').map(Number);
    const diaSemana = new Date(yy, mm - 1, dd).getDay();

    // Paso 1: marcar vencidas en una sola pasada
    const actualizadas = todas.map(t => {
      const fechaDia = t.fechaDia ?? hoy;
      const estado   = t.estado ?? (t.completed === 1 ? 'completada' : 'pendiente');
      if (fechaDia < hoy && estado === 'pendiente') {
        return { ...t, fechaDia, estado: 'vencida', completed: 0, fechaCompletada: fechaDia };
      }
      return { ...t, fechaDia, estado };
    });

    // Paso 2: generar instancias repetitivas en la misma pasada
    const bases = actualizadas.filter(t =>
      t.repeticion && t.repeticion !== 'ninguna' && !t.tareaBaseId &&
      t.estado !== 'cancelada'
    );

    const nuevas = [];
    for (const base of bases) {
      const yaExiste = actualizadas.some(t =>
        (t.tareaBaseId === base.id || t.id === base.id) && t.fechaDia === hoy
      );
      if (yaExiste) continue;

      if (base.repeticion === 'semanal') {
        const [by, bm, bd] = (base.fechaDia ?? hoy).split('-').map(Number);
        const diaSemanaBase = new Date(by, bm - 1, bd).getDay();
        if (diaSemana !== diaSemanaBase) continue;
      }

      nuevas.push({
        id: `${hoy}_rep_${base.id}_${Math.random().toString(36).slice(2, 6)}`,
        title: base.title,
        pictogramId: base.pictogramId ?? null,
        hora: base.hora ?? 'Sin hora',
        fechaDia: hoy,
        fechaCompletada: null,
        stars: 0,
        estado: 'pendiente',
        completed: 0,
        repeticion: 'ninguna',
        tareaBaseId: base.id,
      });
    }

    // Un solo write a localStorage con todo
    const final = [...actualizadas, ...nuevas];
    localStorage.setItem('tareas', JSON.stringify(final));

    const tareasHoy = final.filter(t => t.fechaDia === hoy);
    const vencidasAyer = actualizadas.filter(t =>
      t.fechaDia === ayer && t.estado === 'vencida'
    ).length;

    return { tareasHoy, vencidasAyer };
  }

  
  getDB().runSync(`UPDATE tareas SET fechaDia=? WHERE fechaDia IS NULL`, [hoy]);
  getDB().runSync(`
    UPDATE tareas
    SET estado = CASE WHEN completed = 1 THEN 'completada' ELSE 'pendiente' END
    WHERE estado IS NULL
  `);


  getDB().runSync(
    `UPDATE tareas
     SET estado='vencida', completed=0, fechaCompletada=fechaDia
     WHERE fechaDia < ? AND estado='pendiente'`,
    [hoy]
  );


  generarTareasRepetitivas();


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