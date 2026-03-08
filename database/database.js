
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('rutinaquest.db');

export const initDB = () => {
  db.transaction(tx => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        pictogramId INTEGER,
        hora TEXT,
        completed INTEGER DEFAULT 0
      );`,
      [],
      () => console.log('Tabla tasks inicializada'),
      (_, error) => {
        console.error('Error al crear tabla tasks:', error);
        return false;
      }
    );
 });
};

export const getDB = () => db;
