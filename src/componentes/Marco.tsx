import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icono, type NombreIcono } from './Iconos';
import { SelectorGrupo } from './SelectorGrupo';
import { BotonTema, SelectorTema } from './SelectorTema';
import { GuiaInicial } from './GuiaInicial';
import { RespaldoAutomatico, TarjetaCopia } from './TarjetaCopia';

const SECCIONES: { to: string; etiqueta: string; icono: NombreIcono; activa?: (ruta: string) => boolean }[] = [
  { to: '/', etiqueta: 'Inicio', icono: 'inicio', activa: (r) => r === '/' },
  { to: '/nueva', etiqueta: 'Nueva planificación', icono: 'nueva', activa: (r) => r.startsWith('/planificacion/') || r.startsWith('/nueva') || r === '/nuevo-plan-semanal' },
  { to: '/mis-planificaciones', etiqueta: 'Mis planificaciones', icono: 'carpeta', activa: (r) => r.startsWith('/mis-planificaciones') || r.startsWith('/plan-semanal') },
  { to: '/plan-anual', etiqueta: 'Plan anual', icono: 'calendario', activa: (r) => r.startsWith('/plan-anual') || r === '/nuevo-plan-anual' },
  { to: '/clase', etiqueta: 'Mi clase', icono: 'grupo' },
  { to: '/actividades', etiqueta: 'Hojas de actividades', icono: 'hoja' },
  { to: '/seguimiento', etiqueta: 'Avance del programa', icono: 'grafico' },
  { to: '/programas', etiqueta: 'Programas', icono: 'libro' },
  { to: '/como-funciona', etiqueta: 'Cómo funciona', icono: 'ayuda' },
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
      <GuiaInicial />
      <RespaldoAutomatico />
      {/* Escritorio: barra lateral */}
      <aside className="no-imprimir hidden w-[264px] shrink-0 flex-col gap-1.5 border-r border-slate-200 bg-white px-6 pt-7 pb-6 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="px-1.5 pb-4">
          <Logo />
        </div>
        <div className="pb-3">
          <SelectorGrupo />
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
        <SelectorTema />
        <TarjetaCopia />
      </aside>

      {/* Celular y tablet: barra superior con navegación desplazable */}
      <header className="no-imprimir sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <Logo />
          <div className="ml-auto min-w-0 max-w-44 flex-1">
            <SelectorGrupo compacto />
          </div>
          <BotonTema />
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
