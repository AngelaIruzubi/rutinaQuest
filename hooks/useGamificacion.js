import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { hoyAppStr } from '../utils/fecha';
 
let SQLite = null;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}
 
const DB_NAME   = 'juego.db';
const STATE_KEY = 'juego_state';
const TABLE_SQL = `CREATE TABLE IF NOT EXISTS juego (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
 
const storage = {
  _db: null,
  async _getDB() {
    if (this._db) return this._db;
    this._db = await SQLite.openDatabaseAsync(DB_NAME);
    await this._db.execAsync(TABLE_SQL);
    return this._db;
  },
  async get(key) {
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
  async set(key, value) {
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
 

const hoy = () => hoyAppStr();
 

const parseLocal = (str) => { const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
const diasDif = (a, b) => Math.round((parseLocal(a) - parseLocal(b)) / 86_400_000);
 
const ESTADO_INICIAL = {
  estrellas:               0,
  totalHecho:              0,
  racha:                   0,
  ultimaFecha:             null,
  tareasCompletasHoy:      0,
  fechaHoy:                null,
  penalizacionAplicada:    false,
  historialPenalizaciones: [], 
};
 
export function useGamificacion() {
  const [estado,   setEstado]   = useState(ESTADO_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [esDiaNuevo, setEsDiaNuevo] = useState(false);

  const cargarEstado = useCallback(async () => {
  const guardado = await storage.get(STATE_KEY);
  if (guardado) {
    const hoyStr = hoy();
    //reset racha
    if (guardado.fechaHoy !== hoyStr) {
      if (guardado.ultimaFecha) {
        const diff = diasDif(hoyStr, guardado.ultimaFecha);
        if (diff !== 1) guardado.racha = 0;
      }
      //resetea tareas completadas
      guardado.tareasCompletasHoy = 0;
      guardado.fechaHoy           = hoyStr;
      //comprueba prnalizaciones
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


  useEffect(() => {
    cargarEstado();
  }, []);
 
  const persist = useCallback(async (siguiente) => {
    await storage.set(STATE_KEY, siguiente);
  }, []);
 
 //Al completar una tarea combia el estado
  const completarTarea = useCallback(async (onTime = true) => {
    const pts    = onTime ? 5 : 3;
    const hoyStr = hoy();
 
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
        const nuevoEstado = {
          ...prev,
          estrellas:          nuevasEstrellas,
          totalHecho:         nuevasEstrellas, 
          racha:              nuevaRacha,
          ultimaFecha:        hoyStr,
          tareasCompletasHoy: prev.fechaHoy === hoyStr ? prev.tareasCompletasHoy + 1 : 1,
          fechaHoy:           hoyStr,
        };
        persist(nuevoEstado);
        resolve({ pts, nuevoEstado });
        return nuevoEstado;
      });
    });
  }, [persist]);
 
  const tareaPerdida = useCallback(async () => {
    setEstado((prev) => {
      const noTareasHoy = prev.tareasCompletasHoy === 0 || prev.fechaHoy !== hoy();
      const nuevoEstado = {
        ...prev,
        totalHecho: noTareasHoy ? Math.max(0, prev.totalHecho - 1) : prev.totalHecho,
        racha:      noTareasHoy ? 0 : prev.racha,
      };
      persist(nuevoEstado);
      return nuevoEstado;
    });
  }, [persist]);
 
 // cambia el estado si hay una penalización
  const penalizarFinDia = useCallback(async (tareasNoHechas, tareasHechasHoy = 0) => {
  return new Promise((resolve) => {
    setEstado((prev) => {
      if (prev.penalizacionAplicada) {
        resolve({ penalizacion: 0, nuevoEstado: prev });
        return prev;
      }

      const penalizacion    = 10;
      const motivo          = 'Tareas sin completar';
      const nuevasEstrellas = Math.max(0, (prev.estrellas ?? 0) - penalizacion);

      const historial = [...(prev.historialPenalizaciones ?? [])];
      const hoyStr2 = hoy();
      if (!historial.find(h => h.fecha === hoyStr2)) {
        historial.unshift({ fecha: hoyStr2, puntos: -penalizacion, motivo });
        if (historial.length > 30) historial.pop();
      }

      const nuevoEstado = {
        ...prev,
        estrellas:               nuevasEstrellas,
        totalHecho:              nuevasEstrellas,
        racha:                   prev.racha,
        penalizacionAplicada:    true,
        fechaPenalizacion:       hoyStr2, // día en que se aplicó
        historialPenalizaciones: historial,
      };
      persist(nuevoEstado);
      resolve({ penalizacion, nuevoEstado });
      return nuevoEstado;
    });
  });
}, [persist]);
 
  const resetearDia = useCallback(async () => {
    setEstado((prev) => {
      const next = { ...prev, tareasCompletasHoy: 0, fechaHoy: hoy() };
      persist(next);
      return next;
    });
  }, [persist]);
 
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
    medallas:                getMedallas(estado.estrellas ?? 0),
    medalla:                 getMedalla(estado.estrellas ?? 0),
    completarTarea,
    tareaPerdida,
    resetearDia,
    penalizarFinDia,
    recargar: cargarEstado,
    forzarEstrellas: useCallback(async (estrellas) => {
      setEstado(prev => {
        const next = { ...prev, estrellas, totalHecho: estrellas };
        persist(next);
        return next;
      });
    }, [persist]),
      };
  
}

 

export function getMedalla(estrellas) {
  if (estrellas >= 600) return 'oro';
  if (estrellas >= 300) return 'plata';
  if (estrellas >= 100) return 'bronce';
  return null;
}

export function getMedallas(estrellas) {
  return {
    bronce: estrellas >= 100,
    plata:  estrellas >= 300,
    oro:    estrellas >= 600,
  };
}


export function calcularProgresos(estrellas) {
  const progresBronce = Math.min(estrellas, 100);
  const progresPlata  = estrellas >= 100 ? Math.min(estrellas - 100, 200) : 0;
  const progresOro    = estrellas >= 300 ? Math.min(estrellas - 300, 300) : 0;
  return { progresBronce, progresPlata, progresOro };
}