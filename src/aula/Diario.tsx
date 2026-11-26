import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EntradaDiario } from '../datos/db';
import { diaSiguiente, entradaVacia, fechaCorta, fechaLarga, guardarEntradaDiario, pasarPendiente, useDiario, useEntradaDiario } from '../datos/aula';
import { perteneceAlGrupo, useGrupos } from '../datos/grupos';
import { hoyIso, sumarDias } from '../datos/planSemanal';
import { Aviso, AreaTexto, Boton } from '../componentes/ui';
import { CLASE_FECHA } from './comun';

export function Diario({ grupoKey }: { grupoKey: string }) {
  const { activo } = useGrupos();
  const [fecha, setFecha] = useState(hoyIso);
  const guardada = useEntradaDiario(grupoKey, fecha);
  const todas = useDiario(grupoKey);
  const planes = useLiveQuery(() => db.planesSemanales.toArray(), []) ?? [];
  const [e, setE] = useState<EntradaDiario>(() => entradaVacia(grupoKey, fecha));
  const [mensaje, setMensaje] = useState<{ texto: string; destino?: string } | null>(null);
  const ultima = useRef<number>(0);
  const temporizador = useRef<number>(0);

  // Al cambiar de día (o si algo de afuera cambia el día abierto, como «pasar al día siguiente») se vuelve a leer.
  useEffect(() => {
    if (guardada && guardada.modificada === ultima.current) return;
    setE(guardada ?? entradaVacia(grupoKey, fecha));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardada?.modificada, fecha, grupoKey]);
  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  const cambiar = (p: Partial<EntradaDiario>) => {
    const nueva = { ...e, ...p, pasado: p.pendiente !== undefined && p.pendiente !== e.pendiente ? false : e.pasado };
    setE(nueva);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(async () => {
      ultima.current = await guardarEntradaDiario(nueva);
    }, 500);
  };
  const guardarYa = async (x: EntradaDiario) => {
    window.clearTimeout(temporizador.current);
    ultima.current = await guardarEntradaDiario(x);
    return x;
  };
  const irA = async (f: string) => {
    if (f === fecha) return;
    await guardarYa(e);
    setMensaje(null);
    setFecha(f);
  };

  // Lo que dice el horario de ese día.
  const delHorario = planes
    .filter((p) => perteneceAlGrupo(p, activo))
    .flatMap((p) => p.dias.filter((d) => d.fecha === fecha).flatMap((d) => d.bloques))
    .filter((b) => (b.actividad || b.area).trim() && !/^(recreo|comedor|almuerzo|merienda)$/i.test(b.area.trim()))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const lineaDe = (b: (typeof delHorario)[number]) => [`${b.inicio}${b.fin ? '–' + b.fin : ''}`, b.area, b.actividad].filter((x) => x.trim()).join(' · ');

  // Lo que quedó pendiente en un día anterior y todavía no se pasó.
  const anterior = todas.filter((x) => x.fecha < fecha && x.pendiente.trim() && !x.pasado).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const recientes = [...todas].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-[24px] bg-white p-5 shadow-suave">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Día</span>
            <input type="date" value={fecha} onChange={(ev) => ev.target.value && irA(ev.target.value)} className={`mt-1 block ${CLASE_FECHA}`} />
          </label>
          <Boton variante="secundario" onClick={() => irA(sumarDias(fecha, -1))}>← Anterior</Boton>
          <Boton variante="secundario" onClick={() => irA(sumarDias(fecha, 1))}>Siguiente →</Boton>
          <Boton variante="secundario" onClick={() => irA(hoyIso())}>Hoy</Boton>
        </div>
        <p className="m-0 text-sm font-semibold capitalize text-slate-700">{fechaLarga(fecha)}</p>

        {anterior && (
          <Aviso tono="alerta">
            <span className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1">
                <b>Quedó pendiente el {fechaCorta(anterior.fecha)}:</b> {anterior.pendiente.trim().split('\n').join(' · ')}
              </span>
              <Boton
                variante="secundario"
                onClick={async () => {
                  await guardarYa(e);
                  await pasarPendiente(anterior, fecha);
                  setMensaje({ texto: `Lo pendiente del ${fechaCorta(anterior.fecha)} se agregó a lo planeado de hoy.` });
                }}
              >
                Traerlo a este día
              </Boton>
            </span>
          </Aviso>
        )}

        {delHorario.length > 0 && (
          <div className="rounded-[18px] border-[1.5px] border-slate-200 p-3.5">
            <p className="m-0 text-sm font-bold text-slate-700">Según tu horario de este día</p>
            <ul className="mt-1.5 grid list-none gap-1 p-0 text-sm text-slate-700">
              {delHorario.map((b) => (
                <li key={b.id}>{lineaDe(b)}</li>
              ))}
            </ul>
            <div className="mt-2">
              <Boton variante="secundario" onClick={() => cambiar({ planeado: [e.planeado.trim(), ...delHorario.map(lineaDe)].filter(Boolean).join('\n') })}>Copiar a «Lo planeado»</Boton>
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <AreaTexto etiqueta="Lo que planeé" valor={e.planeado} onCambio={(v) => cambiar({ planeado: v })} filas={7} placeholder="Qué pensabas trabajar hoy." />
          <AreaTexto etiqueta="Lo que hice de verdad" valor={e.hecho} onCambio={(v) => cambiar({ hecho: v })} filas={7} placeholder="Qué se trabajó realmente, cómo respondió el grupo." />
          <AreaTexto etiqueta="Lo que quedó pendiente" valor={e.pendiente} onCambio={(v) => cambiar({ pendiente: v })} filas={7} placeholder="Lo que no llegó a hacerse o hay que retomar." />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Boton
            disabled={!e.pendiente.trim()}
            onClick={async () => {
              const x = await guardarYa(e);
              const sig = diaSiguiente(fecha);
              await pasarPendiente(x, sig);
              setE((y) => ({ ...y, pasado: true }));
              setMensaje({ texto: `Lo pendiente quedó en «Lo planeado» del ${fechaLarga(sig)}.`, destino: sig });
            }}
          >
            Pasar lo pendiente al día siguiente
          </Boton>
          {e.pasado && !mensaje && <span className="text-sm font-semibold text-menta-700">Ya se pasó al día siguiente.</span>}
          <span className="text-xs text-slate-500">Se guarda solo mientras escribís.</span>
        </div>
        {mensaje && (
          <p className="m-0 flex flex-wrap items-center gap-3 text-sm font-semibold text-menta-700" role="status">
            {mensaje.texto}
            {mensaje.destino && <Boton variante="texto" onClick={() => irA(mensaje.destino!)}>Ir a ese día →</Boton>}
          </p>
        )}
      </section>

      {recientes.length > 0 && (
        <section className="space-y-2 rounded-[24px] bg-white p-5 shadow-suave">
          <h2 className="m-0 text-[19px] font-extrabold text-slate-900">Días anteriores</h2>
          <ul className="m-0 grid list-none gap-2 p-0">
            {recientes.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => irA(x.fecha)} className="flex w-full flex-wrap items-baseline gap-x-3 rounded-[14px] border-[1.5px] border-slate-200 px-3.5 py-2 text-left hover:border-blue-300">
                  <b className="text-sm capitalize text-slate-900">{fechaCorta(x.fecha)}</b>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{(x.hecho || x.planeado).split('\n')[0] || 'Sin texto'}</span>
                  {x.pendiente.trim() && <span className={`text-xs font-bold ${x.pasado ? 'text-menta-700' : 'text-coral-700'}`}>{x.pasado ? 'Pendiente pasado' : 'Con pendientes'}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
