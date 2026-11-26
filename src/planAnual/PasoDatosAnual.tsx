import { calendarioPorDefecto } from '../datos/calendario';
import { nuevoId, type PlanAnual } from '../datos/db';
import { ESPACIOS, PROGRAMAS } from '../datos/programas';
import { AreaTexto, Aviso, Boton, Campo, Pildora, TarjetaCasilla } from '../componentes/ui';
import { fecha } from '../componentes/Documento';
import { alternar } from '../asistente/tipos';
import { useConfirmar } from '../componentes/Confirmar';
import { CampoGrupo } from '../componentes/CampoGrupo';

export type PropsAnual = { plan: PlanAnual; cambiar: (p: Partial<PlanAnual>) => void };

export function PasoDatosAnual({ plan, cambiar }: PropsAnual) {
  const confirmar = useConfirmar();
  const cal = plan.calendario;
  const setCal = (c: Partial<PlanAnual['calendario']>) => cambiar({ calendario: { ...cal, ...c } });
  const multigrado = plan.grados.length > 1;
  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Año lectivo</span>
          <input
            type="number"
            min={2024}
            max={2100}
            value={plan.anio}
            onChange={(e) => cambiar({ anio: Number(e.target.value) || plan.anio })}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <Campo etiqueta="Docente" valor={plan.docente} onCambio={(v) => cambiar({ docente: v })} />
        <Campo etiqueta="Escuela" valor={plan.escuela} onCambio={(v) => cambiar({ escuela: v })} />
        <CampoGrupo valor={plan} onCambio={cambiar} />
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-slate-900">Grado</h3>
        <div className="flex flex-wrap gap-2">
          <Pildora activa={!multigrado && plan.grados[0] === 3} onClick={() => cambiar({ grados: [3] })}>3.º</Pildora>
          <Pildora activa={!multigrado && plan.grados[0] === 4} onClick={() => cambiar({ grados: [4] })}>4.º</Pildora>
          <Pildora activa={multigrado} onClick={() => cambiar({ grados: [3, 4] })}>3.º y 4.º (multigrado)</Pildora>
        </div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h3 className="font-semibold text-slate-900">Unidades curriculares que vas a planificar</h3>
          <Boton variante="texto" onClick={() => cambiar({ ucIds: PROGRAMAS.map((p) => p.id) })}>Todas</Boton>
          <Boton variante="texto" onClick={() => cambiar({ ucIds: [] })}>Ninguna</Boton>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {ESPACIOS.flatMap((esp) => PROGRAMAS.filter((p) => p.espacio === esp.nombre)).map((p) => (
            <TarjetaCasilla key={p.id} marcada={plan.ucIds.includes(p.id)} onCambio={(v) => cambiar({ ucIds: alternar(plan.ucIds, p.id, v) })}>
              {p.nombre}
            </TarjetaCasilla>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900">Calendario escolar {plan.anio}</h3>
          <Boton
            variante="secundario"
            onClick={async () => {
              const ok = await confirmar({
                titulo: '¿Restablecer las fechas sugeridas?',
                mensaje: `Se reemplaza el calendario ${plan.anio} (inicio, fin, períodos sin clases y efemérides) por el sugerido. Los cambios que hiciste se pierden.`,
                aceptar: 'Restablecer',
              });
              if (ok) cambiar({ calendario: calendarioPorDefecto(plan.anio) });
            }}
          >
            Restablecer fechas sugeridas
          </Boton>
        </div>
        <Aviso tono="alerta">
          Las fechas son una sugerencia: Carnaval y Turismo se calculan según la Pascua; el inicio, el fin y las vacaciones de julio y
          primavera son aproximados. Ajustalas con el calendario oficial de ANEP.
        </Aviso>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Inicio de clases" tipo="date" valor={cal.inicio} onCambio={(v) => setCal({ inicio: v })} />
          <Campo etiqueta="Fin de clases" tipo="date" valor={cal.fin} onCambio={(v) => setCal({ fin: v })} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Períodos sin clases</p>
          {cal.sinClases.map((p) => (
            <div key={p.id} className="grid items-end gap-2 sm:grid-cols-[1fr_10rem_10rem_auto]">
              <Campo etiqueta="Nombre" valor={p.nombre} onCambio={(v) => setCal({ sinClases: cal.sinClases.map((x) => (x.id === p.id ? { ...x, nombre: v } : x)) })} />
              <Campo etiqueta="Desde" tipo="date" valor={p.desde} onCambio={(v) => setCal({ sinClases: cal.sinClases.map((x) => (x.id === p.id ? { ...x, desde: v } : x)) })} />
              <Campo etiqueta="Hasta" tipo="date" valor={p.hasta} onCambio={(v) => setCal({ sinClases: cal.sinClases.map((x) => (x.id === p.id ? { ...x, hasta: v } : x)) })} />
              <Boton variante="peligro" onClick={() => setCal({ sinClases: cal.sinClases.filter((x) => x.id !== p.id) })}>Quitar</Boton>
            </div>
          ))}
          <Boton variante="secundario" onClick={() => setCal({ sinClases: [...cal.sinClases, { id: nuevoId(), nombre: 'Sin clases', desde: '', hasta: '' }] })}>
            + Agregar período
          </Boton>
        </div>
        <details className="rounded-lg border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">Efemérides y fechas de referencia ({cal.efemerides.length})</summary>
          <ul className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
            {cal.efemerides.map((e) => (
              <li key={e.fecha + e.nombre}>
                <span className="font-medium text-slate-800">{fecha(e.fecha)}</span> · {e.nombre}
              </li>
            ))}
          </ul>
        </details>
      </section>

      <AreaTexto
        etiqueta="Fundamentación o propósitos del año (opcional)"
        valor={plan.fundamentacion}
        onCambio={(v) => cambiar({ fundamentacion: v })}
        filas={4}
        placeholder="Características del grupo, prioridades del proyecto de centro, ejes del año…"
      />
    </div>
  );
}
