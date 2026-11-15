import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icono, type NombreIcono } from './Iconos';

const SECCIONES: { to: string; etiqueta: string; icono: NombreIcono; activa?: (ruta: string) => boolean }[] = [
  { to: '/', etiqueta: 'Inicio', icono: 'inicio', activa: (r) => r === '/' },
  { to: '/nueva', etiqueta: 'Nueva planificación', icono: 'nueva', activa: (r) => r.startsWith('/planificacion/') || r === '/nueva' },
  { to: '/mis-planificaciones', etiqueta: 'Mis planificaciones', icono: 'carpeta' },
  { to: '/plan-anual', etiqueta: 'Plan anual', icono: 'calendario', activa: (r) => r.startsWith('/plan-anual') || r === '/nuevo-plan-anual' },
  { to: '/plan-semanal', etiqueta: 'Plan diario y semanal', icono: 'reloj', activa: (r) => r.startsWith('/plan-semanal') || r === '/nuevo-plan-semanal' },
  { to: '/actividades', etiqueta: 'Hojas de actividades', icono: 'hoja' },
  { to: '/programas', etiqueta: 'Programas', icono: 'libro' },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3 rounded-xl">
      <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-600 to-coral-500 text-white">
        <Icono nombre="check" tamano={22} grosor={2.6} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[17px] font-black text-slate-900">Planificador</span>
        <span className="text-[11px] font-extrabold tracking-[0.08em] text-blue-600 uppercase">EBI · Tramo 3</span>
      </span>
    </Link>
  );
}

export function Marco() {
  const { pathname } = useLocation();
  const esActiva = (s: (typeof SECCIONES)[number]) => (s.activa ? s.activa(pathname) : pathname.startsWith(s.to));
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Escritorio: barra lateral */}
      <aside className="no-imprimir hidden w-[264px] shrink-0 flex-col gap-1.5 border-r border-slate-200 bg-white px-6 pt-7 pb-6 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="px-1.5 pb-6">
          <Logo />
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-1.5">
          {SECCIONES.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              aria-current={esActiva(s) ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-[14px] px-3.5 text-[15px] transition ${
                esActiva(s) ? 'bg-blue-100 font-extrabold text-blue-800' : 'font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icono nombre={s.icono} />
              {s.etiqueta}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="flex flex-col gap-2.5 rounded-[22px] bg-gradient-to-br from-blue-100 to-coral-50 p-[18px]">
          <span className="text-coral-700">
            <Icono nombre="estrella" tamano={24} />
          </span>
          <p className="m-0 text-[15px] leading-snug font-extrabold text-slate-900">¿Hiciste tu copia de seguridad?</p>
          <p className="m-0 text-[13px] leading-snug font-semibold text-slate-600">Tus planificaciones viven en este equipo. Guardá una copia cada tanto.</p>
          <Link
            to="/mis-planificaciones#copia"
            className="inline-flex min-h-11 items-center self-start rounded-full bg-white px-[18px] text-sm font-extrabold text-blue-800 hover:bg-blue-50"
          >
            Descargar copia
          </Link>
        </div>
      </aside>

      {/* Celular y tablet: barra superior con navegación desplazable */}
      <header className="no-imprimir sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center px-4 pt-3 pb-2">
          <Logo />
        </div>
        <nav aria-label="Principal" className="flex gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          {SECCIONES.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              aria-current={esActiva(s) ? 'page' : undefined}
              className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm whitespace-nowrap ${
                esActiva(s) ? 'bg-blue-100 font-extrabold text-blue-800' : 'font-semibold text-slate-600 ring-1 ring-slate-200'
              }`}
            >
              <Icono nombre={s.icono} tamano={18} />
              {s.etiqueta}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
