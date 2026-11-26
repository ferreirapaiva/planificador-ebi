import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, NIVELES_POR_DEFECTO, type RegistroEvaluacion } from '../datos/db';
import { guardarRegistro, instrumentosDe, logrosDeCriterio, registroDesdeInstrumento, registroNuevo, useRegistros, fechaCorta } from '../datos/aula';
import { perteneceAlGrupo, useGrupos } from '../datos/grupos';
import { hoyIso } from '../datos/planSemanal';
import { Aviso, AreaTexto, Boton, Campo } from '../componentes/ui';
import { useConfirmar } from '../componentes/Confirmar';
import { CLASE_FECHA, CLASE_SELECT, type ContextoClase } from './comun';

const colorCelda = (r: RegistroEvaluacion, nivel: number | undefined) =>
  nivel === undefined ? 'bg-white text-slate-500' : nivel >= r.logro ? 'border-menta-500 bg-menta-50 text-menta-700' : 'border-coral-500 bg-coral-50 text-coral-700';

function Editor({ registro, alumnos, onCerrar }: { registro: RegistroEvaluacion; alumnos: ContextoClase['alumnos']; onCerrar: () => void }) {
  const r = registro;
  const cambiar = (p: Partial<RegistroEvaluacion>) => guardarRegistro({ ...r, ...p });
  const poner = (alumnoId: string, i: number, v: string) => {
    const fila = { ...(r.resultados[alumnoId] ?? {}) };
    if (v === '') delete fila[i];
    else fila[i] = Number(v);
    const resultados = { ...r.resultados, [alumnoId]: fila };
    if (!Object.keys(fila).length) delete resultados[alumnoId];
    return cambiar({ resultados });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <Campo etiqueta="Título" valor={r.titulo} onCambio={(v) => cambiar({ titulo: v })} />
        </div>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">Fecha</span>
          <input type="date" value={r.fecha} onChange={(e) => cambiar({ fecha: e.target.value })} className={`mt-1 block ${CLASE_FECHA}`} />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">Se considera logrado desde</span>
          <select value={r.logro} onChange={(e) => cambiar({ logro: Number(e.target.value) })} className={`mt-1 block ${CLASE_SELECT}`}>
            {r.niveles.map((n, i) => (
              <option key={n + i} value={i}>{n}</option>
            ))}
          </select>
        </label>
        <Boton variante="secundario" onClick={onCerrar}>← Volver a los registros</Boton>
      </div>

      <div className="overflow-x-auto rounded-[20px] border-[1.5px] border-slate-200 bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-slate-700">
              <th className="sticky left-0 z-10 min-w-40 bg-white p-3">Alumno</th>
              {r.criterios.map((c, i) => (
                <th key={i} className="min-w-36 p-3 align-bottom font-bold">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alumnos.map((a) => (
              <tr key={a.id} className="border-b border-slate-200">
                <td className="sticky left-0 z-10 bg-white p-2.5 font-semibold text-slate-900">{a.nombre}</td>
                {r.criterios.map((c, i) => {
                  const v = r.resultados[a.id]?.[i];
                  return (
                    <td key={i} className="p-1.5">
                      <select
                        aria-label={`${a.nombre}: ${c}`}
                        value={v ?? ''}
                        onChange={(e) => poner(a.id, i, e.target.value)}
                        className={`min-h-10 w-full rounded-[12px] border-[1.5px] border-slate-200 px-2 text-sm font-bold ${colorCelda(r, v)}`}
                      >
                        <option value="">—</option>
                        {r.niveles.map((n, k) => (
                          <option key={n + k} value={k}>{n}</option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-3 rounded-[24px] bg-white p-5 shadow-suave">
        <h2 className="m-0 text-[19px] font-extrabold text-slate-900">Quién logró cada criterio</h2>
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
          {r.criterios.map((c, i) => {
            const l = logrosDeCriterio(r, alumnos, i);
            const pct = l.evaluados ? Math.round((l.lograron.length / l.evaluados) * 100) : 0;
            return (
              <li key={i} className="rounded-[18px] border-[1.5px] border-slate-200 p-3.5">
                <p className="m-0 font-bold text-slate-900">{c}</p>
                {l.evaluados === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">Todavía sin marcas.</p>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-slate-700">Lo lograron {l.lograron.length} de {l.evaluados} ({pct} %)</p>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                      <div className="h-full rounded-full bg-menta-500" style={{ width: `${pct}%` }} />
                    </div>
                    {l.faltan.length > 0 && <p className="mt-2 text-sm text-slate-700"><b>Falta reforzar:</b> {l.faltan.map((a) => a.nombre).join('; ')}</p>}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Nuevo({ grupoKey, onCrear, onCancelar }: { grupoKey: string; onCrear: (r: RegistroEvaluacion) => void; onCancelar: () => void }) {
  const { activo } = useGrupos();
  const planificaciones = useLiveQuery(() => db.planificaciones.orderBy('modificada').reverse().toArray(), []) ?? [];
  const instrumentos = instrumentosDe(planificaciones.filter((p) => perteneceAlGrupo(p, activo)));
  const [titulo, setTitulo] = useState('');
  const [criterios, setCriterios] = useState('Sumas\nRestas\nPirámides numéricas\nFracciones');
  const [niveles, setNiveles] = useState(NIVELES_POR_DEFECTO.join(', '));
  const lista = criterios.split('\n').map((t) => t.trim()).filter(Boolean);
  const nivs = niveles.split(',').map((t) => t.trim()).filter(Boolean);
  const valido = !!titulo.trim() && lista.length > 0 && nivs.length >= 2;

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-[24px] bg-white p-5 shadow-suave">
        <h2 className="m-0 text-[19px] font-extrabold text-slate-900">Desde una rúbrica de tus planificaciones</h2>
        {instrumentos.length === 0 ? (
          <p className="m-0 text-sm text-slate-600">Cuando armes una rúbrica o una lista de cotejo en el paso «¿Cómo sabré que lo lograron?» de una planificación, aparece acá para registrar los resultados.</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0 md:grid-cols-2">
            {instrumentos.map(({ planificacion, instrumento }) => (
              <li key={instrumento.id} className="flex flex-wrap items-center gap-2 rounded-[16px] border-[1.5px] border-slate-200 p-3">
                <span className="min-w-0 flex-1 basis-40">
                  <b className="block text-[15px] text-slate-900">{instrumento.titulo || 'Rúbrica'}</b>
                  <span className="text-xs text-slate-500">{planificacion.titulo || 'Planificación sin título'} · {instrumento.filas.length} criterios</span>
                </span>
                <Boton onClick={() => onCrear(registroDesdeInstrumento(grupoKey, planificacion, instrumento))}>Usar</Boton>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-3 rounded-[24px] bg-white p-5 shadow-suave">
        <h2 className="m-0 text-[19px] font-extrabold text-slate-900">O armarlo en blanco</h2>
        <Campo etiqueta="Título" valor={titulo} onCambio={setTitulo} placeholder="Ej.: Evaluación de matemática de octubre" />
        <AreaTexto etiqueta="Criterios" valor={criterios} onCambio={setCriterios} filas={5} ayuda="Uno por renglón. Por ejemplo, los temas de la hoja de evaluación." />
        <Campo etiqueta="Niveles" valor={niveles} onCambio={setNiveles} ayuda="Separados por coma, de menor a mayor logro." />
        <div className="flex flex-wrap gap-2">
          <Boton disabled={!valido} onClick={() => onCrear(registroNuevo(grupoKey, { titulo: titulo.trim(), criterios: lista, niveles: nivs, fecha: hoyIso() }))}>Crear registro</Boton>
          <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
        </div>
      </section>
    </div>
  );
}


export function Evaluaciones({ grupoKey, alumnos }: ContextoClase) {
  const registros = useRegistros(grupoKey);
  const confirmar = useConfirmar();
  const [abierto, setAbierto] = useState<string | 'nuevo' | null>(null);
  const actual = registros.find((r) => r.id === abierto);

  if (abierto === 'nuevo') {
    return (
      <Nuevo
        grupoKey={grupoKey}
        onCancelar={() => setAbierto(null)}
        onCrear={async (r) => {
          await guardarRegistro(r);
          setAbierto(r.id);
        }}
      />
    );
  }
  if (actual) return <Editor registro={actual} alumnos={alumnos} onCerrar={() => setAbierto(null)} />;

  const ordenados = [...registros].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.modificada - a.modificada);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="m-0 mr-auto max-w-2xl text-slate-600">Anotá cómo le fue a cada alumno en cada criterio. Con eso ves quién lo logró y quién necesita refuerzo, y se arma el informe para las familias.</p>
        <Boton onClick={() => setAbierto('nuevo')}>+ Nuevo registro</Boton>
      </div>
      {ordenados.length === 0 ? (
        <Aviso>Todavía no hay registros de evaluación. Creá uno desde una rúbrica de tus planificaciones o armalo en blanco con los criterios que quieras.</Aviso>
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {ordenados.map((r) => {
            const evaluados = alumnos.filter((a) => r.resultados[a.id]).length;
            return (
              <li key={r.id} className="flex flex-col rounded-[24px] bg-white p-5 shadow-suave">
                <p className="m-0 text-[11px] font-extrabold tracking-[0.08em] text-blue-600 uppercase">{fechaCorta(r.fecha)}</p>
                <h2 className="mt-1 text-[19px] font-extrabold text-slate-900">{r.titulo}</h2>
                <p className="mt-1 text-sm text-slate-600">{r.criterios.length} criterios · {evaluados} de {alumnos.length} alumnos con resultados</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Boton onClick={() => setAbierto(r.id)}>Abrir</Boton>
                  <Boton
                    variante="peligro"
                    onClick={async () => {
                      if (await confirmar({ titulo: `¿Eliminar «${r.titulo}»?`, mensaje: 'Se borran sus resultados.', aceptar: 'Eliminar', peligro: true })) await db.evaluaciones.delete(r.id);
                    }}
                  >
                    Eliminar
                  </Boton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
