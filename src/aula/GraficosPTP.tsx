import type { PTP, PuntoPTP } from '../datos/db';
import { claveCriterio, NIVELES_PTP, nombreNivel, resumenObjetivos } from '../datos/ptp';
import { fechaCorta } from '../datos/aula';

const dia = (f: string) => {
  const [a, m, d] = f.split('-').map(Number);
  return Date.UTC(a, m - 1, d) / 86400000;
};
const MESES = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
export const mesCorto = (m: string) => `${MESES[Number(m.slice(5, 7))]} ${m.slice(2, 4)}`;

/** Color según quién anotó: los registros de evaluación, la docente de aula o la de apoyo. */
const colorPunto = (p: PuntoPTP, ptp: PTP) =>
  p.origen === 'registro' ? '#5B4BF5' : ptp.apoyo.trim() && claveCriterio(p.autor) === claveCriterio(ptp.apoyo) ? '#0b9d7f' : '#e0561f';

/** Evolución de un criterio en el tiempo, con el nivel que se quiere alcanzar. */
export function GraficoCriterio({ ptp, serie, meta, titulo }: { ptp: PTP; serie: PuntoPTP[]; meta: number; titulo?: string }) {
  const W = 340, H = 168, L = 66, R = 14, T = 12, B = 28, iw = W - L - R, ih = H - T - B;
  const y = (n: number) => T + ih - n * ih;
  const fechas = serie.map((p) => dia(p.fecha));
  const lo = fechas.length ? Math.min(...fechas) : 0, hi = fechas.length ? Math.max(...fechas) : 1, span = Math.max(hi - lo, 1);
  const x = (f: string) => (serie.length === 1 ? L + iw / 2 : L + ((dia(f) - lo) / span) * iw);
  const ultimo = serie[serie.length - 1];
  const descripcion = serie.length ? `${titulo ?? 'Criterio'}: ${serie.length} ${serie.length === 1 ? 'punto' : 'puntos'}; último nivel ${nombreNivel(ultimo.nivel)}; meta ${nombreNivel(meta)}.` : `${titulo ?? 'Criterio'}: todavía sin puntos.`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descripcion} className="w-full max-w-[460px]">
      {NIVELES_PTP.map((n, i) => (
        <g key={n}>
          <line x1={L} x2={W - R} y1={y(i / 3)} y2={y(i / 3)} className="stroke-slate-200" strokeWidth={0.8} />
          <text x={L - 6} y={y(i / 3) + 3} textAnchor="end" fontSize={9.5} className="fill-slate-500">{n}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={y(meta)} y2={y(meta)} stroke="#1fbf9a" strokeWidth={1.4} strokeDasharray="5 3" />
      <text x={W - R} y={y(meta) - 3} textAnchor="end" fontSize={8.5} fill="#0b9d7f">meta</text>
      {serie.length > 1 && <polyline fill="none" stroke="#a9a3e8" strokeWidth={1.6} points={serie.map((p) => `${x(p.fecha)},${y(p.nivel)}`).join(' ')} />}
      {serie.map((p) =>
        p.origen === 'registro' ? (
          <circle key={p.id} cx={x(p.fecha)} cy={y(p.nivel)} r={4.2} fill={colorPunto(p, ptp)}><title>{`${fechaCorta(p.fecha)}: ${nombreNivel(p.nivel)}${p.nota ? ' · ' + p.nota : ''}`}</title></circle>
        ) : (
          <rect key={p.id} x={x(p.fecha) - 3.8} y={y(p.nivel) - 3.8} width={7.6} height={7.6} fill={colorPunto(p, ptp)} transform={`rotate(45 ${x(p.fecha)} ${y(p.nivel)})`}><title>{`${fechaCorta(p.fecha)}: ${nombreNivel(p.nivel)}${p.nota ? ' · ' + p.nota : ''}${p.autor ? ' (' + p.autor + ')' : ''}`}</title></rect>
        ),
      )}
      {serie.length > 0 && (
        <>
          <text x={x(serie[0].fecha)} y={H - 10} textAnchor={serie.length === 1 || ultimo.fecha === serie[0].fecha ? 'middle' : 'start'} fontSize={9} className="fill-slate-500">{fechaCorta(serie[0].fecha)}</text>
          {serie.length > 1 && ultimo.fecha !== serie[0].fecha && <text x={x(ultimo.fecha)} y={H - 10} textAnchor="end" fontSize={9} className="fill-slate-500">{fechaCorta(ultimo.fecha)}</text>}
        </>
      )}
      {serie.length === 0 && <text x={L + iw / 2} y={T + ih / 2} textAnchor="middle" fontSize={10} className="fill-slate-400">Todavía sin puntos</text>}
    </svg>
  );
}

export function LeyendaGrafico() {
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
      <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden><circle cx="6" cy="6" r="4.5" fill="#5B4BF5" /></svg>Registro de evaluación</span>
      <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden><rect x="2.5" y="2.5" width="7" height="7" fill="#e0561f" transform="rotate(45 6 6)" /></svg>Anotado por la docente</span>
      <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden><rect x="2.5" y="2.5" width="7" height="7" fill="#0b9d7f" transform="rotate(45 6 6)" /></svg>Anotado por la docente de apoyo</span>
      <span className="inline-flex items-center gap-1.5"><svg width="16" height="8" aria-hidden><line x1="0" x2="16" y1="4" y2="4" stroke="#1fbf9a" strokeWidth="1.6" strokeDasharray="4 2" /></svg>Meta</span>
    </p>
  );
}

