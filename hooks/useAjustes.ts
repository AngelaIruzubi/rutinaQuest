// hooks/useAjustes.ts
// Persiste todas las preferencias del usuario en localStorage / AsyncStorage

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface Ajustes {
  // Apariencia
  tema: 'claro' | 'oscuro' | 'auto';
  tamanoTexto: 'pequeño' | 'normal' | 'grande' | 'muy_grande';
  altoContraste: boolean;

  // Interacción
  vibracion: boolean;
  notificaciones: boolean;
  notifCincoMin: boolean;
  notifMitadDia: boolean;
  notifFinDia: boolean;

  // Privacidad
  compartirHistorial: boolean;
}

const AJUSTES_DEFAULT: Ajustes = {
  tema:            'claro',
  tamanoTexto:     'normal',
  altoContraste:   false,
  vibracion:       true,
  notificaciones:  true,
  notifCincoMin:   true,
  notifMitadDia:   true,
  notifFinDia:     true,
  compartirHistorial: false,
};

const KEY = 'rutinaquest_ajustes';

async function leerAjustes(): Promise<Ajustes> {
  try {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...AJUSTES_DEFAULT, ...JSON.parse(raw) } : AJUSTES_DEFAULT;
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...AJUSTES_DEFAULT, ...JSON.parse(raw) } : AJUSTES_DEFAULT;
  } catch {
    return AJUSTES_DEFAULT;
  }
}

async function guardarAjustes(ajustes: Ajustes) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(KEY, JSON.stringify(ajustes));
      return;
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(KEY, JSON.stringify(ajustes));
  } catch {}
}

// Escala de texto según preferencia
export const ESCALA_TEXTO: Record<Ajustes['tamanoTexto'], number> = {
  pequeño:    0.85,
  normal:     1.0,
  grande:     1.18,
  muy_grande: 1.4,
};

export function useAjustes() {
  const [ajustes,   setAjustes]   = useState<Ajustes>(AJUSTES_DEFAULT);
  const [cargando,  setCargando]  = useState(true);

  useEffect(() => {
    leerAjustes().then(a => { setAjustes(a); setCargando(false); });
  }, []);

  const actualizar = async (cambios: Partial<Ajustes>) => {
    const nuevos = { ...ajustes, ...cambios };
    setAjustes(nuevos);
    await guardarAjustes(nuevos);
  };

  const reset = async () => {
    setAjustes(AJUSTES_DEFAULT);
    await guardarAjustes(AJUSTES_DEFAULT);
  };

  return { ajustes, cargando, actualizar, reset };
}
