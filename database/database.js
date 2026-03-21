import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('taskmanager.db');

export function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS usuario (
      id INTEGER PRIMARY KEY,
      cara INTEGER DEFAULT 0,
      eyes INTEGER DEFAULT 0,
      peloCorto INTEGER DEFAULT 0,
      peloLargo INTEGER DEFAULT -1,
      shirt INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tareas (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      pictogramId INTEGER,
      hora TEXT,
      completed INTEGER DEFAULT 0
    );

    INSERT OR IGNORE INTO usuario (id) VALUES (1);
  `);
}

export default db;