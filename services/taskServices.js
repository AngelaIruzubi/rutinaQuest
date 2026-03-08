import { db } from "../../database/database";

export const addTask = (title, pictogramId, hora) => {

  const fecha = new Date().toISOString().split('T')[0];

  db.runSync(
    `INSERT INTO tasks (title, pictogramId, hora, completed, fecha)
     VALUES (?, ?, ?, ?, ?)`,
    [title, pictogramId, hora, 0, fecha]
  );

};