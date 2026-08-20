import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";
import { hoyAppStr } from "../utils/fecha";

let db = null;
let dbInitialized = false;

// ── COLA DE ACCESO A LA BD ────────────────────────────────────────────────
// Con la API async, dos pantallas pueden pedir datos casi a la vez (p.ej. al
// navegar rápido entre Calendario e Historial). Antes, con la API síncrona,
// JS al ser de un solo hilo lo serializaba todo "gratis". Con async, dos
// llamadas pueden solaparse de verdad y el módulo nativo de expo-sqlite no
// lo soporta bien (se ha visto NullPointerException al abrir/consultar
// concurrentemente). Esta cola obliga a que solo haya UNA operación de BD en
// vuelo a la vez, recuperando esa seguridad.
//
// Solo las funciones EXPORTADAS pasan por la cola (son la puerta de entrada
// desde fuera de este archivo). Cuando una función necesita el resultado de
// OTRA función de este mismo archivo, debe llamar a su versión "Impl" (sin
// cola) para no encolarse a sí misma en bucle (eso sería un interbloqueo:
// la tarea exterior esperaría a la interior, pero la interior no empezaría
// hasta que la exterior — que aún no ha terminado — le cediera turno).
/** @type {Promise<any>} */
let colaDB = Promise.resolve();
/**
 * @template T
 * @param {() => Promise<T>} tarea
 * @returns {Promise<T>}
 */
function encolar(tarea) {
  const resultado = colaDB.then(tarea, tarea);
  colaDB = resultado.then(
    () => undefined,
    () => undefined,
  );
  return resultado;
}

