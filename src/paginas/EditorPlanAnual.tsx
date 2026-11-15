import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { calendarioPorDefecto } from '../datos/calendario';
import { db, guardarPerfil, leerPerfil, type PlanAnual } from '../datos/db';
import { planAnualVacio } from '../datos/planAnual';
import { Boton } from '../componentes/ui';
import { Pasos } from '../componentes/Pasos';
import { Icono } from '../componentes/Iconos';
import { PasoDatosAnual } from '../planAnual/PasoDatosAnual';
import { PasoDistribucion } from '../planAnual/PasoDistribucion';
import { PasoCobertura } from '../planAnual/PasoCobertura';
import { PasoDocumentoAnual } from '../planAnual/DocumentoAnual';

const PASOS = [
  { titulo: 'Datos y calendario', pregunta: 'Grupo, unidades curriculares y calendario del año' },
  { titulo: 'Distribución', pregunta: '¿Qué contenidos trabajo en cada mes?' },
  { titulo: 'Cobertura', pregunta: '¿Qué ya planifiqué y qué me falta?' },
  { titulo: 'Documento', pregunta: 'Revisá, descargá o imprimí' },
];

export function NuevoPlanAnual() {
  const navegar = useNavigate();
  const creado = useRef(false);
  useEffect(() => {
    if (creado.current) return;
    creado.current = true;
    const p = planAnualVacio(leerPerfil());
    db.planesAnuales.add(p).then(() => navegar(`/plan-anual/${p.id}`, { replace: true }));
  }, [navegar]);
  return <p className="text-slate-500">Creando plan anual…</p>;
}

/** Abre el plan anual más reciente o, si no hay ninguno, crea uno. */
export function AbrirPlanAnual() {
  const navegar = useNavigate();
  useEffect(() => {
    db.planesAnuales
      .orderBy('modificada')
      .last()
      .then((p) => navegar(p ? `/plan-anual/${p.id}` : '/nuevo-plan-anual', { replace: true }));
  }, [navegar]);
  return <p className="text-slate-500">Abriendo plan anual…</p>;
}

export function EditorPlanAnual() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [plan, setPlan] = useState<PlanAnual | null | undefined>(undefined);
  const [estado, setEstado] = useState<'guardado' | 'guardando'>('guardado');
  const temporizador = useRef<number | undefined>(undefined);
  const arriba = useRef<HTMLDivElement>(null);
  /** Solo se guarda después de que el docente cambia algo (abrir no guarda ni pisa sus datos recordados). */
  const editado = useRef(false);

  useEffect(() => {
    editado.current = false;
    db.planesAnuales.get(id!).then((p) => setPlan(p ?? null));
  }, [id]);

  useEffect(() => {
    if (!plan || !editado.current) return;
    setEstado('guardando');
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(async () => {
      await db.planesAnuales.put(plan);
      guardarPerfil(plan);
      setEstado('guardado');
    }, 500);
    return () => window.clearTimeout(temporizador.current);
  }, [plan]);

  if (plan === undefined) return <p className="text-slate-500">Cargando…</p>;
  if (plan === null)
    return (
      <p>
        No encontramos ese plan anual. <Link className="text-blue-700 underline" to="/mis-planificaciones">Ver mis planificaciones</Link>
      </p>
    );

  const cambiar = (parcial: Partial<PlanAnual>) => {
    editado.current = true;
    setPlan((p) => {
      if (!p) return p;
      const nuevo = { ...p, ...parcial, modificada: Date.now() };
      // Al cambiar de año, el calendario sugerido se recalcula si todavía era el de otro año.
      if ('anio' in parcial && !nuevo.calendario.inicio.startsWith(String(nuevo.anio))) nuevo.calendario = calendarioPorDefecto(nuevo.anio);
      return nuevo;
    });
  };
  const irAPaso = (n: number) => {
    cambiar({ paso: n });
    arriba.current?.scrollIntoView({ behavior: 'smooth' });
  };
  const paso = plan.paso;
  const props = { plan, cambiar };

  return (
    <div ref={arriba} className="space-y-6">
      <header className="no-imprimir flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan anual</p>
          <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">
            {plan.anio} · {plan.grados.map((g) => `${g}.º`).join(' y ')}
            {plan.grupo && ` · ${plan.grupo}`}
          </h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs ${estado === 'guardado' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} aria-live="polite">
          {estado === 'guardado' ? '✔ Guardado en este equipo' : 'Guardando…'}
        </span>
      </header>

      <Pasos pasos={PASOS} actual={paso} onIr={irAPaso} />

      <section className="rounded-[28px] bg-white p-5 shadow-suave sm:p-7 print:rounded-none print:p-0 print:shadow-none">
        <h2 className="no-imprimir mb-5 text-[26px] font-extrabold tracking-tight text-slate-900">{PASOS[paso].pregunta}</h2>
        {paso === 0 && <PasoDatosAnual {...props} />}
        {paso === 1 && <PasoDistribucion {...props} />}
        {paso === 2 && <PasoCobertura {...props} />}
        {paso === 3 && <PasoDocumentoAnual {...props} />}
      </section>

      <footer className="no-imprimir flex flex-wrap items-center justify-between gap-2">
        <Boton variante="secundario" onClick={() => (paso === 0 ? navegar('/mis-planificaciones') : irAPaso(paso - 1))}>
          <Icono nombre="atras" tamano={18} grosor={2.4} />
          {paso === 0 ? 'Mis planificaciones' : 'Anterior'}
        </Boton>
        {paso < PASOS.length - 1 && (
          <Boton onClick={() => irAPaso(paso + 1)}>
            Siguiente: {PASOS[paso + 1].titulo}
            <Icono nombre="flecha" tamano={18} grosor={2.4} />
          </Boton>
        )}
      </footer>
    </div>
  );
}
