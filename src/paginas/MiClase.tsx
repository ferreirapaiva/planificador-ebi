import { useSearchParams } from 'react-router-dom';
import { useGrupos } from '../datos/grupos';
import { claveGrupo } from '../datos/seguimiento';
import { Pildora } from '../componentes/ui';
import { Asistencia } from '../aula/Asistencia';
import { Evaluaciones } from '../aula/Evaluaciones';
import { Informe } from '../aula/Informe';
import { Diario } from '../aula/Diario';
import { FaltaLista } from '../aula/comun';

const PESTANAS = [
  { id: 'asistencia', nombre: 'Asistencia', necesitaLista: true },
  { id: 'evaluaciones', nombre: 'Evaluaciones', necesitaLista: true },
  { id: 'informe', nombre: 'Informe para familias', necesitaLista: true },
  { id: 'diario', nombre: 'Diario de clase', necesitaLista: false },
] as const;

export function MiClase() {
  const { activo } = useGrupos();
  const [params, setParams] = useSearchParams();
  const pestana = PESTANAS.find((p) => p.id === params.get('ver')) ?? PESTANAS[0];
  const alumnos = activo?.alumnos ?? [];
  const grupoKey = claveGrupo(activo);
  const falta = pestana.necesitaLista ? FaltaLista({ grupo: activo, alumnos }) : null;
  const ctx = { grupo: activo, grupoKey, alumnos };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Mi clase</h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          La asistencia, los resultados de cada evaluación y el diario de tu grupo{activo ? <b> {activo.nombre}</b> : ''}, todo en un solo lugar.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Secciones de Mi clase">
        {PESTANAS.map((p) => (
          <Pildora key={p.id} activa={p.id === pestana.id} onClick={() => setParams({ ver: p.id }, { replace: true })}>
            {p.nombre}
          </Pildora>
        ))}
      </div>
      {falta ??
        (pestana.id === 'asistencia' ? (
          <Asistencia {...ctx} />
        ) : pestana.id === 'evaluaciones' ? (
          <Evaluaciones {...ctx} />
        ) : pestana.id === 'informe' && activo ? (
          <Informe {...ctx} grupo={activo} />
        ) : (
          <Diario grupoKey={grupoKey} />
        ))}
    </div>
  );
}