/** Para cada objetivo: de dónde partió, dónde está y adónde se quiere llegar. */
export function GraficoAvance({ ptp, auto }: { ptp: PTP; auto: PuntoPTP[] }) {
  const filas = resumenObjetivos(ptp, auto);
  if (!filas.length) return <p className="m-0 text-sm text-slate-500">Todavía no hay objetivos.</p>;
  const W = 360, L = 150, R = 58, rh = 26, H = filas.length * rh + 22, iw = W - L - R;
  const px = (n: number) => L + n * iw;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Avance de ${filas.length} objetivos`} className="w-full max-w-[520px]">
      {NIVELES_PTP.map((n, i) => <text key={n} x={px(i / 3)} y={H - 4} textAnchor="middle" fontSize={8} className="fill-slate-400">{n}</text>)}
      {filas.map(({ o, actual }, i) => {
        const y0 = i * rh + 6, partida = o.partida ?? 0;
        const texto = o.criterio.length > 30 ? o.criterio.slice(0, 29) + '…' : o.criterio;
        return (
          <g key={o.id}>
            <text x={L - 6} y={y0 + 11} textAnchor="end" fontSize={9.5} className="fill-slate-700"><title>{o.criterio}</title>{texto}</text>
            <rect x={L} y={y0 + 3} width={iw} height={10} rx={5} className="fill-slate-100" />
            {actual !== null && <rect x={L} y={y0 + 3} width={Math.max(4, actual * iw)} height={10} rx={5} fill="#8f82fa" />}
            {o.partida !== null && <circle cx={px(partida)} cy={y0 + 8} r={3.2} fill="#fff" stroke="#e0561f" strokeWidth={1.6}><title>Punto de partida</title></circle>}
            <line x1={px(o.meta)} x2={px(o.meta)} y1={y0} y2={y0 + 16} stroke="#1fbf9a" strokeWidth={2} />
            <text x={W - R + 6} y={y0 + 11} fontSize={9} className="fill-slate-500">{actual === null ? '—' : nombreNivel(actual)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Asistencia mes a mes. */
export function GraficoAsistencia({ meses }: { meses: { mes: string; pct: number; dias: number }[] }) {
  if (!meses.length) return <p className="m-0 text-sm text-slate-500">Todavía no hay asistencia marcada para este alumno.</p>;
  const W = 340, H = 130, L = 30, T = 8, B = 22, iw = W - L - 8, ih = H - T - B, bw = Math.min(34, iw / meses.length - 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Asistencia por mes: ${meses.map((m) => `${mesCorto(m.mes)} ${m.pct} %`).join(', ')}`} className="w-full max-w-[460px]">
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - 8} y1={T + ih - (v / 100) * ih} y2={T + ih - (v / 100) * ih} className="stroke-slate-200" strokeWidth={0.8} />
          <text x={L - 4} y={T + ih - (v / 100) * ih + 3} textAnchor="end" fontSize={8.5} className="fill-slate-500">{v}</text>
        </g>
      ))}
      {meses.map((m, i) => {
        const cx = L + ((i + 0.5) * iw) / meses.length, h = (m.pct / 100) * ih;
        return (
          <g key={m.mes}>
            <rect x={cx - bw / 2} y={T + ih - h} width={bw} height={h} rx={3} fill={m.pct >= 85 ? '#1fbf9a' : m.pct >= 70 ? '#e0a800' : '#e0561f'}><title>{`${mesCorto(m.mes)}: ${m.pct} % de ${m.dias} días`}</title></rect>
            <text x={cx} y={T + ih - h - 3} textAnchor="middle" fontSize={8.5} className="fill-slate-700">{m.pct}</text>
            <text x={cx} y={H - 8} textAnchor="middle" fontSize={8.5} className="fill-slate-500">{mesCorto(m.mes)}</text>
          </g>
        );
      })}
    </svg>
  );
}
