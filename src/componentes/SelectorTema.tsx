import { siguienteTema, TEMAS, useTema, type Tema } from '../datos/tema';
import { Icono } from './Iconos';

const ICONO: Record<Tema, 'sol' | 'luna' | 'automatico'> = { claro: 'sol', oscuro: 'luna', auto: 'automatico' };

/** Barra lateral: elegir tema claro, oscuro o automático. */
export function SelectorTema() {
  const { tema, elegir } = useTema();
  return (
    <div className="no-imprimir" role="group" aria-label="Tema de la aplicación">
      <span className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.08em] text-slate-500 uppercase">
        <Icono nombre="luna" tamano={14} /> Tema
      </span>
      <div className="flex gap-1 rounded-[14px] bg-slate-100 p-1">
        {TEMAS.map((t) => (
          <button
            key={t.valor}
            type="button"
            aria-pressed={tema === t.valor}
            aria-label={`Tema ${t.etiqueta.toLowerCase()}`}
            onClick={() => elegir(t.valor)}
            className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-1.5 text-[12px] font-extrabold transition ${
              tema === t.valor ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icono nombre={ICONO[t.valor]} tamano={15} />
            {t.valor === 'auto' ? 'Auto' : t.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Celular y tablet: un botón que pasa de un tema al siguiente. */
export function BotonTema() {
  const { tema, elegir } = useTema();
  const nombre = TEMAS.find((t) => t.valor === tema)!.etiqueta.toLowerCase();
  return (
    <button
      type="button"
      onClick={() => elegir(siguienteTema(tema))}
      aria-label={`Tema ${nombre}. Tocá para cambiar.`}
      title={`Tema ${nombre}`}
      className="no-imprimir flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-slate-200 bg-white text-slate-700 hover:border-blue-300"
    >
      <Icono nombre={ICONO[tema]} tamano={20} />
    </button>
  );
}