// Abre la conexión nativa (API async) y aplica el esquema/migraciones.
// Devuelve la conexión "en crudo" (sin envolver), o lanza si falla.
async function abrirYMigrar() {
  const SQLite = require("expo-sqlite");
  const rawDb = await SQLite.openDatabaseAsync("taskmanager.db");
  await rawDb.execAsync(`
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
    "ALTER TABLE usuario ADD COLUMN ojos INTEGER DEFAULT 0",
    "ALTER TABLE tareas ADD COLUMN fechaCompletada TEXT",
    "ALTER TABLE tareas ADD COLUMN stars INTEGER DEFAULT 0",
    "ALTER TABLE tareas ADD COLUMN fechaDia TEXT",
    "ALTER TABLE tareas ADD COLUMN estado TEXT DEFAULT 'pendiente'",
    "ALTER TABLE tareas ADD COLUMN repeticion TEXT DEFAULT 'ninguna'",
    "ALTER TABLE tareas ADD COLUMN tareaBaseId TEXT",
    "ALTER TABLE usuario ADD COLUMN genero TEXT DEFAULT 'hombre'",
  ];
  for (const sql of migraciones) {
    try {
      await rawDb.execAsync(sql);
    } catch {}
  }
  return rawDb;
}

// Envuelve la conexión nativa: si una consulta falla (p.ej. la BD quedó
// bloqueada tras un error puntual), se descarta la conexión guardada y se
// reintenta UNA vez con una conexión nueva (en crudo, sin volver a envolver,
// para no encadenar reintentos) antes de dejar que el error suba. Así un
// fallo transitorio se resuelve solo, sin que la pantalla se quede vacía.
function envolverConexion(rawDb) {
  const conMetodo =
    (nombre) =>
    async (...args) => {
      try {
        return await rawDb[nombre](...args);
      } catch (e) {
        console.error(
          `[DB] Fallo en ${nombre}, reintentando con conexión nueva:`,
          e?.message ?? e,
        );
        Sentry.captureException(e, {
          tags: { origen: "database.js", fase: "consulta" },
          extra: { metodo: nombre, args },
        });
        db = null;
        dbInitialized = false;
        let rawDb2;
        try {
          rawDb2 = await abrirYMigrar();
        } catch (e2) {
          Sentry.captureException(e2, {
            tags: { origen: "database.js", fase: "reapertura" },
            extra: { metodo: nombre },
          });
          throw e;
        }
        db = envolverConexion(rawDb2);
        dbInitialized = true;
        try {
          return await rawDb2[nombre](...args);
        } catch (e3) {
          Sentry.captureException(e3, {
            tags: { origen: "database.js", fase: "reintento" },
            extra: { metodo: nombre, args },
          });
          throw e3;
        }
      }
    };
  return {
    execAsync: conMetodo("execAsync"),
    runAsync: conMetodo("runAsync"),
    getAllAsync: conMetodo("getAllAsync"),
    getFirstAsync: conMetodo("getFirstAsync"),
  };
}

async function getDB() {
  if (!db || !dbInitialized) {
    try {
      const rawDb = await abrirYMigrar();
      dbInitialized = true;
      db = envolverConexion(rawDb);
    } catch (e) {
      console.error("[DB] Error inicializando BD:", e?.message ?? e);
      Sentry.captureException(e, {
        tags: { origen: "database.js", fase: "inicializacion" },
      });
      db = null;
      dbInitialized = false;
      return null;
    }
  }
  return db;
}

async function initDBImpl() {
  if (Platform.OS === "web") return;
  await getDB(); // delega a getDB que ya inicializa todo
}
export function initDB() {
  return encolar(initDBImpl);
}

// ── USUARIO ────

const USUARIO_DEFAULT = {
  tonoPiel: 0,
  cara: 0,
  ojos: 0,
  peloCorto: 0,
  peloLargo: -1,
  shirt: 0,
  genero: "hombre",
  nivel: 1,
  puntos: 0,
};

async function getUsuarioImpl() {
  if (Platform.OS === "web") {
    const data = localStorage.getItem("usuario");
    return data ? JSON.parse(data) : USUARIO_DEFAULT;
  }
  try {
    const database = await getDB();
    return (
      (await database?.getFirstAsync("SELECT * FROM usuario WHERE id = 1")) ??
      null
    );
  } catch (e) {
    return null;
  }
}
export function getUsuario() {
  return encolar(getUsuarioImpl);
}

async function updateUsuarioImpl(fields) {
  if (Platform.OS === "web") {
    const current = await getUsuarioImpl();
    localStorage.setItem("usuario", JSON.stringify({ ...current, ...fields }));
    return;
  }
  const keys = Object.keys(fields)
    .map((k) => `${k}=?`)
    .join(", ");
  const values = Object.values(fields);
  try {
    const database = await getDB();
    await database?.runAsync(`UPDATE usuario SET ${keys} WHERE id=1`, values);
  } catch (e) {
    console.error("[DB] error:", e?.message);
  }
}
export function updateUsuario(fields) {
  return encolar(() => updateUsuarioImpl(fields));
}

// ── TAREAS ────

async function getTareasImpl() {
  if (Platform.OS === "web") {
    const data = localStorage.getItem("tareas");
    return data ? JSON.parse(data) : [];
  }
  try {
    const database = await getDB();
    return (await database?.getAllAsync("SELECT * FROM tareas")) ?? [];
  } catch (e) {
    return [];
  }
}
export function getTareas() {
  return encolar(getTareasImpl);
}

async function getTareasHistorialImpl() {
  if (Platform.OS === "web") {
    return (await getTareasImpl())
      .filter(
        (t) =>
          t.estado === "completada" ||
          t.estado === "cancelada" ||
          t.estado === "vencida" ||
          t.completed === 1,
      )
      .sort((a, b) => {
        const fa = a.fechaCompletada || a.fechaDia || "";
        const fb = b.fechaCompletada || b.fechaDia || "";
        return fb.localeCompare(fa);
      });
  }
  try {
    const database = await getDB();
    return (
      (await database?.getAllAsync(`
    SELECT * FROM tareas
    WHERE estado IN ('completada','cancelada','vencida') OR completed = 1
    ORDER BY COALESCE(fechaCompletada, fechaDia) DESC
  `)) ?? []
    );
  } catch (e) {
    console.error("[DB] getTareasHistorial error:", e?.message);
    return [];
  }
}
export function getTareasHistorial() {
  return encolar(getTareasHistorialImpl);
}

async function insertTareaImpl(tarea, fechaDiaParam) {
  const fechaDia = fechaDiaParam ?? hoyAppStr();
  const repeticion = tarea.repeticion ?? "ninguna";
  const tareaBaseId = tarea.tareaBaseId ?? null;

  if (Platform.OS === "web") {
    const tareas = await getTareasImpl();
    localStorage.setItem(
      "tareas",
      JSON.stringify([
        ...tareas,
        {
          ...tarea,
          fechaDia,
          fechaCompletada: null,
          stars: 0,
          estado: "pendiente",
          repeticion,
          tareaBaseId,
        },
      ]),
    );
    return;
  }
  try {
    const database = await getDB();
    await database?.runAsync(
      `INSERT INTO tareas (id, title, pictogramId, hora, completed, stars, fechaCompletada, fechaDia, estado, repeticion, tareaBaseId)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        tarea.id,
        tarea.title,
        tarea.pictogramId ?? null,
        tarea.hora ?? "Sin hora",
        0,
        0,
        null,
        fechaDia,
        "pendiente",
        repeticion,
        tareaBaseId,
      ],
    );
  } catch (e) {
    console.error("[DB] insertTarea error:", e?.message);
  }
}
export function insertTarea(tarea, fechaDiaParam) {
  return encolar(() => insertTareaImpl(tarea, fechaDiaParam));
}

