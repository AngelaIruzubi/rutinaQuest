/** 'YYYY-MM-DD' sin depender de UTC */
export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** Devuelve el lunes de la semana que contiene la fecha dada */
export function lunesDe(fecha: Date): Date {
  const d = new Date(fecha);
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Los 7 días de la semana que empieza en `lunes`, como strings 'YYYY-MM-DD' */
export function diasDeSemana(lunes: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(d.getDate() + i);
    return toLocalDateStr(d);
  });
}

/** "3 jun – 9 jun" */
export function etiquetaSemana(lunes: Date): string {
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${lunes.toLocaleDateString('es-ES', opts)} – ${domingo.toLocaleDateString('es-ES', opts)}`;
}

/** 'YYYY-MM-DD' → '10 de abril de 2026' */
export function fechaLegible(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

/** Primera letra en mayúscula */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
