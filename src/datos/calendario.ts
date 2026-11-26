import { nuevoId, type CalendarioEscolar, type Efemeride } from './db';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const desdeIso = (s: string) => {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
};
const sumarDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
export function pascua(anio: number): Date {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

/** Primer día de la semana indicada (0 = domingo … 1 = lunes) a partir de una fecha, inclusive. */
const proximo = (d: Date, diaSemana: number) => sumarDias(d, (diaSemana - d.getDay() + 7) % 7);

const EFEMERIDES_FIJAS: [string, string][] = [
  ['03-08', 'Día Internacional de la Mujer'],
  ['03-22', 'Día Mundial del Agua'],
  ['04-19', 'Desembarco de los Treinta y Tres Orientales'],
  ['04-23', 'Día del Libro'],
  ['05-01', 'Día de los Trabajadores'],
  ['05-18', 'Batalla de Las Piedras'],
  ['06-05', 'Día Mundial del Medio Ambiente'],
  ['06-19', 'Natalicio de José Artigas'],
  ['07-18', 'Jura de la Constitución'],
  ['08-25', 'Declaratoria de la Independencia'],
  ['09-21', 'Día de la Primavera'],
  ['10-12', 'Día de la Diversidad Cultural'],
  ['11-02', 'Día de los Difuntos'],
  ['12-10', 'Día de los Derechos Humanos'],
];

/**
 * Feriados oficiales por año (fecha, nombre). Solo están los años ya confirmados; para los demás se usan las fechas habituales de abajo.
 * 2027: 15 feriados (Carnaval y Semana de Turismo cuentan dos días cada uno); 5 son no laborables pagos.
 */
const FERIADOS_OFICIALES: Record<number, [string, string][]> = {
  2027: [
    ['2027-01-01', 'Año Nuevo'],
    ['2027-01-06', 'Día de los Niños (Reyes)'],
    ['2027-02-08', 'Carnaval'],
    ['2027-02-09', 'Carnaval'],
    ['2027-03-25', 'Semana de Turismo'],
    ['2027-03-26', 'Semana de Turismo'],
    ['2027-04-19', 'Desembarco de los Treinta y Tres Orientales'],
    ['2027-05-01', 'Día de los Trabajadores'],
    ['2027-05-17', 'Batalla de Las Piedras'],
    ['2027-06-19', 'Natalicio de José Artigas'],
    ['2027-07-18', 'Jura de la Constitución'],
    ['2027-08-25', 'Declaratoria de la Independencia'],
    ['2027-10-11', 'Día de la Diversidad Cultural'],
    ['2027-11-02', 'Día de los Difuntos'],
    ['2027-12-25', 'Navidad / Día de la Familia'],
  ],
};

/** Calendario lectivo oficial de ANEP por año (Educación Inicial y Primaria). Para los demás años las fechas son aproximadas. */
const LECTIVO_OFICIAL: Record<number, { inicio: string; fin: string; invierno: [string, string]; primavera: [string, string] }> = {
  2027: { inicio: '2027-03-01', fin: '2027-12-17', invierno: ['2027-06-28', '2027-07-02'], primavera: ['2027-09-20', '2027-09-24'] },
};

/** Nombre del feriado oficial de esa fecha, o null (también null en los años sin lista oficial cargada). */
export function feriadoOficial(fecha: string): string | null {
  return FERIADOS_OFICIALES[Number(fecha.slice(0, 4))]?.find(([f]) => f === fecha)?.[1] ?? null;
}

/**
 * Calendario de partida para un año. Las fechas de inicio, fin y vacaciones son aproximadas
 * (cada año las fija ANEP): el docente las ajusta en la pantalla de datos del plan anual.
 * Carnaval y Semana de Turismo se calculan a partir de la Pascua.
 */
export function calendarioPorDefecto(anio: number): CalendarioEscolar {
  const p = pascua(anio);
  const lunesTurismo = sumarDias(p, -6);
  const lunesCarnaval = sumarDias(p, -48);
  const julio = proximo(new Date(anio, 6, 1), 1);
  const primavera = proximo(new Date(anio, 8, 22), 1);
  const oficiales = FERIADOS_OFICIALES[anio];
  const nombresOficiales = new Set((oficiales ?? []).map(([, n]) => n));
  const efemerides: Efemeride[] = [
    { fecha: iso(lunesCarnaval), nombre: 'Carnaval' },
    ...EFEMERIDES_FIJAS.map(([md, nombre]) => ({ fecha: `${anio}-${md}`, nombre })),
  ]
    // Con la lista oficial del año, las fechas habituales de esos feriados se reemplazan por las oficiales.
    .filter((e) => !nombresOficiales.has(e.nombre))
    .concat((oficiales ?? []).map(([fecha, nombre]) => ({ fecha, nombre, feriado: true })))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const lectivo = LECTIVO_OFICIAL[anio];
  const invierno = lectivo?.invierno ?? [iso(julio), iso(sumarDias(julio, 11))];
  const vacPrimavera = lectivo?.primavera ?? [iso(primavera), iso(sumarDias(primavera, 4))];
  return {
    inicio: lectivo?.inicio ?? iso(proximo(new Date(anio, 2, 1), 1)),
    fin: lectivo?.fin ?? iso(proximo(new Date(anio, 11, 8), 5)),
    sinClases: [
      { id: nuevoId(), nombre: 'Semana de Turismo', desde: iso(lunesTurismo), hasta: iso(sumarDias(lunesTurismo, 4)) },
      { id: nuevoId(), nombre: lectivo ? 'Vacaciones de invierno' : 'Vacaciones de julio', desde: invierno[0], hasta: invierno[1] },
      { id: nuevoId(), nombre: 'Vacaciones de primavera', desde: vacPrimavera[0], hasta: vacPrimavera[1] },
    ],
    efemerides,
  };
}

/** Días hábiles (lunes a viernes) de clase en un mes, descontando los períodos sin clases y los feriados oficiales cargados en el calendario. */
export function diasDeClase(cal: CalendarioEscolar, anio: number, mes: number): number {
  if (!cal.inicio || !cal.fin) return 0;
  const inicio = desdeIso(cal.inicio), fin = desdeIso(cal.fin);
  const sinClases = cal.sinClases.filter((p) => p.desde && p.hasta).map((p) => [desdeIso(p.desde), desdeIso(p.hasta)] as const);
  const feriados = new Set(cal.efemerides.filter((e) => e.feriado).map((e) => e.fecha));
  let n = 0;
  for (let d = new Date(anio, mes - 1, 1); d.getMonth() === mes - 1; d = sumarDias(d, 1)) {
    const dia = d.getDay();
    if (dia === 0 || dia === 6 || d < inicio || d > fin) continue;
    if (sinClases.some(([a, b]) => d >= a && d <= b)) continue;
    if (feriados.has(iso(d))) continue;
    n++;
  }
  return n;
}

export const efemeridesDelMes = (cal: CalendarioEscolar, mes: number) =>
  cal.efemerides.filter((e) => Number(e.fecha.split('-')[1]) === mes);

export const periodosDelMes = (cal: CalendarioEscolar, anio: number, mes: number) =>
  cal.sinClases.filter((p) => {
    if (!p.desde || !p.hasta) return false;
    const inicioMes = new Date(anio, mes - 1, 1), finMes = new Date(anio, mes, 0);
    return desdeIso(p.desde) <= finMes && desdeIso(p.hasta) >= inicioMes;
  });
