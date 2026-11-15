import { useState } from 'react';
import { claseVacia, type Clase } from '../datos/db';
import { buscarUC } from '../datos/consultas';
import { AreaTexto, Aviso, Boton, Campo, Pildora } from '../componentes/ui';
import { alternar, type PropsPaso } from './tipos';

const METODOLOGIAS_GENERALES = [
  'Aprendizaje basado en proyectos',
  'Aprendizaje basado en problemas',
  'Estudio de caso',
  'Aula invertida',
  'Trabajo colaborativo',
  'Gamificación',
  'STEAHM',
  'Salida didáctica',
];

function EditorClase({
  clase,
  numero,
  total,
  onCambio,
  onMover,
  onBorrar,
}: {
  clase: Clase;
  numero: number;
  total: number;
  onCambio: (c: Clase) => void;
  onMover: (delta: number) => void;
  onBorrar: () => void;
}) {
  const [abierta, setAbierta] = useState(numero === total);
  const set = (k: keyof Clase) => (v: string) => onCambio({ ...clase, [k]: v });
  return (
    <div className="rounded-[20px] border-[1.5px] border-slate-200 bg-white">
      <div className="flex items-center gap-2 p-3">
        <button type="button" onClick={() => setAbierta(!abierta)} aria-expanded={abierta} className="flex flex-1 items-center gap-2 text-left font-semibold text-slate-900">
          <span aria-hidden>{abierta ? '▾' : '▸'}</span>
          {clase.titulo || `Clase ${numero}`}
          {clase.fecha && <span className="text-sm font-normal text-slate-500">· {clase.fecha}</span>}
        </button>
        <button type="button" title="Subir" aria-label="Subir clase" disabled={numero === 1} onClick={() => onMover(-1)} className="px-2 text-slate-500 disabled:opacity-30">↑</button>
        <button type="button" title="Bajar" aria-label="Bajar clase" disabled={numero === total} onClick={() => onMover(1)} className="px-2 text-slate-500 disabled:opacity-30">↓</button>
        <button type="button" title="Eliminar" aria-label="Eliminar clase" onClick={onBorrar} className="px-2 text-slate-400 hover:text-red-600">✕</button>
      </div>
      {abierta && (
        <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-3">
          <Campo etiqueta="Título" valor={clase.titulo} onCambio={set('titulo')} />
          <Campo etiqueta="Fecha" tipo="date" valor={clase.fecha} onCambio={set('fecha')} />
          <Campo etiqueta="Duración" valor={clase.duracion} onCambio={set('duracion')} placeholder="Ej.: 45 min" />
          <div className="sm:col-span-3">
            <Campo etiqueta="Propósito" valor={clase.proposito} onCambio={set('proposito')} placeholder="¿Qué se busca en esta clase?" />
          </div>
          <AreaTexto etiqueta="Inicio" valor={clase.inicio} onCambio={set('inicio')} placeholder="Disparador, ideas previas…" />
          <AreaTexto etiqueta="Desarrollo" valor={clase.desarrollo} onCambio={set('desarrollo')} placeholder="Actividades, consignas, agrupamientos…" />
          <AreaTexto etiqueta="Cierre" valor={clase.cierre} onCambio={set('cierre')} placeholder="Puesta en común, metacognición…" />
          <AreaTexto etiqueta="Recursos" valor={clase.recursos} onCambio={set('recursos')} filas={2} />
          <div className="sm:col-span-2">
            <AreaTexto etiqueta="Evaluación de la clase" valor={clase.evaluacion} onCambio={set('evaluacion')} filas={2} />
          </div>
        </div>
      )}
    </div>
  );
}

export function PasoEnsenanza({ plan, cambiar }: PropsPaso) {
  const deProgramas = [...new Set(plan.ucIds.flatMap((id) => buscarUC(id)?.metodologiasSugeridas ?? []))];
  const opciones = [...new Set([...deProgramas, ...METODOLOGIAS_GENERALES, ...plan.metodologias])];
  const [otra, setOtra] = useState('');
  const moverClase = (i: number, d: number) => {
    const c = [...plan.clases];
    [c[i], c[i + d]] = [c[i + d], c[i]];
    cambiar({ clases: c });
  };
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <AreaTexto
          etiqueta={plan.tipo === 'proyecto' ? 'Pregunta o problema que guía el proyecto' : 'Situación inicial o pregunta disparadora'}
          valor={plan.preguntaGuia}
          onCambio={(v) => cambiar({ preguntaGuia: v })}
          placeholder="Ej.: ¿Por qué se inunda el patio cuando llueve?"
        />
        <AreaTexto
          etiqueta={plan.tipo === 'proyecto' ? 'Producto final' : 'Producto o cierre (opcional)'}
          valor={plan.productoFinal}
          onCambio={(v) => cambiar({ productoFinal: v })}
          placeholder="Ej.: Una campaña para la comunidad, una muestra, un libro del grupo…"
        />
      </section>

      <section>
        <h3 className="mb-1 font-semibold text-slate-900">Metodologías</h3>
        <p className="mb-2 text-sm text-slate-600">Las primeras son las que sugieren los programas que elegiste.</p>
        <div className="flex flex-wrap gap-2">
          {opciones.map((m) => (
            <Pildora key={m} activa={plan.metodologias.includes(m)} onClick={() => cambiar({ metodologias: alternar(plan.metodologias, m, !plan.metodologias.includes(m)) })}>
              {m}
            </Pildora>
          ))}
        </div>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (otra.trim()) cambiar({ metodologias: alternar(plan.metodologias, otra.trim(), true) });
            setOtra('');
          }}
        >
          <input value={otra} onChange={(e) => setOtra(e.target.value)} placeholder="Otra metodología…" aria-label="Agregar otra metodología" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          <button type="submit" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Agregar
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900">Clases ({plan.clases.length})</h3>
          <Boton onClick={() => cambiar({ clases: [...plan.clases, claseVacia(plan.clases.length + 1)] })}>+ Agregar clase</Boton>
        </div>
        {plan.clases.length === 0 && (
          <Aviso>Agregá las clases o actividades de tu propuesta. Cada una tiene inicio, desarrollo y cierre.</Aviso>
        )}
        {plan.clases.map((c, i) => (
          <EditorClase
            key={c.id}
            clase={c}
            numero={i + 1}
            total={plan.clases.length}
            onCambio={(nueva) => cambiar({ clases: plan.clases.map((x) => (x.id === c.id ? nueva : x)) })}
            onMover={(d) => moverClase(i, d)}
            onBorrar={() => cambiar({ clases: plan.clases.filter((x) => x.id !== c.id) })}
          />
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <AreaTexto etiqueta="Recursos y materiales" valor={plan.recursos} onCambio={(v) => cambiar({ recursos: v })} />
        <AreaTexto
          etiqueta="Atención a la diversidad"
          ayuda="Pensá en múltiples formas de presentar la información, de que los estudiantes se expresen y de motivarlos (DUA)."
          valor={plan.diversidad}
          onCambio={(v) => cambiar({ diversidad: v })}
        />
      </section>
    </div>
  );
}
