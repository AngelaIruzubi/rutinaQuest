import { capitalize, diasDeSemana, fechaLegible, lunesDe, toLocalDateStr } from '../../utils/fechaFormato';

describe('toLocalDateStr', () => {
  it('formatea correctamente', () => {
    expect(toLocalDateStr(new Date(2025, 5, 1))).toBe('2025-06-01');
  });

  it('añade ceros a mes y día menores de 10', () => {
    expect(toLocalDateStr(new Date(2025, 0, 5))).toBe('2025-01-05');
  });
});

describe('lunesDe', () => {
  it('devuelve el lunes de una semana con miércoles', () => {
    const miercoles = new Date(2025, 5, 4); // miércoles 4 jun 2025
    expect(toLocalDateStr(lunesDe(miercoles))).toBe('2025-06-02');
  });

  it('devuelve el lunes si el día ya es lunes', () => {
    const lunes = new Date(2025, 5, 2);
    expect(toLocalDateStr(lunesDe(lunes))).toBe('2025-06-02');
  });

  it('maneja el domingo correctamente', () => {
    const domingo = new Date(2025, 5, 8);
    expect(toLocalDateStr(lunesDe(domingo))).toBe('2025-06-02');
  });
});

describe('diasDeSemana', () => {
  it('devuelve 7 días', () => {
    const lunes = new Date(2025, 5, 2);
    expect(diasDeSemana(lunes)).toHaveLength(7);
  });

  it('empieza en lunes y acaba en domingo', () => {
    const lunes = new Date(2025, 5, 2);
    const dias = diasDeSemana(lunes);
    expect(dias[0]).toBe('2025-06-02');
    expect(dias[6]).toBe('2025-06-08');
  });
});

describe('fechaLegible', () => {
  it('convierte YYYY-MM-DD a texto en español', () => {
    expect(fechaLegible('2025-06-01')).toBe('1 de junio de 2025');
  });

  it('funciona con diciembre', () => {
    expect(fechaLegible('2024-12-25')).toBe('25 de diciembre de 2024');
  });
});

describe('capitalize', () => {
  it('pone en mayúscula la primera letra', () => {
    expect(capitalize('lunes')).toBe('Lunes');
  });

  it('no modifica el resto', () => {
    expect(capitalize('miércoles')).toBe('Miércoles');
  });

  it('string vacío no explota', () => {
    expect(capitalize('')).toBe('');
  });
});