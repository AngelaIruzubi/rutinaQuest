import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";
import { hoyAppStr } from "../utils/fecha";

// Los datos se guardan como JSON con AsyncStorage (en web, localStorage
// directamente, igual que antes). Antes se usaba expo-sqlite, pero su
// módulo nativo fallaba de forma intermitente en algunos dispositivos
// (NullPointerException al construir la conexión — visto en un Galaxy A40
// incluso a los pocos segundos de abrir la app). Como los datos de esta app
// son solo una lista de tareas y un perfil de usuario, no hace falta SQL de
// verdad: AsyncStorage es una dependencia mucho más simple y madura.
const CLAVE_TAREAS = "tareas";
const CLAVE_USUARIO = "usuario";

async function leerRaw(clave) {
  if (Platform.OS === "web") return localStorage.getItem(clave);
  try {
    return await AsyncStorage.getItem(clave);
  } catch (e) {
    console.error(`[DB] Error leyendo ${clave}:`, e?.message ?? e);
    Sentry.captureException(e, {
      tags: { origen: "database.js", fase: "lectura" },
      extra: { clave },
    });
    return null;
  }
}

async function guardarRaw(clave, valor) {
  if (Platform.OS === "web") {
    localStorage.setItem(clave, valor);
    return;
  }
  try {
    await AsyncStorage.setItem(clave, valor);
  } catch (e) {
    console.error(`[DB] Error guardando ${clave}:`, e?.message ?? e);
    Sentry.captureException(e, {
      tags: { origen: "database.js", fase: "escritura" },
      extra: { clave },
    });
  }
}

// ── COLA DE ACCESO ────────────────────────────────────────────────────────
// Cada operación que modifica datos hace "leer todo, modificar, guardar
// todo". Si dos llamadas se solapan (p.ej. dos pantallas guardando casi a
// la vez), la segunda podría pisar el cambio de la primera. Esta cola
// obliga a que solo haya UNA operación en vuelo a la vez.
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

export function initDB() {
  return encolar(async () => {});
}

// ── USUARIO ────

const USUARIO_DEFAULT = {
  skinColor: "f1c3a5",
  hair: "sideComed",
  hairColor: "2c1b18",
  rearHair: "ninguno",
  eyebrows: "neutral",
  eyes: "happy",
  mouth: "smile",
  beard: "ninguna",
  clothes: "tShirt",
  clothesColor: "0b3286",
  nivel: 1,
  puntos: 0,
};

async function getUsuarioImpl() {
  const data = await leerRaw(CLAVE_USUARIO);
  return data ? JSON.parse(data) : USUARIO_DEFAULT;
}
export function getUsuario() {
  return encolar(getUsuarioImpl);
}

async function updateUsuarioImpl(fields) {
  const current = await getUsuarioImpl();
  await guardarRaw(CLAVE_USUARIO, JSON.stringify({ ...current, ...fields }));
}
export function updateUsuario(fields) {
  return encolar(() => updateUsuarioImpl(fields));
}

// ── TAREAS ────

async function getTareasImpl() {
  const data = await leerRaw(CLAVE_TAREAS);
  return data ? JSON.parse(data) : [];
}
export function getTareas() {
  return encolar(getTareasImpl);
}
async function guardarTareas(tareas) {
  await guardarRaw(CLAVE_TAREAS, JSON.stringify(tareas));
}

async function getTareasHistorialImpl() {
  // Las canceladas (eliminadas a mano) no se muestran en el historial: si el
  // usuario borró la tarea es porque se equivocó al apuntarla, no porque no
  // la haya hecho — a diferencia de las vencidas, que sí reflejan una tarea
  // real que no se completó a tiempo.
  return (await getTareasImpl())
    .filter(
      (t) =>
        t.estado === "completada" ||
        t.estado === "vencida" ||
        t.completed === 1,
    )
    .sort((a, b) => {
      const fa = a.fechaCompletada || a.fechaDia || "";
      const fb = b.fechaCompletada || b.fechaDia || "";
      return fb.localeCompare(fa);
    });
}
export function getTareasHistorial() {
  return encolar(getTareasHistorialImpl);
}

