import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Grupo } from '../datos/db';
import { useGrupos } from '../datos/grupos';
import { GRADOS, PROGRAMAS } from '../datos/programas';
import { claveGrupo, marcarContenidos, progresoUC, siguienteEstado, useSeguimiento, type EstadoSeg, type FilaBloque } from '../datos/seguimiento';
import { Boton, Pildora } from '../componentes/ui';
import { Icono } from '../componentes/Iconos';

const TEXTO_ESTADO: Record<EstadoSeg | 'pendiente', string> = { pendiente: 'Sin trabajar', 'en-curso': 'En curso', dado: 'Trabajado' };
const ESTILO_ESTADO: Record<EstadoSeg | 'pendiente', string> = {
  pendiente: 'border-[1.5px] border-slate-200 bg-white text-slate-600 hover:border-blue-300',
  'en-curso': 'border-[1.5px] border-amarillo-400 bg-amarillo-50 text-amarillo-800',
  dado: 'border-[1.5px] border-menta-500 bg-menta-50 text-menta-700',
};
const fechaCorta = (iso?: string) => {
  if (!iso) return '';
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });
};

function Barra({ dados, enCurso, total }: { dados: number; enCurso: number; total: number }) {
  const p = (n: number) => (total ? (n / total) * 100 : 0);
  return (
    <span className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${dados} de ${total} trabajados, ${enCurso} en curso`}>
      <span className="block h-full bg-menta-500" style={{ width: `${p(dados)}%` }} />
      <span className="block h-full bg-amarillo-400" style={{ width: `${p(enCurso)}%` }} />
    </span>
  );
}

function Bloques({ bloques, ucId, grupoKey, estados, ocultarDados }: { bloques: FilaBloque[]; ucId: string; grupoKey: string; estados: ReturnType<typeof useSeguimiento>; ocultarDados: boolean }) {
  return (
    <div className="mt-4 space-y-5">
      {bloques.map(({ bloque, contenidos }) => {
        const visibles = contenidos.filter((c) => !(ocultarDados && c.estado === 'dado'));
        if (!visibles.length) return null;
        const ids = contenidos.map((c) => c.contenido.id);
        return (
          <section key={bloque.id}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h4 className="mr-auto text-[13px] font-extrabold tracking-[0.06em] text-slate-500 uppercase">
                {bloque.eje ? `${bloque.eje} · ` : ''}
                {bloque.titulo}
                {bloque.transversal && ' (transversal)'}
              </h4>
              <Boton variante="texto" onClick={() => marcarContenidos(grupoKey, ucId, ids, 'dado')}>Marcar el bloque como trabajado</Boton>
              <Boton variante="texto" onClick={() => marcarContenidos(grupoKey, ucId, ids, null)}>Quitar marcas</Boton>
            </div>
            <ul className="space-y-1.5">
              {visibles.map((c) => {
                const e = c.estado ?? 'pendiente';
                return (
                  <li key={c.contenido.id} className="flex flex-wrap items-start gap-3 rounded-[14px] bg-slate-50 px-3.5 py-2.5">
                    <button
                      type="button"
                      onClick={() => marcarContenidos(grupoKey, ucId, [c.contenido.id], siguienteEstado(estados.get(c.contenido.id)?.estado))}
                      title="Tocá para cambiar: sin trabajar → en curso → trabajado"
                      aria-label={`${c.contenido.texto}: ${TEXTO_ESTADO[e]}. Tocá para cambiar.`}
                      className={`inline-flex min-h-9 w-28 shrink-0 items-center justify-center gap-1.5 rounded-full text-[13px] font-extrabold transition ${ESTILO_ESTADO[e]}`}
                    >
                      {e === 'dado' && <Icono nombre="check" tamano={14} grosor={3} />}
                      {TEXTO_ESTADO[e]}
                    </button>
                    <span className="min-w-0 flex-1 text-[15px] leading-snug text-slate-900">
                      {c.contenido.texto}
                      {c.fecha && e !== 'pendiente' && <span className="ml-2 text-xs font-semibold text-slate-500">{fechaCorta(c.fecha)}</span>}
                      {e === 'pendiente' && c.planificadoEn.length > 0 && (
                        <span className="ml-2 rounded-full bg-amarillo-50 px-2 py-0.5 text-xs font-bold text-amarillo-800" title={c.planificadoEn.join(', ')}>
                          Planificado en «{c.planificadoEn[0]}»{c.planificadoEn.length > 1 ? ` y ${c.planificadoEn.length - 1} más` : ''}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function Seguimiento() {
  const { grupos, activo } = useGrupos();
  const [grupoId, setGrupoId] = useState(activo?.id ?? '');
  const grupo: Grupo | null = grupos.find((g) => g.id === grupoId) ?? null;
  const [grado, setGrado] = useState(grupo?.grados[0] ?? 3);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [ocultarDados, setOcultarDados] = useState(false);
  const estados = useSeguimiento(claveGrupo(grupo));
  const planificaciones = useLiveQuery(() => db.planificaciones.toArray(), []) ?? [];

  // Si se cambia el grupo desde la barra lateral, esta pantalla lo acompaña.
  useEffect(() => {
    setGrupoId(activo?.id ?? '');
    if (activo) setGrado(activo.grados[0] ?? 3);
  }, [activo]);

  const progresos = PROGRAMAS.map((uc) => progresoUC(uc, grado, estados, planificaciones, grupo)).filter((p): p is NonNullable<typeof p> => !!p);
  const total = progresos.reduce((n, p) => n + p.total, 0);
  const dados = progresos.reduce((n, p) => n + p.dados, 0);
  const enCurso = progresos.reduce((n, p) => n + p.enCurso, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Avance del programa</h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          Marcá qué contenidos ya trabajaste con tu grupo y mirá cuánto del programa llevás en cada unidad curricular. Tocá un contenido para pasarlo de «sin
          trabajar» a «en curso» y a «trabajado».
        </p>
      </div>

      <section className="flex flex-wrap items-end gap-4 rounded-[28px] bg-white p-5 shadow-suave sm:p-6">
        {grupos.length > 0 && (
          <label className="block min-w-48">
            <span className="text-sm font-bold text-slate-700">Grupo</span>
            <select
              value={grupoId}
              onChange={(e) => {
                setGrupoId(e.target.value);
                const g = grupos.find((x) => x.id === e.target.value);
                if (g) setGrado(g.grados[0] ?? 3);
              }}
              className="mt-1 block min-h-11 w-full rounded-[14px] border-[1.5px] border-slate-200 bg-white px-3.5 text-[15px] focus:border-blue-500 focus:outline-none"
            >
              <option value="">Sin grupo (registro general)</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </label>
        )}
        <div>
          <span className="text-sm font-bold text-slate-700">Grado</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {GRADOS.map((g) => (
              <Pildora key={g} activa={grado === g} onClick={() => setGrado(g)}>{g}.º</Pildora>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={ocultarDados} onChange={(e) => setOcultarDados(e.target.checked)} className="h-5 w-5 accent-blue-600" />
          Ocultar los ya trabajados
        </label>
        <div className="ml-auto min-w-56 flex-1">
          <p className="m-0 flex items-baseline justify-between text-sm">
            <span className="font-bold text-slate-700">En total{grupo ? ` · ${grupo.nombre}` : ''}</span>
            <span className="text-[26px] leading-none font-extrabold text-slate-900">{total ? Math.round((dados / total) * 100) : 0}%</span>
          </p>
          <div className="mt-2"><Barra dados={dados} enCurso={enCurso} total={total} /></div>
          <p className="mt-1.5 text-xs text-slate-500">{dados} de {total} contenidos trabajados · {enCurso} en curso</p>
        </div>
      </section>

      {grupos.length === 0 && (
        <p className="text-sm text-slate-600">
          Estás llevando un registro general. Si tenés varios grupos, <Link to="/grupos" className="font-bold text-blue-700 underline">cargalos</Link> para llevar el avance de cada uno por separado.
        </p>
      )}

      <div className="space-y-3">
        {progresos.map((p) => {
          const abierta = abiertas.has(p.uc.id);
          return (
            <details
              key={p.uc.id}
              open={abierta}
              onToggle={(e) => {
                const abre = (e.currentTarget as HTMLDetailsElement).open;
                setAbiertas((s) => {
                  const n = new Set(s);
                  if (abre) n.add(p.uc.id);
                  else n.delete(p.uc.id);
                  return n;
                });
              }}
              className="rounded-[24px] bg-white p-5 shadow-suave"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-5 gap-y-2">
                <span className="min-w-52 flex-1">
                  <span className="block text-[17px] font-extrabold text-slate-900">{p.uc.nombre}</span>
                  <span className="text-[13px] font-semibold text-slate-500">
                    {p.dados} de {p.total} trabajados
                    {p.enCurso > 0 && ` · ${p.enCurso} en curso`}
                    {p.planificados > 0 && ` · ${p.planificados} planificados sin dar`}
                  </span>
                </span>
                <span className="flex min-w-40 flex-[2] items-center gap-3">
                  <Barra dados={p.dados} enCurso={p.enCurso} total={p.total} />
                  <span className="w-12 shrink-0 text-right text-lg font-extrabold text-slate-900">{p.total ? Math.round((p.dados / p.total) * 100) : 0}%</span>
                </span>
              </summary>
              {abierta && <Bloques bloques={p.bloques} ucId={p.uc.id} grupoKey={claveGrupo(grupo)} estados={estados} ocultarDados={ocultarDados} />}
            </details>
          );
        })}
      </div>
    </div>
  );
}
