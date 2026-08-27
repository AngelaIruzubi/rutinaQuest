import { useCallback, useEffect, useRef, useState } from "react";
import { buscarPictogramas } from "../services/arasaac";

const DEBOUNCE_MS = 400;

/**
 * Busca pictogramas esperando a que la persona deje de escribir antes de
 * lanzar la petición de red, en vez de una por cada tecla — en un móvil con
 * poca memoria, escribir rápido podía acumular varias búsquedas y descargas
 * de imagen solapadas y hacer que el sistema matara la app.
 *
 * También descarta resultados de una búsqueda que ya no es la última
 * lanzada, para que una respuesta lenta no sobrescriba una más reciente.
 */
export function useBuscarPictogramasDebounced(cantidad = 6) {
  const [pictogramas, setPictogramas] = useState<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idConsultaRef = useRef(0);

  const buscar = useCallback(
    (texto: string, onResultado?: (ids: number[]) => void) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (texto.trim().length < 2) {
        idConsultaRef.current++;
        setPictogramas([]);
        onResultado?.([]);
        return;
      }

      const idConsulta = ++idConsultaRef.current;
      timeoutRef.current = setTimeout(async () => {
        const ids = await buscarPictogramas(texto, cantidad);
        if (idConsulta !== idConsultaRef.current) return;
        setPictogramas(ids);
        onResultado?.(ids);
      }, DEBOUNCE_MS);
    },
    [cantidad],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { pictogramas, setPictogramas, buscar };
}