async function insertTareaImpl(tarea, fechaDiaParam) {
  const fechaDia = fechaDiaParam ?? hoyAppStr();
  const nueva = {
    id: tarea.id,
    title: tarea.title,
    pictogramId: tarea.pictogramId ?? null,
    hora: tarea.hora ?? "Sin hora",
    completed: 0,
    stars: 0,
    fechaCompletada: null,
    fechaDia,
    estado: "pendiente",
    repeticion: tarea.repeticion ?? "ninguna",
    diasSemana: tarea.diasSemana ?? null,
    tareaBaseId: tarea.tareaBaseId ?? null,
    notifId: null,
    duracionSeg: tarea.duracionSeg ?? null,
    tiempoCumplido: false,
  };
  const tareas = await getTareasImpl();
  await guardarTareas([...tareas, nueva]);
}
export function insertTarea(tarea, fechaDiaParam) {
  return encolar(() => insertTareaImpl(tarea, fechaDiaParam));
}

// Una tarea "semanal" repite en los días de la semana guardados en
// diasSemana (0 = domingo … 6 = sábado, igual que Date#getDay). Las tareas
// creadas antes de poder elegir varios días no tienen diasSemana guardado,
// así que por compatibilidad se quedan repitiendo el mismo día en que se
// crearon.
function coincideDiaSemanal(base, diaSemana) {
  if (Array.isArray(base.diasSemana) && base.diasSemana.length > 0) {
    return base.diasSemana.includes(diaSemana);
  }
  const [by, bm, bd] = (base.fechaDia ?? "").split("-").map(Number);
  if (!by) return false;
  return diaSemana === new Date(by, bm - 1, bd).getDay();
}

function generarInstanciasRepetitivas(todas, hoy) {
  const [y, m, d] = hoy.split("-").map(Number);
  const diaSemana = new Date(y, m - 1, d).getDay();
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
    if (base.fechaDia && base.fechaDia > hoy) continue;
    if (base.repeticion === "semanal" && !coincideDiaSemanal(base, diaSemana))
      continue;
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
      duracionSeg: base.duracionSeg ?? null,
      tiempoCumplido: false,
    });
  }
  return nuevas;
}

async function generarTareasRepetitivasImpl() {
  const hoy = hoyAppStr();
  const todas = await getTareasImpl();
  const nuevas = generarInstanciasRepetitivas(todas, hoy);
  if (nuevas.length > 0) await guardarTareas([...todas, ...nuevas]);
  return nuevas.length;
}
export function generarTareasRepetitivas() {
  return encolar(generarTareasRepetitivasImpl);
}

async function getTareasPorFechaImpl(fecha) {
  const todas = await getTareasImpl();
  const reales = todas.filter(
    (t) =>
      t.fechaDia === fecha &&
      t.estado !== "cancelada" &&
      t.estado !== "vencida",
  );
  const hoy = hoyAppStr();
  if (fecha <= hoy) return reales;
  // Fecha futura: además de lo real, se añade la vista previa de tareas
  // repetitivas que aún no se han generado (ver nota en
  // proyectarOcurrenciasFuturas). Se marcan con virtual:true para que la
  // pantalla sepa que todavía no existen de verdad.
  return [...reales, ...calcularVirtualesParaFecha(todas, fecha, hoy)];
}
export function getTareasPorFecha(fecha) {
  return encolar(() => getTareasPorFechaImpl(fecha));
}

// Las instancias de una tarea repetitiva se crean de una en una, el día que
// realmente llega (ver generarInstanciasRepetitivas). Para que el calendario
// pueda pintar el puntito en los próximos días aunque esa instancia todavía
// no exista de verdad, se calculan aquí "en el aire" (sin guardar nada), con
// un horizonte máximo para no proyectar una tarea diaria hasta el infinito.
const HORIZONTE_PROYECCION_DIAS = 365;

