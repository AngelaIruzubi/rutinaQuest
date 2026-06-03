import { ahoraApp, fechaAppDate, hoyAppStr, setFechaSimulada } from '../../utils/fecha';

afterEach(() => setFechaSimulada(null));

describe('hoyAppStr', () => {
  it('devuelve formato YYYY-MM-DD', () => {
    expect(hoyAppStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('respeta la fecha simulada', () => {
    setFechaSimulada('2025-06-15');
    expect(hoyAppStr()).toBe('2025-06-15');
  });

  it('vuelve a la fecha real tras resetear', () => {
    setFechaSimulada('2025-01-01');
    setFechaSimulada(null);
    expect(hoyAppStr()).not.toBe('2025-01-01');
  });

  it('dos llamadas seguidas devuelven el mismo valor', () => {
    setFechaSimulada('2025-03-10');
    expect(hoyAppStr()).toBe(hoyAppStr());
  });
});

describe('fechaAppDate', () => {
  it('devuelve un objeto Date', () => {
    expect(fechaAppDate() instanceof Date).toBe(true);
  });

  it('con fecha simulada devuelve la fecha correcta', () => {
    setFechaSimulada('2025-08-20');
    const d = fechaAppDate();
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(7); // agosto = 7 (0-indexed)
    expect(d.getDate()).toBe(20);
  });

  it('acepta una fecha como parámetro string', () => {
    const d = fechaAppDate('2024-12-25');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(11); // diciembre = 11
    expect(d.getDate()).toBe(25);
  });
});

describe('ahoraApp', () => {
  it('devuelve un objeto Date', () => {
    expect(ahoraApp() instanceof Date).toBe(true);
  });

  it('con fecha simulada devuelve la fecha simulada', () => {
    setFechaSimulada('2025-05-01');
    const d = ahoraApp();
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(4); // mayo = 4
    expect(d.getDate()).toBe(1);
  });
});
