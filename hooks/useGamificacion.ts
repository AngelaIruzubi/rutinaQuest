import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NombreMedalla, UMBRALES_MEDALLA } from '../constants/medallas';
import { EstadoGamificacion, ResultadoCompletarTarea } from '../types/gamificacion';
import { hoyAppStr } from '../utils/fecha';
import { aplicarPenalizacion } from '../utils/gamificacion';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface EstadoPersistido {
  estrellas:               number;
  totalHecho:              number;
  racha:                   number;
  ultimaFecha:             string | null;
  tareasCompletasHoy:      number;
  fechaHoy:                string | null;
  penalizacionAplicada:    boolean;
  fechaPenalizacion?:      string;
  historialPenalizaciones: HistorialPenalizacion[];
}

interface HistorialPenalizacion {
  fecha:  string;
  puntos: number;
  motivo: string;
}

interface ResultadoPenalizacion {
  penalizacion: number;
  nuevoEstado:  EstadoPersistido;
}

// ─── SQLite (solo nativo) ─────────────────────────────────────────────────────

let SQLite: any = null;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}

// ─── Persistencia ─────────────────────────────────────────────────────────────

const DB_NAME   = 'juego.db';
const STATE_KEY = 'juego_state';
const TABLE_SQL = `CREATE TABLE IF NOT EXISTS juego (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;

const storage = {
  _db: null as any,

  async _getDB(): Promise<any> {
    if (this._db) return this._db;
    this._db = await SQLite.openDatabaseAsync(DB_NAME);
    await this._db.execAsync(TABLE_SQL);
    return this._db;
  },

  async get(key: string): Promise<EstadoPersistido | null> {
    try {
      if (Platform.OS === 'web') {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      }
      const db  = await this._getDB();
      const row = await db.getFirstAsync('SELECT value FROM juego WHERE key = ?', [key]);
      return row ? JSON.parse(row.value) : null;
    } catch (e) {
      console.warn('[Juego] storage.get error:', e);
      return null;
    }
  },

  async set(key: string, value: EstadoPersistido): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, JSON.stringify(value));
        return;
      }
      const db = await this._getDB();
      await db.runAsync(
        'INSERT OR REPLACE INTO juego (key, value) VALUES (?, ?)',
        [key, JSON.stringify(value)]
      );
    } catch (e) {
      console.warn('[Juego] storage.set error:', e);
    }
  },
};

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

const parseLocal = (str: string): number => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

const diasDif = (a: string, b: string): number =>
  Math.round((parseLocal(a) - parseLocal(b)) / 86_400_000);

// ─── Estado inicial ───────────────────────────────────────────────────────────

const ESTADO_INICIAL: EstadoPersistido = {
  estrellas:               0,
  totalHecho:              0,
  racha:                   0,
  ultimaFecha:             null,
  tareasCompletasHoy:      0,
  fechaHoy:                null,
  penalizacionAplicada:    false,
  historialPenalizaciones: [],
};

// ─── Hook principal ───────────────────────────────────────────────────────────

/**
 * Hook central de gamificación. Persiste en SQLite (nativo) o localStorage (web).
 *
 * IMPORTANTE: debe haber UNA sola instancia activa en el árbol de componentes.
 * No llamar desde componentes hijos — pasar el resultado como prop o via context.
 */
export function useGamificacion() {
  const [estado,     setEstado]     = useState<EstadoPersistido>(ESTADO_INICIAL);
  const [cargando,   setCargando]   = useState(true);
  const [esDiaNuevo, setEsDiaNuevo] = useState(false);

  // ── Cargar estado ───────────────────────────────────────────────────────────
  const cargarEstado = useCallback(async () => {
    const guardado = await storage.get(STATE_KEY);
    if (guardado) {
      const hoyStr = hoyAppStr();
      if (guardado.fechaHoy !== hoyStr) {
        // Resetear racha si se saltó algún día
        if (guardado.ultimaFecha) {
          const diff = diasDif(hoyStr, guardado.ultimaFecha);
          if (diff !== 1) guardado.racha = 0;
        }
        guardado.tareasCompletasHoy = 0;
        guardado.fechaHoy           = hoyStr;
        // Resetear penalización si es día nuevo
        const fechaPenal = guardado.fechaPenalizacion ?? null;
        if (fechaPenal !== hoyStr) {
          guardado.penalizacionAplicada = false;
        }
        await storage.set(STATE_KEY, guardado);
        setEsDiaNuevo(true);
      } else {
        setEsDiaNuevo(false);
      }
      setEstado({ ...ESTADO_INICIAL, ...guardado });
    }
    setCargando(false);
  }, []);

  useEffect(() => { cargarEstado(); }, []);

  // ── Persistir ───────────────────────────────────────────────────────────────
  const persist = useCallback(async (siguiente: EstadoPersistido) => {
    await storage.set(STATE_KEY, siguiente);
  }, []);

  // ── Completar tarea ─────────────────────────────────────────────────────────
  const completarTarea = useCallback(
    (onTime = true): Promise<ResultadoCompletarTarea> => {
      const pts    = onTime ? 5 : 3;
      const hoyStr = hoyAppStr();

      return new Promise((resolve) => {
        setEstado((prev) => {
          let nuevaRacha = prev.racha;
          if (!prev.ultimaFecha) {
            nuevaRacha = 1;
          } else {
            const diff = diasDif(hoyStr, prev.ultimaFecha);
            if      (diff === 0) nuevaRacha = prev.racha;
            else if (diff === 1) nuevaRacha = prev.racha + 1;
            else                 nuevaRacha = 1;
          }

          const nuevasEstrellas = (prev.estrellas ?? 0) + pts;
          const nuevoEstado: EstadoPersistido = {
            ...prev,
            estrellas:          nuevasEstrellas,
            totalHecho:         nuevasEstrellas,
            racha:              nuevaRacha,
            ultimaFecha:        hoyStr,
            tareasCompletasHoy: prev.fechaHoy === hoyStr ? prev.tareasCompletasHoy + 1 : 1,
            fechaHoy:           hoyStr,
          };
          persist(nuevoEstado);
          resolve({ pts, nuevoEstado: nuevoEstado as unknown as EstadoGamificacion });
          return nuevoEstado;
        });
      });
    },
    [persist]
  );

  // ── Tarea perdida ───────────────────────────────────────────────────────────
  const tareaPerdida = useCallback(async () => {
    setEstado((prev) => {
      const noTareasHoy = prev.tareasCompletasHoy === 0 || prev.fechaHoy !== hoyAppStr();
      const nuevoEstado: EstadoPersistido = {
        ...prev,
        totalHecho: noTareasHoy ? Math.max(0, prev.totalHecho - 1) : prev.totalHecho,
        racha:      noTareasHoy ? 0 : prev.racha,
      };
      persist(nuevoEstado);
      return nuevoEstado;
    });
  }, [persist]);

  // ── Penalizar fin de día ────────────────────────────────────────────────────
  const penalizarFinDia = useCallback(
    (_tareasNoHechas: number, _tareasHechasHoy = 0): Promise<ResultadoPenalizacion> => {
      return new Promise((resolve) => {
        setEstado((prev) => {
          if (prev.penalizacionAplicada) {
            resolve({ penalizacion: 0, nuevoEstado: prev });
            return prev;
          }

          const penalizacion    = 10;
          const motivo          = 'Tareas sin completar';
          const nuevasEstrellas = aplicarPenalizacion(prev.estrellas ?? 0, penalizacion);
          const hoyStr          = hoyAppStr();

          const historial = [...(prev.historialPenalizaciones ?? [])];
          if (!historial.find(h => h.fecha === hoyStr)) {
            historial.unshift({ fecha: hoyStr, puntos: -penalizacion, motivo });
            if (historial.length > 30) historial.pop();
          }

          const nuevoEstado: EstadoPersistido = {
            ...prev,
            estrellas:               nuevasEstrellas,
            totalHecho:              nuevasEstrellas,
            racha:                   prev.racha,
            penalizacionAplicada:    true,
            fechaPenalizacion:       hoyStr,
            historialPenalizaciones: historial,
          };
          persist(nuevoEstado);
          resolve({ penalizacion, nuevoEstado });
          return nuevoEstado;
        });
      });
    },
    [persist]
  );

  // ── Resetear día ────────────────────────────────────────────────────────────
  const resetearDia = useCallback(async () => {
    setEstado((prev) => {
      const next: EstadoPersistido = { ...prev, tareasCompletasHoy: 0, fechaHoy: hoyAppStr() };
      persist(next);
      return next;
    });
  }, [persist]);

  // ── Forzar estrellas (solo testing) ────────────────────────────────────────
  const forzarEstrellas = useCallback(async (estrellas: number) => {
    setEstado((prev) => {
      const next: EstadoPersistido = { ...prev, estrellas, totalHecho: estrellas };
      persist(next);
      return next;
    });
  }, [persist]);

  // ── Valor de retorno ────────────────────────────────────────────────────────
  return {
    estrellas:               estado.estrellas ?? 0,
    totalHecho:              estado.totalHecho ?? 0,
    racha:                   estado.racha,
    tareasCompletasHoy:      estado.tareasCompletasHoy,
    penalizacionAplicada:    estado.penalizacionAplicada ?? false,
    historialPenalizaciones: estado.historialPenalizaciones ?? [],
    fechaHoy:                estado.fechaHoy,
    ultimaFecha:             estado.ultimaFecha,
    fechaPenalizacion:       estado.fechaPenalizacion ?? null,
    cargando,
    esDiaNuevo,
    medallas:        getMedallas(estado.estrellas ?? 0),
    medalla:         getMedalla(estado.estrellas ?? 0),
    completarTarea,
    tareaPerdida,
    resetearDia,
    penalizarFinDia,
    recargar:        cargarEstado,
    forzarEstrellas,
  };
}

// ─── Helpers exportados ───────────────────────────────────────────────────────

/** Devuelve el nombre de la medalla más alta conseguida, o null si ninguna. */
export function getMedalla(estrellas: number): NombreMedalla | null {
  if (estrellas >= UMBRALES_MEDALLA.oro)    return 'oro';
  if (estrellas >= UMBRALES_MEDALLA.plata)  return 'plata';
  if (estrellas >= UMBRALES_MEDALLA.bronce) return 'bronce';
  return null;
}

/** Devuelve qué medallas se han conseguido. */
export function getMedallas(estrellas: number): Record<NombreMedalla, boolean> {
  return {
    bronce: estrellas >= UMBRALES_MEDALLA.bronce,
    plata:  estrellas >= UMBRALES_MEDALLA.plata,
    oro:    estrellas >= UMBRALES_MEDALLA.oro,
  };
}

