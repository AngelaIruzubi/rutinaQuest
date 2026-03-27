import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';


let SQLite = null;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}

const DB_NAME  = 'juego.db';
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

//FECHAS

const hoy = () => new Date().toISOString().slice(0,10);
const diasDif = (a, b) => Math.round((new Date(a) - new Date(b)) / 86_400_000);

const ESTADO_INICIAL = {
  estrellas: 0,
  totalHecho: 0,
  racha: 0,
  ultimaFecha: null,
  tareasCompletasHoy: 0,
  fechaHoy: null,
};


export function useGamificacion() {
    const [estado, setEstado] = useState(ESTADO_INICIAL);
    const [cargando, setCargando] = useState(true);


    //Carga inicial
    useEffect(() => {
        (async () => {
            const guardado = await storage.get(STATE_KEY);
            if (guardado) {
                if(guardado.fechaHoy === hoy()) {
                   guardado.tareasCompletasHoy = 0; // Reinicia tareas del día
                   guardado.fechaHoy = hoy(); // Actualiza fechaHoy
                }
                setEstado({ ...ESTADO_INICIAL, ...guardado });
            }
            setCargando(true);
        })();
    }, []);


//Guardar en storage

const persist = useCallback(async (siguiente) => {
    await storage.set(STATE_KEY, siguiente);
}, []);


const completarTarea = useCallback( async (onTime = true) => {
    const pts = onTime ? 5 : 3; // Puntos por completar a tiempo o tarde
    const hoyStr = hoy();

    setEstado((prev) => {
        let nuevaRacha = prev.racha;
        if (!prev.ultimaFecha) {
        nuevaRacha = 1;
        } else {
            const diff = diasDif(hoyStr, prev.ultimaFecha);
            if (diff === 0)      nuevaRacha = prev.racha;
            else if (diff === 1) nuevaRacha = prev.racha + 1;
            else                 nuevaRacha = 1;
        }
        const nuevoEstado = {
            ...prev,
            estrellas: prev.estrellas + pts,
            totalHecho: prev.totalHecho + 1,
            racha: nuevaRacha,
            ultimaFecha: hoyStr,
            tareasCompletasHoy: (prev.fechaHoy === hoyStr ? prev.tareasCompletasHoy + 1 : 1),
            fechaHoy: hoyStr,
        };
        persist(nuevoEstado); 
        return nuevoEstado;
    });    
    
    const nuevoTotal = estado.totalHecho + 1;
    const medalla = getMedalla(nuevoTotal);
    return {pts, medalla};
}, [estado.totalHecho, persist]);


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

const penalizarFinDia = useCallback(async (tareasNoHechas) => {
  setEstado((prev) => {
    const penalizacion = tareasNoHechas * 5;
    const nuevoEstado = {
      ...prev,
      estrellas: Math.max(0, prev.estrellas - penalizacion),
      racha: 0,   // también rompe la racha
    };
    persist(nuevoEstado);
    return nuevoEstado;
  });
}, [persist]);


const resetearDia = useCallback(async () => {
    setEstado((prev) => {
        const next = { ...prev, tareasCompletasHoy: 0, fechaHoy: hoy() };
      persist(next);
      return next;
    });
}, [persist]);

return{
    estrellas: estado.estrellas,
    totalHecho: estado.totalHecho,
    racha: estado.racha,
    tareasCompletasHoy: estado.tareasCompletasHoy,
    cargando,
    medallas: getMedallas(estado.totalHecho),
    medalla: getMedalla(estado.totalHecho),
    completarTarea,
    tareaPerdida,
    resetearDia,
    penalizarFinDia,
};


}

export function getMedalla(totalHecho){
    if (totalHecho >= 400) return 'oro';
    if (totalHecho >= 200) return 'plata';
    if (totalHecho >= 50)  return 'bronce';
    return null;
}

export function getMedallas(totalDone) {
    return {
        bronce: totalDone >= 50,
        plata: totalDone >= 200,
        oro: totalDone >= 400,
    };
}

