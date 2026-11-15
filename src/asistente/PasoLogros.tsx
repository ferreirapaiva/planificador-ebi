import { useState } from 'react';
import { cesDe, type CriterioLogro } from '../datos/esquema';
import { buscarCriterio, competenciasMovilizadas } from '../datos/consultas';
import { normalizar } from '../datos/programas';
import { Aviso, Pildora, TarjetaCasilla } from '../componentes/ui';
import { PestanasUC, type Combinacion } from './PestanasUC';
import { alternar, type PropsPaso } from './tipos';

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
          te sugerimos los contenidos que se vinculan con ellos.
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
