import { Link } from 'react-router-dom';

const OPCIONES = [
  { to: '/nueva', icono: '✏️', titulo: 'Nueva planificación', texto: 'Armá un plan anual, una unidad, una secuencia o la clase de mañana, paso a paso.' },
  { to: '/mis-planificaciones', icono: '🗂️', titulo: 'Mis planificaciones', texto: 'Retomá, duplicá o exportá lo que ya hiciste.' },
  { to: '/programas', icono: '📚', titulo: 'Explorar programas', texto: 'Consultá contenidos, competencias y criterios de logro de 3.º y 4.º.' },
];

export function Inicio() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-slate-900">¡Hola! ¿Qué querés hacer hoy?</h1>
        <p className="mt-2 text-slate-600">
          Planificaciones alineadas a los programas de Educación Básica Integrada — Tramo 3 (3.º y 4.º grado).
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-3">
        {OPCIONES.map((o) => (
          <Link
            key={o.to}
            to={o.to}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          >
            <div className="text-4xl" aria-hidden>{o.icono}</div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900 group-hover:text-blue-700">{o.titulo}</h2>
            <p className="mt-1 text-sm text-slate-600">{o.texto}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