function sumarDias(fecha, dias) {
  const f = new Date(fecha + "T12:00:00");
  f.setDate(f.getDate() + dias);
  const y = f.getFullYear();
  const m = String(f.getMonth() + 1).padStart(2, "0");
  const d = String(f.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Vista previa (sin guardar nada) de las tareas repetitivas que le tocarían
// a una fecha futura concreta, para cuando el usuario toca ese día en el
// calendario antes de que la instancia real se haya generado.
function calcularVirtualesParaFecha(todas, fecha, hoy) {
  const bases = todas.filter(
    (t) =>
      t.repeticion &&
      t.repeticion !== "ninguna" &&
      !t.tareaBaseId &&
      t.estado !== "cancelada",
  );
  const virtuales = [];
  for (const base of bases) {
    const inicio = base.fechaDia && base.fechaDia > hoy ? base.fechaDia : hoy;
    if (fecha < inicio || fecha === base.fechaDia) continue;
    const yaExiste = todas.some(
      (t) => t.tareaBaseId === base.id && t.fechaDia === fecha,
    );
    if (yaExiste) continue;

    let coincide = base.repeticion === "diaria";
    if (base.repeticion === "semanal") {
      const [fy, fm, fd] = fecha.split("-").map(Number);
      coincide = coincideDiaSemanal(base, new Date(fy, fm - 1, fd).getDay());
    }
    if (!coincide) continue;

    virtuales.push({
      id: `virtual_${base.id}_${fecha}`,
      title: base.title,
      pictogramId: base.pictogramId ?? null,
      hora: base.hora ?? "Sin hora",
      completed: 0,
      stars: 0,
      fechaCompletada: null,
      fechaDia: fecha,
      estado: "pendiente",
      repeticion: "ninguna",
      tareaBaseId: base.id,
      duracionSeg: base.duracionSeg ?? null,
      tiempoCumplido: false,
      virtual: true,
    });
  }
  return virtuales;
}

function proyectarOcurrenciasFuturas(todas, hoy) {
  const bases = todas.filter(
    (t) =>
      t.repeticion &&
      t.repeticion !== "ninguna" &&
      !t.tareaBaseId &&
      t.estado !== "cancelada",
  );
  const yaExisten = new Set(
    todas
      .filter((t) => t.tareaBaseId)
      .map((t) => `${t.tareaBaseId}|${t.fechaDia}`),
  );

  const proyectadas = [];
  for (const base of bases) {
    const inicio = base.fechaDia && base.fechaDia > hoy ? base.fechaDia : hoy;

    for (let i = 0; i <= HORIZONTE_PROYECCION_DIAS; i++) {
      const fecha = sumarDias(inicio, i);
      if (fecha === base.fechaDia) continue; // ya cuenta como la propia base
      if (yaExisten.has(`${base.id}|${fecha}`)) continue; // ya generada de verdad

      if (base.repeticion === "diaria") {
        proyectadas.push(fecha);
      } else if (base.repeticion === "semanal") {
        const [fy, fm, fd] = fecha.split("-").map(Number);
        if (coincideDiaSemanal(base, new Date(fy, fm - 1, fd).getDay())) {
          proyectadas.push(fecha);
        }
      }
    }
  }
  return proyectadas;
}

async function getFechasConTareasImpl() {
  const hoy = hoyAppStr();
  const todas = await getTareasImpl();
  const tareas = todas.filter(
    (t) =>
      (t.estado === "pendiente" || (!t.estado && t.completed !== 1)) &&
      t.fechaDia,
  );
  const fechas = {};
  for (const t of tareas) {
    if (!fechas[t.fechaDia]) fechas[t.fechaDia] = 0;
    fechas[t.fechaDia]++;
  }
  // Fechas que solo tienen ocurrencias proyectadas (todavía sin generar de
  // verdad) — el calendario las pinta con un punto hueco en vez de sólido.
  const soloProyectadas = [];
  for (const fecha of proyectarOcurrenciasFuturas(todas, hoy)) {
    if (!fechas[fecha]) {
      fechas[fecha] = 0;
      soloProyectadas.push(fecha);
    }
    fechas[fecha]++;
  }
  return { fechas, soloProyectadas };
}
export function getFechasConTareas() {
  return encolar(getFechasConTareasImpl);
}

async function updateTareaCompletadaImpl(id, completed, stars = 5) {
  const fecha = completed ? hoyAppStr() : null;
  const estado = completed ? "completada" : "pendiente";
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
  await guardarTareas(tareas);
}
export function updateTareaCompletada(id, completed, stars = 5) {
  return encolar(() => updateTareaCompletadaImpl(id, completed, stars));
}

async function updateTareaTiempoCumplidoImpl(id, cumplido) {
  const tareas = (await getTareasImpl()).map((t) =>
    t.id === id ? { ...t, tiempoCumplido: cumplido } : t,
  );
  await guardarTareas(tareas);
}
export function updateTareaTiempoCumplido(id, cumplido) {
  return encolar(() => updateTareaTiempoCumplidoImpl(id, cumplido));
}

async function updateTareaDuracionImpl(id, duracionSeg) {
  // Cambiar la duración invalida cualquier temporizador ya cumplido con la
  // duración anterior, así que se reinicia tiempoCumplido.
  const tareas = (await getTareasImpl()).map((t) =>
    t.id === id
      ? { ...t, duracionSeg: duracionSeg ?? null, tiempoCumplido: false }
      : t,
  );
  await guardarTareas(tareas);
}
export function updateTareaDuracion(id, duracionSeg) {
  return encolar(() => updateTareaDuracionImpl(id, duracionSeg));
}

async function cancelarTareaImpl(id) {
  const hoy = hoyAppStr();
  const tareas = (await getTareasImpl()).map((t) =>
    t.id === id
      ? { ...t, estado: "cancelada", completed: 0, fechaCompletada: hoy }
      : t,
  );
  await guardarTareas(tareas);
}
export function cancelarTarea(id) {
  return encolar(() => cancelarTareaImpl(id));
}

async function updateTareaHoraImpl(id, nuevaHora) {
  const tareas = (await getTareasImpl()).map((t) =>
    t.id === id ? { ...t, hora: nuevaHora } : t,
  );
  await guardarTareas(tareas);
}
export function updateTareaHora(id, nuevaHora) {
  return encolar(() => updateTareaHoraImpl(id, nuevaHora));
}

async function updateTareaNotifIdImpl(id, notifId) {
  const tareas = (await getTareasImpl()).map((t) =>
    t.id === id ? { ...t, notifId: notifId ?? null } : t,
  );
  await guardarTareas(tareas);
}
export function updateTareaNotifId(id, notifId) {
  return encolar(() => updateTareaNotifIdImpl(id, notifId));
}

async function updateTareaTituloPictoImpl(id, titulo, pictogramId) {
  const tareas = (await getTareasImpl()).map((t) =>
    t.id === id
      ? { ...t, title: titulo, pictogramId: pictogramId ?? null }
      : t,
  );
  await guardarTareas(tareas);
}
export function updateTareaTituloPicto(id, titulo, pictogramId) {
  return encolar(() => updateTareaTituloPictoImpl(id, titulo, pictogramId));
}

async function updateTareaBaseCompletaImpl(
  baseId,
  titulo,
  pictogramId,
  hora,
  duracionSeg,
) {
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
        duracionSeg: duracionSeg ?? null,
        tiempoCumplido: false,
      };
    }
    return t;
  });
  await guardarTareas(tareas);
}
export function updateTareaBaseCompleta(
  baseId,
  titulo,
  pictogramId,
  hora,
  duracionSeg,
) {
  return encolar(() =>
    updateTareaBaseCompletaImpl(baseId, titulo, pictogramId, hora, duracionSeg),
  );
}

