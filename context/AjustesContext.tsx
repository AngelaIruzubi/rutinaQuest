// context/AjustesContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { PixelRatio, Platform, useColorScheme } from 'react-native';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type Tema = 'claro' | 'oscuro' | 'auto';
export type TamanoTexto = 'pequeño' | 'normal' | 'grande' | 'muy_grande';

export interface Ajustes {
  tema:               Tema;
  tamanoTexto:        TamanoTexto;
  altoContraste:      boolean;
  vibracion:          boolean;
  notificaciones:     boolean;
  notifCincoMin:      boolean;
  notifMitadDia:      boolean;
  notifFinDia:        boolean;
  compartirHistorial: boolean;
}

export interface AjustesCtx {
  ajustes:    Ajustes;
  temaActivo: 'claro' | 'oscuro';
  escala:     number;
  colores:    typeof COLORES_CLARO;
  actualizar: (cambios: Partial<Ajustes>) => void;
  reset:      () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const AJUSTES_DEFAULT: Ajustes = {
  tema:               'claro',
  tamanoTexto:        'normal',
  altoContraste:      false,
  vibracion:          true,
  notificaciones:     true,
  notifCincoMin:      true,
  notifMitadDia:      true,
  notifFinDia:        true,
  compartirHistorial: false,
};

export const ESCALA: Record<TamanoTexto, number> = {
  pequeño:    0.85,
  normal:     1.0,
  grande:     1.18,
  muy_grande: 1.4,
};

// ─── Paletas ──────────────────────────────────────────────────────────────────
export const COLORES_CLARO = {
  fondo:       '#ffffff',
  fondoCard:   '#F4F0F6',
  borde:       '#E5D9EE',
  texto:       '#333333',
  textoSub:    '#888888',
  textoMuted:  '#BBBBBB',
  purple:      '#A77BBE',
  purpleDark:  '#7B5A9A',
  purpleLight: '#E5D9EE',
  orange:      '#FF6B35',
  green:       '#58CC02',
  gold:        '#FFD700',
  red:         '#FF4444',
  header:      '#A77BBE',
  headerText:  '#ffffff',
};

export const COLORES_OSCURO: typeof COLORES_CLARO = {
  fondo:       '#0F0F13',
  fondoCard:   '#1C1C24',
  borde:       '#2A2A38',
  texto:       '#F0F0F0',
  textoSub:    '#AAAAAA',
  textoMuted:  '#555555',
  purple:      '#C49FD8',
  purpleDark:  '#A77BBE',
  purpleLight: '#2A1F35',
  orange:      '#FF8C55',
  green:       '#6EDD10',
  gold:        '#FFD700',
  red:         '#FF6666',
  header:      '#1C1C24',
  headerText:  '#C49FD8',
};

export const COLORES_ALTO_CONTRASTE: typeof COLORES_CLARO = {
  ...COLORES_CLARO,
  fondo:      '#ffffff',
  fondoCard:  '#f0f0f0',
  texto:      '#000000',
  textoSub:   '#222222',
  purple:     '#5B009A',
  borde:      '#000000',
  header:     '#000000',
  headerText: '#ffffff',
};

// ─── Persistencia SÍNCRONA (solo localStorage / SQLite sync) ──────────────────
// No usamos AsyncStorage para evitar dependencias extra
const KEY = 'rutinaquest_ajustes';

function leerSync(): Ajustes {
  try {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...AJUSTES_DEFAULT, ...JSON.parse(raw) } : { ...AJUSTES_DEFAULT };
    }
    // En nativo usamos la misma BD SQLite del proyecto via una tabla simple
    // Fallback: devolver defaults si no hay nada aún
    return { ...AJUSTES_DEFAULT };
  } catch {
    return { ...AJUSTES_DEFAULT };
  }
}

function guardarSync(a: Ajustes) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(KEY, JSON.stringify(a));
    }
    // En nativo se persiste a través del useEffect que llama a guardarNativo
  } catch {}
}

async function guardarNativo(a: Ajustes) {
  if (Platform.OS === 'web') return;
  try {
    // Usamos expo-sqlite igual que el resto del proyecto
    const SQLite = require('expo-sqlite');
    const db = SQLite.openDatabaseSync('taskmanager.db');
    db.runSync(
      `CREATE TABLE IF NOT EXISTS ajustes (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
    );
    db.runSync(
      `INSERT OR REPLACE INTO ajustes (key, value) VALUES (?, ?)`,
      [KEY, JSON.stringify(a)]
    );
  } catch {}
}

async function leerNativo(): Promise<Ajustes> {
  if (Platform.OS === 'web') return leerSync();
  try {
    const SQLite = require('expo-sqlite');
    const db = SQLite.openDatabaseSync('taskmanager.db');
    db.runSync(
      `CREATE TABLE IF NOT EXISTS ajustes (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
    );
    const row = db.getFirstSync(
      `SELECT value FROM ajustes WHERE key = ?`, [KEY]
    );
    return row ? { ...AJUSTES_DEFAULT, ...JSON.parse((row as any).value) } : { ...AJUSTES_DEFAULT };
  } catch {
    return { ...AJUSTES_DEFAULT };
  }
}

// ─── Contexto ─────────────────────────────────────────────────────────────────
const Ctx = createContext<AjustesCtx>({
  ajustes:    AJUSTES_DEFAULT,
  temaActivo: 'claro',
  escala:     1,
  colores:    COLORES_CLARO,
  actualizar: () => {},
  reset:      () => {},
});

export function AjustesProvider({ children }: { children: React.ReactNode }) {
  const sistemaOscuro              = useColorScheme() === 'dark';
  const [ajustes, setAjustes]      = useState<Ajustes>(leerSync());

  // Cargar desde nativo al montar (SQLite es sync en expo-sqlite v2)
  useEffect(() => {
    leerNativo().then(a => setAjustes(a));
  }, []);

  const actualizar = (cambios: Partial<Ajustes>) => {
    const nuevos = { ...ajustes, ...cambios };
    setAjustes(nuevos);
    guardarSync(nuevos);
    guardarNativo(nuevos);
  };

  const reset = () => {
    const def = { ...AJUSTES_DEFAULT };
    setAjustes(def);
    guardarSync(def);
    guardarNativo(def);
  };

  const temaActivo: 'claro' | 'oscuro' =
    ajustes.tema === 'auto'
      ? (sistemaOscuro ? 'oscuro' : 'claro')
      : ajustes.tema;

  const colores =
    ajustes.altoContraste ? COLORES_ALTO_CONTRASTE
    : temaActivo === 'oscuro' ? COLORES_OSCURO
    : COLORES_CLARO;

  const escala = Math.min(PixelRatio.getFontScale(), 1.15);

  return (
    <Ctx.Provider value={{ ajustes, temaActivo, escala, colores, actualizar, reset }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAjustesCtx() {
  return useContext(Ctx);
}