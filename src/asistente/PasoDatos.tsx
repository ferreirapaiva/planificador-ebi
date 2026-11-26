import { TIPOS, type TipoPlanificacion } from '../datos/db';
import { ESPACIOS, PROGRAMAS } from '../datos/programas';
import { Aviso, Campo, Pildora, TarjetaCasilla } from '../componentes/ui';
import { alternar, type PropsPaso } from './tipos';
import { Icono } from '../componentes/Iconos';
import { CampoGrupo } from '../componentes/CampoGrupo';

export function PasoDatos({ plan, cambiar }: PropsPaso) {
  const multigrado = plan.grados.length > 1;
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 font-semibold text-slate-900">¿Qué vas a planificar?</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(TIPOS) as TipoPlanificacion[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={plan.tipo === t}
              onClick={() => cambiar({ tipo: t })}
              className={`flex flex-col items-start gap-1.5 rounded-[20px] p-[18px] text-left transition ${
                plan.tipo === t ? 'border-2 border-blue-600 bg-blue-100 shadow-suave' : 'border-[1.5px] border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <span className={`mb-1 flex h-11 w-11 items-center justify-center rounded-[14px] ${plan.tipo === t ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                <Icono nombre={TIPOS[t].icono} tamano={22} grosor={2.2} />
              </span>
              <span className="block text-[17px] font-extrabold text-slate-900">{TIPOS[t].nombre}</span>
              <span className="text-sm text-slate-600">{TIPOS[t].descripcion}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo
            etiqueta="Título"
            valor={plan.titulo}
            onCambio={(v) => cambiar({ titulo: v })}
            placeholder={plan.tipo === 'proyecto' ? 'Ej.: ¿De dónde viene el agua que tomamos?' : 'Ej.: Las fracciones en la vida cotidiana'}
          />
        </div>
        <Campo etiqueta="Docente" valor={plan.docente} onCambio={(v) => cambiar({ docente: v })} />
        <Campo etiqueta="Escuela" valor={plan.escuela} onCambio={(v) => cambiar({ escuela: v })} placeholder="Ej.: Escuela N.º 123, Montevideo" />
        <CampoGrupo valor={plan} onCambio={cambiar} />
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Desde" tipo="date" valor={plan.desde} onCambio={(v) => cambiar({ desde: v })} />
          <Campo etiqueta="Hasta" tipo="date" valor={plan.hasta} onCambio={(v) => cambiar({ hasta: v })} />
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-slate-900">Grado</h3>
        <div className="flex flex-wrap gap-2">
          <Pildora activa={!multigrado && plan.grados[0] === 3} onClick={() => cambiar({ grados: [3] })}>3.º</Pildora>
          <Pildora activa={!multigrado && plan.grados[0] === 4} onClick={() => cambiar({ grados: [4] })}>4.º</Pildora>
          <Pildora activa={multigrado} onClick={() => cambiar({ grados: [3, 4] })}>3.º y 4.º (multigrado)</Pildora>
        </div>
        {multigrado && (
          <p className="mt-2 text-sm text-slate-600">En los pasos siguientes vas a elegir criterios y contenidos de cada grado por separado.</p>
        )}
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-slate-900">Unidades curriculares</h3>
        <p className="mb-3 text-sm text-slate-600">Podés elegir varias para una propuesta interdisciplinaria.</p>
        <div className="space-y-4">
          {ESPACIOS.map((esp) => (
            <div key={esp.nombre}>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className={`h-2.5 w-2.5 rounded-full ${esp.color}`} aria-hidden /> {esp.nombre}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {PROGRAMAS.filter((p) => p.espacio === esp.nombre).map((p) => (
                  <TarjetaCasilla key={p.id} marcada={plan.ucIds.includes(p.id)} onCambio={(v) => cambiar({ ucIds: alternar(plan.ucIds, p.id, v) })}>
                    {p.nombre}
                  </TarjetaCasilla>
                ))}
              </div>
            </div>
          ))}
        </div>
        {plan.ucIds.length > 1 && (
          <div className="mt-3">
            <Aviso tono="exito">Propuesta interdisciplinaria con {plan.ucIds.length} unidades curriculares.</Aviso>
          </div>
        )}
      </section>
    </div>
  );
}