async function deleteTareaImpl(id) {
  const tareas = (await getTareasImpl()).filter((t) => t.id !== id);
  await guardarTareas(tareas);
}
export function deleteTarea(id) {
  return encolar(() => deleteTareaImpl(id));
}

async function eliminarTareaYRepetitivasImpl(baseId) {
  const hoy = hoyAppStr();
  const tareas = await getTareasImpl();
  const actualizadas = tareas
    .map((t) => {
      if (t.id !== baseId && t.tareaBaseId !== baseId) return t;
      if (t.estado === "completada" || t.completed === 1) {
        return { ...t, repeticion: "ninguna" };
      }
      if (t.estado === "pendiente" && t.fechaDia <= hoy) {
        return {
          ...t,
          estado: "cancelada",
          completed: 0,
          fechaCompletada: t.fechaDia,
          repeticion: "ninguna",
        };
      }
      return t;
    })
    .filter((t) => {
      const esInstanciaFutura =
        (t.id === baseId || t.tareaBaseId === baseId) &&
        t.estado === "pendiente" &&
        t.fechaDia > hoy;
      return !esInstanciaFutura;
    });
  await guardarTareas(actualizadas);
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

  const todas = await getTareasImpl();
  const actualizadas = todas.map((t) => {
    const fechaDia = t.fechaDia ?? hoy;
    const estado = t.estado ?? (t.completed === 1 ? "completada" : "pendiente");
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
  const nuevas = generarInstanciasRepetitivas(actualizadas, hoy);
  const final = [...actualizadas, ...nuevas];
  await guardarTareas(final);

  const tareasHoy = final.filter((t) => t.fechaDia === hoy);
  const vencidasAyer = actualizadas.filter(
    (t) => t.fechaDia === ayer && t.estado === "vencida",
  ).length;
  return { tareasHoy, vencidasAyer };
}
export function limpiarTareasViejas() {
  return encolar(limpiarTareasViejasImpl);
}
