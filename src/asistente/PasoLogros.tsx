import { useState } from 'react';
import { cesDe, type CriterioLogro } from '../datos/esquema';
import { buscarCriterio, competenciasMovilizadas, metaDe, metaSugerida } from '../datos/consultas';
import { normalizar } from '../datos/programas';
import { Aviso, Pildora, TarjetaCasilla } from '../componentes/ui';
import { PestanasUC, type Combinacion } from './PestanasUC';
import { alternar, type PropsPaso } from './tipos';

/** Metas de aprendizaje de los criterios elegidos en esta pestaña: una por criterio, editable. */
function Metas({ combinacion, plan, cambiar }: PropsPaso & { combinacion: Combinacion }) {
  const elegidos = plan.criterios.map(buscarCriterio).filter((r) => r && r.uc.id === combinacion.uc.id && r.grado === combinacion.grado);
  if (!elegidos.length) return null;
  const escribir = (id: string, texto: string | undefined) => {
    const metas = { ...(plan.metas ?? {}) };
    if (texto === undefined) delete metas[id];
    else metas[id] = texto;
    cambiar({ metas });
  };
  return (
    <section className="rounded-[20px] border-[1.5px] border-blue-200 bg-blue-50 p-4">
      <h4 className="m-0 text-[15px] font-extrabold text-slate-900">Metas de aprendizaje ({elegidos.length})</h4>
      <p className="mt-1 mb-3 text-sm text-slate-600">
        Cada meta une el criterio de logro con su competencia específica. Te proponemos una redacción: cambiala a tu gusto.
      </p>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {elegidos.map((r) => {
          const id = r!.criterio.id;
          const propia = plan.metas?.[id] !== undefined && plan.metas[id] !== metaSugerida(id);
          return (
            <li key={id} className="rounded-[14px] bg-white p-3">
              <p className="m-0 text-xs text-slate-500">
                <strong className="text-blue-800">{r!.ces.join(' · ')}</strong> · Criterio: {r!.criterio.texto}
              </p>
              <textarea
                rows={2}
                value={metaDe(plan, id)}
                onChange={(e) => escribir(id, e.target.value)}
                aria-label={`Meta para el criterio: ${r!.criterio.texto}`}
                className="mt-2 w-full rounded-[12px] border-[1.5px] border-slate-200 bg-white px-3 py-2 text-[15px] focus:border-blue-500 focus:outline-none"
              />
              {propia && (
                <button type="button" className="mt-1 text-xs font-semibold text-blue-700 hover:underline" onClick={() => escribir(id, undefined)}>
                  Volver a la redacción sugerida
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ListaCriterios({ combinacion, plan, cambiar }: PropsPaso & { combinacion: Combinacion }) {
  const { uc, grado } = combinacion;
  const [ce, setCe] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const g = uc.grados.find((x) => x.grado === grado);
  if (!g) return <p className="text-sm text-slate-500">Este programa no tiene {grado}.º grado.</p>;
  const q = normalizar(texto.trim());
  const visibles = g.criteriosLogro.filter((c) => (!ce || cesDe(c).includes(ce)) && (!q || normalizar(c.texto).includes(q)));
  const grupos = new Map<string, CriterioLogro[]>();
  visibles.forEach((c) => {
    const k = cesDe(c).join(' · ');
    grupos.set(k, [...(grupos.get(k) ?? []), c]);
  });
  const todosMarcados = visibles.length > 0 && visibles.every((c) => plan.criterios.includes(c.id));

  return (
    <div className="space-y-4">
      <Metas combinacion={combinacion} plan={plan} cambiar={cambiar} />
      <div className="flex flex-wrap items-center gap-2">
        <Pildora activa={!ce} onClick={() => setCe(null)}>Todas</Pildora>
        {uc.competenciasEspecificas.map((c) => (
          <span key={c.codigo} title={c.texto}>
            <Pildora activa={ce === c.codigo} onClick={() => setCe(ce === c.codigo ? null : c.codigo)}>{c.codigo}</Pildora>
          </span>
        ))}
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar criterio…"
          aria-label="Buscar criterio de logro"
          className="ml-auto min-w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>
      {ce && <p className="text-sm text-slate-600"><strong>{ce}.</strong> {uc.competenciasEspecificas.find((c) => c.codigo === ce)?.texto}</p>}
      {visibles.length > 0 && (
        <button
          type="button"
          className="text-sm font-medium text-blue-700 hover:underline"
          onClick={() => {
            const ids = visibles.map((c) => c.id);
            cambiar({ criterios: todosMarcados ? plan.criterios.filter((x) => !ids.includes(x)) : [...new Set([...plan.criterios, ...ids])] });
          }}
        >
          {todosMarcados ? 'Desmarcar los que se ven' : `Marcar los ${visibles.length} que se ven`}
        </button>
      )}
      {[...grupos.entries()].map(([k, items]) => (
        <div key={k}>
          <p className="mb-2 text-xs font-bold text-blue-800">{k}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {items.map((c) => (
              <TarjetaCasilla key={c.id} marcada={plan.criterios.includes(c.id)} onCambio={(v) => cambiar({ criterios: alternar(plan.criterios, c.id, v) })}>
                {c.texto}
              </TarjetaCasilla>
            ))}
          </div>
        </div>
      ))}
      {visibles.length === 0 && <p className="text-sm text-slate-500">Ningún criterio coincide con la búsqueda.</p>}
    </div>
  );
}

export function PasoLogros(props: PropsPaso) {
  const { plan } = props;
  const mov = competenciasMovilizadas(plan.criterios);
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <div>
        <Aviso>
          Empezamos por el final: elegí los <strong>criterios de logro</strong> que querés que tus estudiantes alcancen. En el paso siguiente
          te sugerimos los contenidos que se vinculan con ellos. Por cada criterio elegido aparece su <strong>meta</strong>, que podés redactar a tu gusto.
        </Aviso>
        <div className="mt-4">
          <PestanasUC ucIds={plan.ucIds} grados={plan.grados} contar={(c) => plan.criterios.filter((id) => {
            const r = buscarCriterio(id);
            return r?.uc.id === c.uc.id && r.grado === c.grado;
          }).length}>
            {(c) => <ListaCriterios key={c.clave} combinacion={c} {...props} />}
          </PestanasUC>
        </div>
      </div>
      <aside className="flex h-fit flex-col gap-4 rounded-[28px] bg-slate-900 p-6 text-white xl:sticky xl:top-6">
        <p className="m-0 text-[19px] font-extrabold">Lo que vas a movilizar</p>
        <p className="m-0 flex items-baseline gap-2.5">
          <span className="text-[52px] leading-none font-black text-amarillo-400">{plan.criterios.length}</span>
          <span className="text-[15px] font-bold text-slate-200">criterio{plan.criterios.length === 1 ? '' : 's'} de logro elegido{plan.criterios.length === 1 ? '' : 's'}</span>
        </p>
        {mov.especificas.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <p className="m-0 text-[11px] font-extrabold tracking-[0.08em] text-blue-200 uppercase">Competencias específicas</p>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {mov.especificas.map((e) => (
                <li key={e.uc.id + e.codigo} title={e.texto} className="rounded-[10px] bg-white/10 px-2.5 py-1.5 text-[13px] font-bold">
                  <span className="text-amarillo-400">{e.codigo}</span> {e.uc.nombre}
                </li>
              ))}
            </ul>
          </div>
        )}
        {mov.generales.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <p className="m-0 text-[11px] font-extrabold tracking-[0.08em] text-blue-200 uppercase">Competencias generales del MCN</p>
            <div className="flex flex-wrap gap-2">
              {mov.generales.map((g, i) => (
                <span key={g} className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${i < 3 ? 'bg-blue-600' : 'bg-white/10'}`}>
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}
        {plan.criterios.length === 0 && <p className="m-0 text-sm text-slate-300">Marcá criterios para ver qué competencias se movilizan.</p>}
      </aside>
    </div>
  );
}
