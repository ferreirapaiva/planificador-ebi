import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, leerPerfil, type Grupo } from '../datos/db';
import { grupoNuevo, perteneceAlGrupo, useGrupos } from '../datos/grupos';
import { normalizar } from '../datos/programas';
import { AreaTexto, Aviso, Boton, Campo, Pildora } from '../componentes/ui';
import { alumnosATexto, textoAAlumnos } from '../datos/aula';
import { useConfirmar } from '../componentes/Confirmar';
import { Icono } from '../componentes/Iconos';

function Formulario({ inicial, onGuardar, onCancelar }: { inicial: Grupo; onGuardar: (g: Grupo) => void; onCancelar: () => void }) {
  const [g, setG] = useState(inicial);
  const [lista, setLista] = useState(() => alumnosATexto(inicial.alumnos));
  const nAlumnos = textoAAlumnos(lista).length;
  const set = (p: Partial<Grupo>) => setG((x) => ({ ...x, ...p }));
  const multi = g.grados.length > 1;
  return (
    <form
      className="space-y-4 rounded-[24px] bg-white p-5 shadow-suave"
      onSubmit={(e) => {
        e.preventDefault();
        if (g.nombre.trim()) onGuardar({ ...g, nombre: g.nombre.trim(), alumnos: textoAAlumnos(lista, g.alumnos), modificada: Date.now() });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre del grupo" valor={g.nombre} onCambio={(v) => set({ nombre: v })} placeholder="Ej.: 4.º A" />
        <div>
          <span className="text-sm font-bold text-slate-700">Grado</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Pildora activa={!multi && g.grados[0] === 3} onClick={() => set({ grados: [3] })}>3.º</Pildora>
            <Pildora activa={!multi && g.grados[0] === 4} onClick={() => set({ grados: [4] })}>4.º</Pildora>
            <Pildora activa={multi} onClick={() => set({ grados: [3, 4] })}>Multigrado</Pildora>
          </div>
        </div>
        <Campo etiqueta="Escuela (opcional)" valor={g.escuela} onCambio={(v) => set({ escuela: v })} placeholder="Ej.: Escuela N.º 123" />
        <Campo etiqueta="Docente (opcional)" valor={g.docente} onCambio={(v) => set({ docente: v })} />
      </div>
      <AreaTexto
        etiqueta={`Lista de alumnos${nAlumnos ? ` (${nAlumnos})` : ''}`}
        valor={lista}
        onCambio={setLista}
        filas={8}
        placeholder={'Un nombre por renglón. Podés pegar la lista de la libreta o de una planilla.\nAlmada, Sofía\nBenítez, Mateo'}
        ayuda="Se carga una sola vez y se usa en todo: planillas de tareas, listas de cotejo, carnés y bingo con los nombres, además de la asistencia y los registros de evaluación."
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!g.nombre.trim()}
          className="min-h-11 rounded-full bg-blue-600 px-5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgb(91_75_245/0.28)] hover:bg-blue-700 disabled:bg-blue-300 disabled:shadow-none"
        >
          Guardar grupo
        </button>
        <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
      </div>
    </form>
  );
}

export function Grupos() {
  const { grupos, activo, elegir } = useGrupos();
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const [editando, setEditando] = useState<string | 'nuevo' | null>(null);
  const planificaciones = useLiveQuery(() => db.planificaciones.toArray(), []) ?? [];
  const anuales = useLiveQuery(() => db.planesAnuales.toArray(), []) ?? [];
  const semanales = useLiveQuery(() => db.planesSemanales.toArray(), []) ?? [];

  // Nombres de grupo que ya aparecen en lo que escribiste antes y todavía no son un grupo.
  const sugeridos = (() => {
    const vistos = new Map<string, { nombre: string; grados: number[]; docente: string; escuela: string }>();
    for (const x of [...planificaciones, ...anuales, ...semanales]) {
      const n = x.grupo.trim();
      if (!n || x.grupoId || grupos.some((g) => normalizar(g.nombre.trim()) === normalizar(n))) continue;
      if (!vistos.has(normalizar(n))) vistos.set(normalizar(n), { nombre: n, grados: 'grados' in x ? x.grados : [3], docente: x.docente, escuela: x.escuela });
    }
    return [...vistos.values()];
  })();

  const guardar = async (g: Grupo) => {
    await db.grupos.put(g);
    setEditando(null);
    if (grupos.length === 0) elegir(g.id);
  };
  const eliminar = async (g: Grupo) => {
    const ok = await confirmar({
      titulo: `¿Eliminar el grupo «${g.nombre}»?`,
      mensaje: 'Sus planificaciones y horarios no se borran: quedan sin grupo. Se borran su lista de alumnos, la asistencia, los registros de evaluación, el diario de clase y el avance del programa que marcaste para este grupo.',
      aceptar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    for (const t of [db.planificaciones, db.planesAnuales, db.planesSemanales] as (typeof db.planificaciones)[]) {
      await t.toCollection().filter((x) => x.grupoId === g.id).modify((x) => {
        delete x.grupoId;
      });
    }
    await db.seguimiento.where('grupoKey').equals(g.id).delete();
    await db.asistencia.where('grupoKey').equals(g.id).delete();
    await db.evaluaciones.where('grupoKey').equals(g.id).delete();
    await db.diario.where('grupoKey').equals(g.id).delete();
    await db.grupos.delete(g.id);
    if (activo?.id === g.id) elegir(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Mis grupos</h1>
          <p className="mt-1 max-w-2xl text-slate-600">
            Cargá tus grupos (4.º A, 5.º B…). Al elegir uno en la barra lateral, la app muestra solo sus planificaciones, horarios y avance del programa, y lo que
            creás sale con su grupo, escuela y docente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditando('nuevo')}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgb(91_75_245/0.28)] hover:bg-blue-700"
        >
          <Icono nombre="nueva" tamano={18} grosor={2.4} />
          Agregar grupo
        </button>
      </div>

      {editando === 'nuevo' && <Formulario inicial={grupoNuevo(leerPerfil())} onGuardar={guardar} onCancelar={() => setEditando(null)} />}

      {sugeridos.length > 0 && (
        <Aviso tono="exito">
          <span className="flex flex-wrap items-center gap-2">
            <span>En lo que ya escribiste aparecen estos grupos:</span>
            {sugeridos.map((s) => (
              <Boton
                key={s.nombre}
                variante="secundario"
                onClick={async () => {
                  const g = { ...grupoNuevo({ docente: s.docente, escuela: s.escuela }), nombre: s.nombre, grados: s.grados };
                  await db.grupos.put(g);
                  if (grupos.length === 0) elegir(g.id);
                }}
              >
                + Crear «{s.nombre}»
              </Boton>
            ))}
          </span>
        </Aviso>
      )}

      {grupos.length === 0 && editando !== 'nuevo' ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-[21px] font-extrabold text-slate-900">Todavía no cargaste grupos</p>
          <p className="mt-1 text-slate-600">Si das clase a un solo grupo, no hace falta: podés usar la app sin grupos. Si tenés varios, cargalos para tener todo ordenado.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grupos.map((g) => {
            if (editando === g.id) return <div key={g.id} className="sm:col-span-2 lg:col-span-3"><Formulario inicial={g} onGuardar={guardar} onCancelar={() => setEditando(null)} /></div>;
            const np = planificaciones.filter((x) => perteneceAlGrupo(x, g)).length;
            const na = anuales.filter((x) => perteneceAlGrupo(x, g)).length;
            const ns = semanales.filter((x) => perteneceAlGrupo(x, g)).length;
            return (
              <article key={g.id} className={`flex flex-col rounded-[24px] p-5 shadow-suave ${activo?.id === g.id ? 'bg-blue-100 ring-2 ring-blue-600' : 'bg-white'}`}>
                <p className="m-0 flex items-center gap-2 text-[11px] font-extrabold tracking-[0.08em] text-blue-600 uppercase">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-blue-100 text-blue-700"><Icono nombre="grupo" tamano={18} /></span>
                  {g.grados.map((x) => `${x}.º`).join(' y ')}
                  {activo?.id === g.id && ' · en uso'}
                </p>
                <h2 className="mt-2 text-[21px] font-extrabold text-slate-900">{g.nombre}</h2>
                <p className="mt-1 text-sm text-slate-600">{[g.escuela, g.docente].filter(Boolean).join(' · ') || 'Sin escuela ni docente cargados'}</p>
                <p className="mt-2 text-xs font-semibold text-slate-700">{g.alumnos?.length ? `${g.alumnos.length} alumnos en la lista` : 'Sin lista de alumnos todavía'}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {np} planificaciones · {na} planes anuales · {ns} horarios
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Boton onClick={() => { elegir(g.id); navegar('/mis-planificaciones'); }}>Trabajar con este grupo</Boton>
                  <Boton variante="secundario" onClick={() => { elegir(g.id); navegar('/seguimiento'); }}>Avance del programa</Boton>
                  <Boton variante="secundario" onClick={() => setEditando(g.id)}>Editar</Boton>
                  <Boton variante="peligro" onClick={() => eliminar(g)}>Eliminar</Boton>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
