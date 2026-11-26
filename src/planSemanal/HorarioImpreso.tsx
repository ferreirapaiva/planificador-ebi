import type { BloqueHorario, PlanSemanal } from '../datos/db';
import { nombreDia, tituloPlan } from '../datos/planSemanal';

const aMin = (h: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(h ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const hh = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:00`;

/** Colores suaves para distinguir las áreas de un vistazo (también salen bien en blanco y negro). */
const PALETA = [
  { fondo: '#eeebff', borde: '#8f82fa', texto: '#2a208a' },
  { fondo: '#ffede7', borde: '#ff7a59', texto: '#8a2c0d' },
  { fondo: '#e1f8f1', borde: '#1fbf9a', texto: '#0b6e57' },
  { fondo: '#fff6dc', borde: '#e0a800', texto: '#7a5300' },
  { fondo: '#e0f2fe', borde: '#38a3dd', texto: '#0c4a6e' },
  { fondo: '#fce7f3', borde: '#e0559c', texto: '#831843' },
  { fondo: '#ecfccb', borde: '#84b82a', texto: '#3f6212' },
  { fondo: '#ede9fe', borde: '#a78bfa', texto: '#4c1d95' },
];
const RUTINA = { fondo: '#f1f5f9', borde: '#94a3b8', texto: '#334155' };
const NOMBRES_RUTINA = ['recreo', 'comedor', 'almuerzo', 'merienda', 'entrada', 'salida'];

type Colocado = { b: BloqueHorario; ini: number; fin: number; carril: number; carriles: number };

/** Reparte en carriles los momentos que se superponen en un mismo día. */
function colocar(bloques: BloqueHorario[]): Colocado[] {
  const validos = bloques
    .map((b) => ({ b, ini: aMin(b.inicio), fin: aMin(b.fin) }))
    .filter((x): x is { b: BloqueHorario; ini: number; fin: number } => x.ini !== null && x.fin !== null && x.fin > x.ini)
    .sort((a, b) => a.ini - b.ini || a.fin - b.fin);
  const salida: Colocado[] = [];
  let grupo: Colocado[] = [];
  let finGrupo = -1;
  const cerrar = () => {
    const carriles = Math.max(1, ...grupo.map((g) => g.carril + 1));
    grupo.forEach((g) => (g.carriles = carriles));
    salida.push(...grupo);
    grupo = [];
  };
  const finCarril: number[] = [];
  for (const x of validos) {
    if (grupo.length && x.ini >= finGrupo) {
      cerrar();
      finCarril.length = 0;
    }
    let carril = finCarril.findIndex((f) => f <= x.ini);
    if (carril < 0) carril = finCarril.length;
    finCarril[carril] = x.fin;
    grupo.push({ ...x, carril, carriles: 1 });
    finGrupo = Math.max(finGrupo, x.fin);
  }
  if (grupo.length) cerrar();
  return salida;
}

/**
 * Horario del día o de la semana en una sola hoja A4 horizontal, para pegar en el aula.
 * Cada momento se ubica según su hora; las áreas tienen colores distintos.
 */
export function HorarioImpreso({ plan }: { plan: PlanSemanal }) {
  const todos = plan.dias.flatMap((d) => d.bloques);
  const inicios = todos.map((b) => aMin(b.inicio)).filter((n): n is number => n !== null);
  const fines = todos.map((b) => aMin(b.fin)).filter((n): n is number => n !== null);
  let t0 = inicios.length ? Math.floor(Math.min(...inicios) / 60) * 60 : 8 * 60;
  let t1 = fines.length ? Math.ceil(Math.max(...fines) / 60) * 60 : 12 * 60;
  if (t1 - t0 < 180) t1 = t0 + 180;
  const total = t1 - t0;
  const horas = Array.from({ length: total / 60 + 1 }, (_, i) => t0 + i * 60);

  const areas = [...new Set(todos.map((b) => b.area.trim()).filter(Boolean))];
  const colorDe = (b: BloqueHorario) => {
    const a = b.area.trim();
    if (!a) return NOMBRES_RUTINA.some((r) => b.actividad.toLowerCase().includes(r)) || !b.actividad ? RUTINA : PALETA[0];
    return PALETA[areas.indexOf(a) % PALETA.length];
  };
  const sinHora = plan.dias.map((d) => d.bloques.filter((b) => aMin(b.inicio) === null || aMin(b.fin) === null || (aMin(b.fin) ?? 0) <= (aMin(b.inicio) ?? 0)));
  const alto = 150; // mm de la grilla
  const subtitulo = [plan.grupo, plan.escuela, plan.docente && `Docente: ${plan.docente}`].filter((x) => x?.trim()).join('  ·  ');

  return (
    <div className="horario-hoja" style={{ width: '100%', color: '#1b1840', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8mm', marginBottom: '3mm', borderBottom: '0.5mm solid #5b4bf5', paddingBottom: '2mm' }}>
        <div>
          <div style={{ fontSize: '17pt', fontWeight: 900, lineHeight: 1.1 }}>{plan.alcance === 'dia' ? 'Horario del día' : 'Horario de la semana'}</div>
          <div style={{ fontSize: '10pt', color: '#5f5c84', fontWeight: 700 }}>{tituloPlan(plan)}</div>
        </div>
        {subtitulo && <div style={{ fontSize: '10.5pt', fontWeight: 800, textAlign: 'right' }}>{subtitulo}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `13mm repeat(${plan.dias.length}, 1fr)`, gap: 0 }}>
        <div />
        {plan.dias.map((d) => (
          <div key={d.fecha} style={{ textAlign: 'center', fontSize: '10pt', fontWeight: 900, padding: '1mm 0 1.5mm', textTransform: 'capitalize' }}>
            {nombreDia(d.fecha).split(',')[0].split(' ').slice(0, 3).join(' ')}
          </div>
        ))}
        {/* horas */}
        <div style={{ position: 'relative', height: `${alto}mm` }}>
          {horas.map((h) => (
            <span key={h} style={{ position: 'absolute', right: '1.5mm', top: `${((h - t0) / total) * 100}%`, transform: 'translateY(-50%)', fontSize: '8pt', fontWeight: 800, color: '#5f5c84' }}>
              {hh(h)}
            </span>
          ))}
        </div>
        {plan.dias.map((d) => (
          <div key={d.fecha} style={{ position: 'relative', height: `${alto}mm`, borderLeft: '0.3mm solid #cbd5e1', borderRight: d === plan.dias[plan.dias.length - 1] ? '0.3mm solid #cbd5e1' : undefined }}>
            {horas.map((h) => (
              <span key={h} style={{ position: 'absolute', left: 0, right: 0, top: `${((h - t0) / total) * 100}%`, borderTop: '0.25mm solid #e2e8f0' }} />
            ))}
            {colocar(d.bloques).map((c) => {
              const col = colorDe(c.b);
              const altoMm = ((c.fin - c.ini) / total) * alto;
              return (
                <div
                  key={c.b.id}
                  style={{
                    position: 'absolute',
                    top: `${((c.ini - t0) / total) * 100}%`,
                    height: `calc(${((c.fin - c.ini) / total) * 100}% - 0.6mm)`,
                    left: `calc(${(c.carril / c.carriles) * 100}% + 0.6mm)`,
                    width: `calc(${100 / c.carriles}% - 1.2mm)`,
                    background: col.fondo,
                    borderLeft: `1.2mm solid ${col.borde}`,
                    borderRadius: '1.2mm',
                    padding: '0.6mm 1.2mm',
                    overflow: 'hidden',
                    color: col.texto,
                    lineHeight: 1.15,
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ fontSize: altoMm < 9 ? '7.5pt' : '9pt', fontWeight: 900, whiteSpace: altoMm < 9 ? 'nowrap' : 'normal', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {c.b.actividad || c.b.area || 'Sin nombre'}
                  </div>
                  {altoMm >= 9 && (
                    <div style={{ fontSize: '7.5pt', fontWeight: 700, opacity: 0.85 }}>
                      {c.b.inicio}–{c.b.fin}
                      {c.b.actividad && c.b.area ? ` · ${c.b.area}` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {sinHora.some((l) => l.length) && (
        <div style={{ marginTop: '2mm', fontSize: '8pt', color: '#5f5c84' }}>
          Sin horario definido:{' '}
          {plan.dias.flatMap((d, i) => sinHora[i].map((b) => `${nombreDia(d.fecha).split(',')[0]}: ${b.actividad || b.area || 'sin nombre'}`)).join(' · ')}
        </div>
      )}
      {areas.length > 0 && (
        <div style={{ marginTop: '2.5mm', display: 'flex', flexWrap: 'wrap', gap: '1.5mm 4mm', fontSize: '8.5pt', fontWeight: 800 }}>
          {areas.map((a, i) => (
            <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: '1.2mm' }}>
              <span style={{ width: '3.4mm', height: '3.4mm', borderRadius: '0.8mm', background: PALETA[i % PALETA.length].fondo, border: `0.4mm solid ${PALETA[i % PALETA.length].borde}` }} />
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
