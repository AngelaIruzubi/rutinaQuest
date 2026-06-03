import { calcularPuntos, minutosRestantes, parseTiempoLim } from '../../utils/tiempo';

describe('parseTiempoLim', () => {
  it('devuelve null para "Sin hora"', () =>
    expect(parseTiempoLim('Sin hora')).toBeNull());

  it('devuelve null para undefined', () =>
    expect(parseTiempoLim(undefined)).toBeNull());

  it('devuelve null para null', () =>
    expect(parseTiempoLim(null)).toBeNull());

  it('devuelve null para hora malformada', () => {
    expect(parseTiempoLim('abc')).toBeNull();
    expect(parseTiempoLim('25:00')).toBeNull();
    expect(parseTiempoLim('12:99')).toBeNull();
  });

  it('parsea "09:30" con horas y minutos correctos', () => {
    const d = parseTiempoLim('09:30')!;
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(30);
  });

  it('parsea "00:00" como medianoche', () => {
    const d = parseTiempoLim('00:00')!;
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('parsea "23:59" correctamente', () => {
    const d = parseTiempoLim('23:59')!;
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });
});

describe('minutosRestantes', () => {
  it('devuelve null para "Sin hora"', () =>
    expect(minutosRestantes('Sin hora')).toBeNull());

  it('devuelve null para undefined', () =>
    expect(minutosRestantes(undefined)).toBeNull());

  it('devuelve null para null', () =>
    expect(minutosRestantes(null)).toBeNull());

  it('devuelve negativo si la hora ya pasó', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-01T15:00:00'));
    expect(minutosRestantes('14:00')).toBeLessThan(0);
    jest.useRealTimers();
  });

  it('devuelve positivo si la hora no ha llegado', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-01T09:00:00'));
    expect(minutosRestantes('10:00')).toBeGreaterThan(0);
    jest.useRealTimers();
  });
  
  it('parsea hora con cero inicial "08:05"', () => {
  const d = parseTiempoLim('08:05')!;
  expect(d.getHours()).toBe(8);
  expect(d.getMinutes()).toBe(5);
});

it('minutosRestantes devuelve aproximadamente 60 para una hora después', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2025-06-01T09:00:00'));
  const mins = minutosRestantes('10:00');
  expect(mins).toBeGreaterThanOrEqual(59);
  expect(mins).toBeLessThanOrEqual(61);
  jest.useRealTimers();
});
});

describe('calcularPuntos', () => {
  it('sin hora → 5 puntos siempre', () => {
    expect(calcularPuntos(false, false)).toBe(5);
    expect(calcularPuntos(false, true)).toBe(5);
  });

  it('con hora en tiempo → 5 puntos', () =>
    expect(calcularPuntos(true, true)).toBe(5));

  it('con hora tarde → 3 puntos', () =>
    expect(calcularPuntos(true, false)).toBe(3));
});