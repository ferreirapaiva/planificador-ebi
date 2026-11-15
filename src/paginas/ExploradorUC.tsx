import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Contenido, GradoUC, UnidadCurricular } from '../datos/esquema';
import { PROGRAMAS, colorEspacio, normalizar } from '../datos/programas';

type Vista = number | 'comparar';
type Filtros = { eje: string | null; ce: string | null; texto: string };

const coincide = (texto: string, q: string) => !q || normalizar(texto).includes(q);
const contenidoCoincide = (c: Contenido, q: string): boolean =>
  coincide(c.texto, q) || (c.subitems ?? []).some((s) => contenidoCoincide(s, q));

function Chip({ activo, onClick, children, title }: { activo: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={activo}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
        activo ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400'
      }`}
    >
      {children}
    </button>
  );
}

function ListaContenidos({ items }: { items: Contenido[] }) {
  return (
    <ul className="ml-5 list-disc space-y-1 text-slate-700">
      {items.map((c) => (
        <li key={c.id}>
          {c.texto}
          {c.subitems && <ListaContenidos items={c.subitems} />}
        </li>
      ))}
    </ul>
  );
}

function PanelGrado({ uc, grado, f }: { uc: UnidadCurricular; grado: GradoUC; f: Filtros }) {
  const q = normalizar(f.texto.trim());
  const bloques = grado.bloques.filter(
    (b) =>
      (!f.eje || b.eje === f.eje) &&
      (!f.ce || b.ceVinculadas.includes(f.ce)) &&
      (coincide(b.titulo, q) || b.contenidos.some((c) => contenidoCoincide(c, q))),
  );
  const criterios = grado.criteriosLogro.filter((c) => (!f.ce || c.ce === f.ce) && coincide(c.texto, q));
  const porCE = uc.competenciasEspecificas
    .map((ce) => ({ ce, items: criterios.filter((c) => c.ce === ce.codigo) }))
    .filter((g) => g.items.length);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">
          Contenidos específicos de {grado.grado}.º <span className="text-sm font-normal text-slate-500">({bloques.length})</span>
        </h3>
        {bloques.length === 0 && <p className="text-sm text-slate-500">Ningún contenido coincide con los filtros.</p>}
        <div className="space-y-3">
          {bloques.map((b) => (
            <article key={b.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h4 className="font-semibold uppercase tracking-wide text-slate-800">{b.titulo}</h4>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Eje {b.eje}</span>
                <span className="ml-auto text-xs text-slate-500">{b.ceVinculadas.join(' · ')}</span>
              </div>
              <ListaContenidos items={b.contenidos} />
            </article>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">
          Criterios de logro de {grado.grado}.º <span className="text-sm font-normal text-slate-500">({criterios.length})</span>
        </h3>
        {porCE.length === 0 && <p className="text-sm text-slate-500">Ningún criterio coincide con los filtros.</p>}
        <div className="space-y-3">
          {porCE.map(({ ce, items }) => (
            <article key={ce.codigo} className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="mb-2 text-sm text-slate-600">
                <span className="mr-1 rounded bg-blue-100 px-1.5 py-0.5 font-bold text-blue-800">{ce.codigo}</span>
                {ce.texto}
              </h4>
              <ul className="ml-5 list-disc space-y-1 text-slate-700">
                {items.map((c) => <li key={c.id}>{c.texto}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <p className="text-xs text-slate-400">
        Fuente: {grado.fuente.archivo}, págs. {grado.fuente.paginas.join(', ')}
      </p>
    </div>
  );
}

export function ExploradorUC() {
  const { ucId } = useParams();
  const uc = PROGRAMAS.find((p) => p.id === ucId);
  const [vista, setVista] = useState<Vista>(3);
  const [f, setF] = useState<Filtros>({ eje: null, ce: null, texto: '' });
  const [verCE, setVerCE] = useState(false);
  const grados = useMemo(() => uc?.grados ?? [], [uc]);

  if (!uc) {
    return (
      <p>
        Programa no encontrado. <Link className="text-blue-700 underline" to="/programas">Volver a programas</Link>
      </p>
    );
  }
  const color = colorEspacio(uc.espacio);
  const visibles = vista === 'comparar' ? grados : grados.filter((g) => g.grado === vista);

  return (
    <div className="space-y-5">
      <nav className="text-sm text-slate-500">
        <Link to="/programas" className="hover:underline">Programas</Link> › {uc.nombre}
      </nav>

      <header className={`rounded-2xl border p-5 ${color.suave}`}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-75">Espacio {uc.espacio} · Tramo {uc.tramo}</p>
        <h1 className="text-3xl font-bold">{uc.nombre}</h1>
        <p className="mt-2 max-w-3xl text-sm opacity-90">{uc.justificacion}</p>
      </header>

      {!uc.revisado && (
        <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Programa en revisión.</strong> Los datos se cargaron desde el PDF y falta compararlos con el original.
          {uc.notasRevision.length > 0 && (
            <ul className="ml-5 mt-1 list-disc">
              {uc.notasRevision.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setVerCE(!verCE)}
          aria-expanded={verCE}
          className="flex w-full items-center justify-between p-4 text-left font-semibold text-slate-900"
        >
          Competencias específicas ({uc.competenciasEspecificas.length})
          <span aria-hidden>{verCE ? '▲' : '▼'}</span>
        </button>
        {verCE && (
          <ul className="space-y-3 border-t border-slate-100 p-4">
            {uc.competenciasEspecificas.map((ce) => (
              <li key={ce.codigo}>
                <p className="text-slate-800">
                  <span className="mr-1 rounded bg-blue-100 px-1.5 py-0.5 text-sm font-bold text-blue-800">{ce.codigo}</span>
                  {ce.texto}
                </p>
                <p className="mt-1 text-xs text-slate-500">Contribuye a: {ce.competenciasMCN.join(', ')}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="sticky top-0 z-10 space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Grado:</span>
          {grados.map((g) => (
            <Chip key={g.grado} activo={vista === g.grado} onClick={() => setVista(g.grado)}>{g.grado}.º</Chip>
          ))}
          <Chip activo={vista === 'comparar'} onClick={() => setVista('comparar')}>Comparar 3.º y 4.º</Chip>
          <input
            type="search"
            value={f.texto}
            onChange={(e) => setF({ ...f, texto: e.target.value })}
            placeholder="Buscar (ej.: fracciones, ángulo…)"
            aria-label="Buscar en el programa"
            className="ml-auto min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm sm:flex-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Eje:</span>
          <Chip activo={!f.eje} onClick={() => setF({ ...f, eje: null })}>Todos</Chip>
          {uc.ejes.map((e) => (
            <Chip key={e} activo={f.eje === e} onClick={() => setF({ ...f, eje: f.eje === e ? null : e })}>{e}</Chip>
          ))}
          <span className="ml-2 text-sm font-medium text-slate-600">Competencia:</span>
          <Chip activo={!f.ce} onClick={() => setF({ ...f, ce: null })}>Todas</Chip>
          {uc.competenciasEspecificas.map((ce) => (
            <Chip key={ce.codigo} title={ce.texto} activo={f.ce === ce.codigo} onClick={() => setF({ ...f, ce: f.ce === ce.codigo ? null : ce.codigo })}>
              {ce.codigo}
            </Chip>
          ))}
        </div>
      </div>

      <div className={vista === 'comparar' ? 'grid gap-6 lg:grid-cols-2' : ''}>
        {visibles.map((g) => (
          <PanelGrado key={g.grado} uc={uc} grado={g} f={f} />
        ))}
      </div>
    </div>
  );
}
