import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Respeta la preferencia del sistema de reducir animaciones.
 * Suscribe a cambios en tiempo real (el usuario puede cambiarlo sin reiniciar).
 */
export function useReduceMotion(): boolean {
  const [reducida, setReducida] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducida);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducida);
    return () => sub.remove();
  }, []);
  return reducida;
}