async function generarTareasRepetitivasImpl() {
  const hoy = hoyAppStr();
  const [y, m, d] = hoy.split("-").map(Number);
  const diaSemana = new Date(y, m - 1, d).getDay();

  if (Platform.OS === "web") {
    const todas = await getTareasImpl();
    const nuevas = [];
    const bases = todas.filter(
      (t) =>
        t.repeticion &&
        t.repeticion !== "ninguna" &&
        !t.tareaBaseId &&
        t.estado !== "cancelada",
    );
    for (const base of bases) {
      const yaExiste = todas.some(
        (t) =>
          (t.tareaBaseId === base.id || t.id === base.id) && t.fechaDia === hoy,
      );
      if (yaExiste) continue;
      if (base.repeticion === "semanal") {
        const [by, bm, bd] = (base.fechaDia ?? hoy).split("-").map(Number);
        if (diaSemana !== new Date(by, bm - 1, bd).getDay()) continue;
      }
      nuevas.push({
        id: `${hoy}_rep_${base.id}_${Math.random().toString(36).slice(2, 6)}`,
        title: base.title,
        pictogramId: base.pictogramId ?? null,
        hora: base.hora ?? "Sin hora",
        fechaDia: hoy,
        fechaCompletada: null,
        stars: 0,
        estado: "pendiente",
        completed: 0,
        repeticion: "ninguna",
        tareaBaseId: base.id,
      });
    }
    if (nuevas.length > 0)
      localStorage.setItem("tareas", JSON.stringify([...todas, ...nuevas]));
    return nuevas.length;
  }

  let bases = [];
  try {
    const database = await getDB();
    bases =
      (await database?.getAllAsync(
        `SELECT * FROM tareas WHERE repeticion != 'ninguna' AND (tareaBaseId IS NULL OR tareaBaseId = '')`,
      )) ?? [];
  } catch (e) {
    return 0;
  }

  let creadas = 0;
  for (const base of bases) {
    let yaExiste = null;
    try {
      const database = await getDB();
      yaExiste = await database?.getFirstAsync(
        `SELECT id FROM tareas WHERE (tareaBaseId = ? OR id = ?) AND fechaDia = ?`,
        [base.id, base.id, hoy],
      );
    } catch (e) {
      continue;
    }
    if (yaExiste) continue;

    if (base.repeticion === "semanal") {
      const [by, bm, bd] = (base.fechaDia ?? hoy).split("-").map(Number);
      if (diaSemana !== new Date(by, bm - 1, bd).getDay()) continue;
    }

    const newId = `${hoy}_rep_${base.id}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      const database = await getDB();
      await database?.runAsync(
        `INSERT INTO tareas (id, title, pictogramId, hora, completed, stars, fechaCompletada, fechaDia, estado, repeticion, tareaBaseId)
       VALUES (?,?,?,?,0,0,null,?,'pendiente','ninguna',?)`,
        [
          newId,
          base.title,
          base.pictogramId ?? null,
          base.hora ?? "Sin hora",
          hoy,
          base.id,
        ],
      );
    } catch (e) {
      console.error("[DB] insert repetitiva error:", e?.message);
    }
    creadas++;
  }
  return creadas;
}
export function generarTareasRepetitivas() {
  return encolar(generarTareasRepetitivasImpl);
}

async function getTareasPorFechaImpl(fecha) {
  if (Platform.OS === "web") {
    return (await getTareasImpl()).filter(
      (t) =>
        t.fechaDia === fecha &&
        t.estado !== "cancelada" &&
        t.estado !== "vencida",
    );
  }
  try {
    const database = await getDB();
    return (
      (await database?.getAllAsync(
        `SELECT * FROM tareas WHERE fechaDia = ? AND estado NOT IN ('cancelada','vencida') ORDER BY hora ASC`,
        [fecha],
      )) ?? []
    );
  } catch (e) {
    console.error("[DB] getTareasPorFecha error:", e?.message);
    return [];
  }
}
export function getTareasPorFecha(fecha) {
  return encolar(() => getTareasPorFechaImpl(fecha));
}

async function getFechasConTareasImpl() {
  if (Platform.OS === "web") {
    const tareas = (await getTareasImpl()).filter(
      (t) =>
        (t.estado === "pendiente" || (!t.estado && t.completed !== 1)) &&
        t.fechaDia,
    );
    const fechas = {};
    for (const t of tareas) {
      if (!fechas[t.fechaDia]) fechas[t.fechaDia] = 0;
      fechas[t.fechaDia]++;
    }
    return fechas;
  }
  const rows = await (async () => {
    try {
      const database = await getDB();
      return (
        (await database?.getAllAsync(
          `SELECT fechaDia, COUNT(*) as count FROM tareas WHERE (estado = 'pendiente' OR (estado IS NULL AND completed != 1)) AND fechaDia IS NOT NULL GROUP BY fechaDia`,
        )) ?? []
      );
    } catch (e) {
      console.error("[DB] getFechasConTareas error:", e?.message);
      return [];
    }
  })();
  const fechas = {};
  for (const r of rows) fechas[r.fechaDia] = r.count;
  return fechas;
}
export function getFechasConTareas() {
  return encolar(getFechasConTareasImpl);
}

async function updateTareaCompletadaImpl(id, completed, stars = 5) {
  const fecha = completed ? hoyAppStr() : null;
  const estado = completed ? "completada" : "pendiente";
  if (Platform.OS === "web") {
    const tareas = (await getTareasImpl()).map((t) =>
      t.id === id
        ? {
            ...t,
            completed: completed ? 1 : 0,
            fechaCompletada: fecha,
            stars,
            estado,
          }
        : t,
    );
    localStorage.setItem("tareas", JSON.stringify(tareas));
    return;
  }
  try {
    const database = await getDB();
    await database?.runAsync(
      `UPDATE tareas SET completed=?, fechaCompletada=?, stars=?, estado=? WHERE id=?`,
      [completed ? 1 : 0, fecha, stars, estado, id],
    );
  } catch (e) {
    console.error("[DB] updateTareaCompletada error:", e?.message);
  }
}
export function updateTareaCompletada(id, completed, stars = 5) {
  return encolar(() => updateTareaCompletadaImpl(id, completed, stars));
}

async function cancelarTareaImpl(id) {
  const hoy = hoyAppStr();
  if (Platform.OS === "web") {
    const tareas = (await getTareasImpl()).map((t) =>
      t.id === id
        ? { ...t, estado: "cancelada", completed: 0, fechaCompletada: hoy }
        : t,
    );
    localStorage.setItem("tareas", JSON.stringify(tareas));
    return;
  }
  try {
    const database = await getDB();
    await database?.runAsync(
      `UPDATE tareas SET estado='cancelada', completed=0, fechaCompletada=? WHERE id=?`,
      [hoy, id],
    );
  } catch (e) {
    console.error("[DB] error:", e?.message);
  }
}
export function cancelarTarea(id) {
  return encolar(() => cancelarTareaImpl(id));
}

async function updateTareaHoraImpl(id, nuevaHora) {
  if (Platform.OS === "web") {
    const tareas = (await getTareasImpl()).map((t) =>
      t.id === id ? { ...t, hora: nuevaHora } : t,
    );
    localStorage.setItem("tareas", JSON.stringify(tareas));
    return;
  }
  try {
    const database = await getDB();
    await database?.runAsync("UPDATE tareas SET hora=? WHERE id=?", [
      nuevaHora,
      id,
    ]);
  } catch (e) {
    console.error("[DB] error:", e?.message);
  }
}
export function updateTareaHora(id, nuevaHora) {
  return encolar(() => updateTareaHoraImpl(id, nuevaHora));
}

async function updateTareaTituloPictoImpl(id, titulo, pictogramId) {
  if (Platform.OS === "web") {
    const tareas = (await getTareasImpl()).map((t) =>
      t.id === id
        ? { ...t, title: titulo, pictogramId: pictogramId ?? null }
        : t,
    );
    localStorage.setItem("tareas", JSON.stringify(tareas));
    return;
  }
  try {
    const database = await getDB();
    await database?.runAsync(
      "UPDATE tareas SET title=?, pictogramId=? WHERE id=?",
      [titulo, pictogramId ?? null, id],
    );
  } catch (e) {
    console.error("[DB] error:", e?.message);
  }
}
export function updateTareaTituloPicto(id, titulo, pictogramId) {
  return encolar(() => updateTareaTituloPictoImpl(id, titulo, pictogramId));
}

async function updateTareaBaseCompletaImpl(baseId, titulo, pictogramId, hora) {
  if (Platform.OS === "web") {
    const tareas = (await getTareasImpl()).map((t) => {
      if (
        t.id === baseId ||
        (t.tareaBaseId === baseId && t.estado === "pendiente")
      ) {
        return {
          ...t,
          title: titulo,
          pictogramId: pictogramId ?? null,
          hora: hora ?? "Sin hora",
        };
      }
      return t;
    });
    localStorage.setItem("tareas", JSON.stringify(tareas));
    return;
  }
  try {
    const database = await getDB();
    await database?.runAsync(
      "UPDATE tareas SET title=?, pictogramId=?, hora=? WHERE id=?",
      [titulo, pictogramId ?? null, hora ?? "Sin hora", baseId],
    );
  } catch (e) {
    console.error("[DB] error:", e?.message);
  }
  try {
    const database = await getDB();
    await database?.runAsync(
      `UPDATE tareas SET title=?, pictogramId=?, hora=? WHERE tareaBaseId=? AND estado='pendiente'`,
      [titulo, pictogramId ?? null, hora ?? "Sin hora", baseId],
    );
  } catch (e) {
    console.error("[DB] error:", e?.message);
  }
}
export function updateTareaBaseCompleta(baseId, titulo, pictogramId, hora) {
  return encolar(() =>
    updateTareaBaseCompletaImpl(baseId, titulo, pictogramId, hora),
  );
}

async function deleteTareaImpl(id) {
  if (Platform.OS === "web") {
    const tareas = (await getTareasImpl()).filter((t) => t.id !== id);
    localStorage.setItem("tareas", JSON.stringify(tareas));
    return;
  }
  try {
    const database = await getDB();
    await database?.runAsync("DELETE FROM tareas WHERE id=?", [id]);
  } catch (e) {
    console.error("[DB] deleteTarea error:", e?.message);
  }
}
export function deleteTarea(id) {
  return encolar(() => deleteTareaImpl(id));
}

async function eliminarTareaYRepetitivasImpl(baseId) {
  const hoy = hoyAppStr();
  if (Platform.OS === "web") {
    const tareas = (await getTareasImpl()).map((t) => {
      if (t.id !== baseId && t.tareaBaseId !== baseId) return t;
      if (t.estado === "completada" || t.completed === 1)
        return { ...t, repeticion: "ninguna" };
      return {
        ...t,
        estado: "cancelada",
        completed: 0,
        fechaCompletada: hoy,
        repeticion: "ninguna",
      };
    });
    localStorage.setItem("tareas", JSON.stringify(tareas));
    return;
  }
  try {
    const database = await getDB();
    await database?.runAsync(
      `UPDATE tareas SET repeticion='ninguna' WHERE (id=? OR tareaBaseId=?) AND (estado='completada' OR completed=1)`,
      [baseId, baseId],
    );
  } catch (e) {
    console.error("[DB] error:", e?.message);
  }
  try {
    const database = await getDB();
    await database?.runAsync(
      `UPDATE tareas SET estado='cancelada', completed=0, fechaCompletada=fechaDia, repeticion='ninguna' WHERE (id=? OR tareaBaseId=?) AND estado='pendiente' AND fechaDia <= ?`,
      [baseId, baseId, hoy],
    );
  } catch (e) {
    console.error("[DB] error:", e?.message);
  }
  try {
    const database = await getDB();
    await database?.runAsync(
      `DELETE FROM tareas WHERE (id=? OR tareaBaseId=?) AND estado='pendiente' AND fechaDia > ?`,
      [baseId, baseId, hoy],
    );
  } catch (e) {
    console.error("[DB] error:", e?.message);
  }
}
export function eliminarTareaYRepetitivas(baseId) {
  return encolar(() => eliminarTareaYRepetitivasImpl(baseId));
}

// ── RESET DIARIO ─────

async function limpiarTareasViejasImpl() {
  const hoy = hoyAppStr();
  const [y, m, d] = hoy.split("-").map(Number);
  const ayerDate = new Date(y, m - 1, d - 1);
  const ayer = `${ayerDate.getFullYear()}-${String(ayerDate.getMonth() + 1).padStart(2, "0")}-${String(ayerDate.getDate()).padStart(2, "0")}`;

  if (Platform.OS === "web") {
    const todas = await getTareasImpl();
    const [yy, mm, dd] = hoy.split("-").map(Number);
    const diaSemana = new Date(yy, mm - 1, dd).getDay();
    const actualizadas = todas.map((t) => {
      const fechaDia = t.fechaDia ?? hoy;
      const estado =
        t.estado ?? (t.completed === 1 ? "completada" : "pendiente");
      if (fechaDia < hoy && estado === "pendiente") {
        return {
          ...t,
          fechaDia,
          estado: "vencida",
          completed: 0,
          fechaCompletada: fechaDia,
        };
      }
      return { ...t, fechaDia, estado };
    });
    const bases = actualizadas.filter(
      (t) =>
        t.repeticion &&
        t.repeticion !== "ninguna" &&
        !t.tareaBaseId &&
        t.estado !== "cancelada",
    );
    const nuevas = [];
    for (const base of bases) {
      const yaExiste = actualizadas.some(
        (t) =>
          (t.tareaBaseId === base.id || t.id === base.id) && t.fechaDia === hoy,
      );
      if (yaExiste) continue;
      if (base.repeticion === "semanal") {
        const [by, bm, bd] = (base.fechaDia ?? hoy).split("-").map(Number);
        if (diaSemana !== new Date(by, bm - 1, bd).getDay()) continue;
      }
      nuevas.push({
        id: `${hoy}_rep_${base.id}_${Math.random().toString(36).slice(2, 6)}`,
        title: base.title,
        pictogramId: base.pictogramId ?? null,
        hora: base.hora ?? "Sin hora",
        fechaDia: hoy,
        fechaCompletada: null,
        stars: 0,
        estado: "pendiente",
        completed: 0,
        repeticion: "ninguna",
        tareaBaseId: base.id,
      });
    }
    const final = [...actualizadas, ...nuevas];
    localStorage.setItem("tareas", JSON.stringify(final));
    const tareasHoy = final.filter((t) => t.fechaDia === hoy);
    const vencidasAyer = actualizadas.filter(
      (t) => t.fechaDia === ayer && t.estado === "vencida",
    ).length;
    return { tareasHoy, vencidasAyer };
  }

  try {
    const database = await getDB();
    await database?.runAsync(`UPDATE tareas SET fechaDia=? WHERE fechaDia IS NULL`, [
      hoy,
    ]);
  } catch (e) {}
  try {
    const database = await getDB();
    await database?.runAsync(`
    UPDATE tareas SET estado = CASE WHEN completed = 1 THEN 'completada' ELSE 'pendiente' END WHERE estado IS NULL
  `);
  } catch (e) {
    console.error("[DB] error:", e?.message);
  }
  try {
    const database = await getDB();
    await database?.runAsync(
      `UPDATE tareas SET estado='vencida', completed=0, fechaCompletada=fechaDia WHERE fechaDia < ? AND estado='pendiente'`,
      [hoy],
    );
  } catch (e) {
    console.error("[DB] error:", e?.message);
  }

  await generarTareasRepetitivasImpl();

  const vencidasAyer = await (async () => {
    try {
      const database = await getDB();
      return (
        (
          await database?.getFirstAsync(
            `SELECT COUNT(*) as total FROM tareas WHERE fechaDia = ? AND estado = 'vencida'`,
            [ayer],
          )
        )?.total ?? 0
      );
    } catch (e) {
      console.error("[DB] vencidasAyer error:", e?.message);
      return 0;
    }
  })();

  const tareasHoy = await (async () => {
    try {
      const database = await getDB();
      return (
        (await database?.getAllAsync(
          `SELECT * FROM tareas WHERE fechaDia = ? ORDER BY id DESC`,
          [hoy],
        )) ?? []
      );
    } catch (e) {
      console.error("[DB] tareasHoy error:", e?.message);
      return [];
    }
  })();

  return { tareasHoy, vencidasAyer };
}
export function limpiarTareasViejas() {
  return encolar(limpiarTareasViejasImpl);
}
