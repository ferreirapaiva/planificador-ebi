import type { Contenido } from '../datos/esquema';
import { buscarContenido, buscarCriterio, sugerirContenidos } from '../datos/consultas';
import { Aviso, Boton, TarjetaCasilla } from '../componentes/ui';
import { PestanasUC, type Combinacion } from './PestanasUC';
import { alternar, type PropsPaso } from './tipos';

function Detalle({ c }: { c: Contenido }) {
  return (
    <>
      {c.subitems && (
        <ul className="ml-4 mt-1 list-disc text-slate-600">
          {c.subitems.map((s) => (
            <li key={s.id}>{s.texto}</li>
          ))}
        </ul>
      )}
      {c.profundizacion && <span className="mt-1 block text-xs text-emerald-800">Para profundizar: {c.profundizacion.join(' · ')}</span>}
    </>
  );
}

function ListaContenidos({ combinacion, plan, cambiar, sugeridos }: PropsPaso & { combinacion: Combinacion; sugeridos: Set<string> }) {
  const g = combinacion.uc.grados.find((x) => x.grado === combinacion.grado);
  if (!g) return null;
  const sugeridosAqui = g.bloques.flatMap((b) => b.contenidos.map((c) => c.id)).filter((id) => sugeridos.has(id));
  const faltan = sugeridosAqui.filter((id) => !plan.contenidos.includes(id));
  return (
    <div className="space-y-5">
      {faltan.length > 0 && (
        <Boton variante="secundario" onClick={() => cambiar({ contenidos: [...plan.contenidos, ...faltan] })}>
          ✨ Agregar los {faltan.length} contenidos sugeridos
        </Boton>
      )}
      {g.bloques.map((b) => (
        <div key={b.id}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {b.titulo}
            {b.transversal && ' · transversal'}
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {b.contenidos.map((c) => {
              const sug = sugeridos.has(c.id);
              return (
                <TarjetaCasilla key={c.id} marcada={plan.contenidos.includes(c.id)} destacada={sug} onCambio={(v) => cambiar({ contenidos: alternar(plan.contenidos, c.id, v) })}>
                  {sug && <span className="mr-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Sugerido</span>}
                  {c.texto}
                  <Detalle c={c} />
                </TarjetaCasilla>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PasoContenidos(props: PropsPaso) {
  const { plan } = props;
  const sugeridos = sugerirContenidos(plan.criterios);
  // Criterios sin ningún contenido elegido que se les vincule.
  const sinContenido = plan.criterios.filter((id) => {
    const propios = sugerirContenidos([id]);
    return propios.size > 0 && ![...propios].some((c) => plan.contenidos.includes(c));
  });
  return (
    <div className="space-y-4">
      <Aviso>
        Elegí qué vas a enseñar. Los contenidos marcados como <strong>Sugerido</strong> son los que el programa vincula con los criterios de
        logro que elegiste.
      </Aviso>
      {plan.criterios.length === 0 && <Aviso tono="alerta">Todavía no elegiste criterios de logro: sin ellos no podemos sugerirte contenidos.</Aviso>}
      {sinContenido.length > 0 && plan.contenidos.length > 0 && (
        <Aviso tono="alerta">
          {sinContenido.length} criterio(s) todavía no tienen un contenido asociado. Por ejemplo: «{buscarCriterio(sinContenido[0])?.criterio.texto}»
        </Aviso>
      )}
      <PestanasUC
        ucIds={plan.ucIds}
        grados={plan.grados}
        contar={(c) => plan.contenidos.filter((id) => {
          const r = buscarContenido(id);
          return r?.uc.id === c.uc.id && r.grado === c.grado;
        }).length}
      >
        {(c) => <ListaContenidos key={c.clave} combinacion={c} sugeridos={sugeridos} {...props} />}
      </PestanasUC>
    </div>
  );
}
