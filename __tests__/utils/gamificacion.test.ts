import { aplicarPenalizacion, calcularProgresos, detectarMedalla } from '../../utils/gamificacion';

describe('calcularProgresos', () => {
  it('0 estrellas → todo a 0', () =>
    expect(calcularProgresos(0)).toEqual({ progresBronce: 0, progresPlata: 0, progresOro: 0 }));

  it('50 estrellas → bronce a la mitad', () => {
    const p = calcularProgresos(50);
    expect(p.progresBronce).toBe(50);
    expect(p.progresPlata).toBe(0);
    expect(p.progresOro).toBe(0);
  });

  it('100 estrellas → bronce completo', () => {
    const p = calcularProgresos(100);
    expect(p.progresBronce).toBe(100);
    expect(p.progresPlata).toBe(0);
    expect(p.progresOro).toBe(0);
  });

  it('150 estrellas → bronce completo + plata empezada', () => {
    const p = calcularProgresos(150);
    expect(p.progresBronce).toBe(100);
    expect(p.progresPlata).toBe(50);
    expect(p.progresOro).toBe(0);
  });

  it('300 estrellas → bronce y plata completos', () => {
    const p = calcularProgresos(300);
    expect(p.progresBronce).toBe(100);
    expect(p.progresPlata).toBe(200);
    expect(p.progresOro).toBe(0);
  });

  it('600 estrellas → todo completo', () => {
    const p = calcularProgresos(600);
    expect(p.progresBronce).toBe(100);
    expect(p.progresPlata).toBe(200);
    expect(p.progresOro).toBe(300);
  });

  it('más de 600 → no supera los máximos', () => {
    const p = calcularProgresos(999);
    expect(p.progresBronce).toBe(100);
    expect(p.progresPlata).toBe(200);
    expect(p.progresOro).toBe(300);
  });
});

describe('detectarMedalla', () => {
  it('cruzar 100 → bronce', () =>
    expect(detectarMedalla(95, 105)).toBe('bronce'));

  it('cruzar 300 → plata', () =>
    expect(detectarMedalla(295, 305)).toBe('plata'));

  it('cruzar 600 → oro', () =>
    expect(detectarMedalla(595, 605)).toBe('oro'));

  it('sin cruzar umbral → null', () =>
    expect(detectarMedalla(50, 80)).toBeNull());

  it('exactamente en el umbral → detecta medalla', () =>
    expect(detectarMedalla(99, 100)).toBe('bronce'));

  it('ya tenía la medalla → null', () =>
    expect(detectarMedalla(150, 160)).toBeNull());

  it('0 a 0 → null', () =>
    expect(detectarMedalla(0, 0)).toBeNull());

  it('de 0 a 600 directamente → detecta oro', () =>
  expect(detectarMedalla(0, 600)).toBe('oro'));

  it('de 0 a 99 → null', () =>
  expect(detectarMedalla(0, 99)).toBeNull());

  it('valores negativos → null', () =>
  expect(detectarMedalla(-10, -5)).toBeNull());
});

describe('aplicarPenalizacion', () => {
  it('resta 10 estrellas por defecto', () =>
    expect(aplicarPenalizacion(50)).toBe(40));

  it('nunca baja de 0', () =>
    expect(aplicarPenalizacion(5)).toBe(0));

  it('con 0 estrellas devuelve 0', () =>
    expect(aplicarPenalizacion(0)).toBe(0));

  it('penalización exacta al límite', () =>
    expect(aplicarPenalizacion(10)).toBe(0));

  it('penalización personalizada', () =>
    expect(aplicarPenalizacion(50, 20)).toBe(30));
});