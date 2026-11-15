import { NavLink, Outlet } from 'react-router-dom';

const enlace = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/20 text-white' : 'text-blue-100 hover:bg-white/10'}`;

export function Marco() {
  return (
    <div className="min-h-screen">
      <header className="bg-blue-700 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <NavLink to="/" className="mr-auto text-lg font-bold tracking-tight">
            📘 Planificador EBI
          </NavLink>
          <nav className="flex flex-wrap gap-1" aria-label="Principal">
            <NavLink to="/nueva" className={enlace}>Nueva planificación</NavLink>
            <NavLink to="/mis-planificaciones" className={enlace}>Mis planificaciones</NavLink>
            <NavLink to="/programas" className={enlace}>Programas</NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
