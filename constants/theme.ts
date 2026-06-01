import { Platform } from 'react-native';

// ─── Colores de la app ────────────────────────────────────────────────────────

export const Colors = {
  // Paleta de la UI principal (drawer, header, etc.)
  light: {
    background: '#F5F3FA',
    primary:    '#B39DDB',
    secondary:  '#9575CD',
    card:       '#FFFFFF',
    success:    '#4CAF50',
    text:       '#FFFFFF',
  },
  dark: {
    background: '#121212',
    primary:    '#9575CD',
    card:       '#1E1E1E',
    text:       '#FFFFFF',
  },

  // Morados — usados en index, historial, progreso, calendario, normas, perfil
  purple:    '#A77BBE',
  purpleLt:  '#E5D9EE',   // bordes seleccionados, fondos suaves
  purpleBg:  '#F4F0F6',   // fondos de sección
  purpleDk:  '#7B5A9A',   // textos sobre fondo claro

  // Semáforo de tareas
  green:     '#58CC02',   // tarea completada a tiempo
  orange:    '#FF6B35',   // tarea completada tarde
  orangeLt:  '#FFF2EC',   // fondo suave para estado tarde
  red:       '#FF4444',   // penalización, error

  // Especiales
  gold:      '#FFD700',   // estrellas y medalla de oro
  white:     '#FFFFFF',
} as const;

export type ColorKey = keyof Omit<typeof Colors, 'light' | 'dark'>;

// ─── Tipografía ───────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});