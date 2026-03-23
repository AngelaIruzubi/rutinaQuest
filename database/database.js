import { Platform } from 'react-native';

let db = null;

export function initDB() {
  if (Platform.OS === 'web') return; // web usa localStorage
  
  const SQLite = require('expo-sqlite');
  db = SQLite.openDatabaseSync('taskmanager.db');
  
  db.execSync(`
    CREATE TABLE IF NOT EXISTS usuario (
      id        INTEGER PRIMARY KEY,
      cara      INTEGER DEFAULT 0,
      ojos      INTEGER DEFAULT 1,
      peloCorto INTEGER DEFAULT 0,
      peloLargo INTEGER DEFAULT -1,
      shirt     INTEGER DEFAULT 0,
      nivel     INTEGER DEFAULT 1,
      puntos    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tareas (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      pictogramId INTEGER,
      hora        TEXT,
      completed   INTEGER DEFAULT 0
    );

    INSERT OR IGNORE INTO usuario (id) VALUES (1);
  `);

  const migraciones = [
    `ALTER TABLE usuario ADD COLUMN ojos INTEGER DEFAULT 0`,
  ];
  for (const sql of migraciones) {
    try { db.execSync(sql); } catch {}
  }
}

// ── USUARIO ──────────────────────────────────────────────

export function getUsuario() {
  if (Platform.OS === 'web') {
    const data = localStorage.getItem('usuario');
    return data ? JSON.parse(data) : {
      cara: 0, ojos: 0, peloCorto: 0, peloLargo: -1, shirt: 0
    };
  }
  return db.getFirstSync('SELECT * FROM usuario WHERE id = 1');
}

export function updateUsuario(fields) {
  if (Platform.OS === 'web') {
    const current = getUsuario();
    localStorage.setItem('usuario', JSON.stringify({ ...current, ...fields }));
    return;
  }
  const keys = Object.keys(fields).map(k => `${k}=?`).join(', ');
  const values = Object.values(fields);
  db.runSync(`UPDATE usuario SET ${keys} WHERE id=1`, values);
}

// ── TAREAS ───────────────────────────────────────────────

export function getTareas() {
  if (Platform.OS === 'web') {
    const data = localStorage.getItem('tareas');
    return data ? JSON.parse(data) : [];
  }
  return db.getAllSync('SELECT * FROM tareas');
}

export function insertTarea(tarea) {
  if (Platform.OS === 'web') {
    const tareas = getTareas();
    localStorage.setItem('tareas', JSON.stringify([...tareas, tarea]));
    return;
  }
  db.runSync(
    'INSERT INTO tareas (id, title, pictogramId, hora, completed) VALUES (?,?,?,?,?)',
    [tarea.id, tarea.title, tarea.pictogramId, tarea.hora, 0]
  );
}

export function deleteTarea(id) {
  if (Platform.OS === 'web') {
    const tareas = getTareas().filter(t => t.id !== id);
    localStorage.setItem('tareas', JSON.stringify(tareas));
    return;
  }
  db.runSync('DELETE FROM tareas WHERE id = ?', [id]);
}

export default db;