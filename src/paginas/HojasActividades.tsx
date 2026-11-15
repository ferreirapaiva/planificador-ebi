import { Icono } from '../componentes/Iconos';

/**
 * Generador de hojas de actividades (cuentas, sopas, crucigramas, repaso…).
 * Es una página independiente (public/actividades) que se muestra dentro del marco de la app.
 * Guarda sus opciones y temas propios en este navegador.
 */
export function HojasActividades() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Hojas de actividades</h1>
          <p className="mt-1 text-slate-600">Elegí la actividad, ajustala y descargala en PDF lista para imprimir, con su hoja de respuestas.</p>
        </div>
        <a
          href="actividades/index.html"
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-900 hover:border-blue-300 hover:bg-blue-50"
        >
          Abrir en pantalla completa
          <Icono nombre="flecha" tamano={18} grosor={2.4} />
        </a>
      </div>
      <iframe
        src="actividades/index.html"
        title="Generador de hojas de actividades"
        className="h-[calc(100dvh-15rem)] min-h-[34rem] w-full rounded-[28px] border-0 bg-white shadow-suave lg:h-[calc(100dvh-11rem)]"
      />
    </div>
  );
}
