import { Icono } from './Iconos';

/** Indicador de avance de un asistente: hecho (menta con tilde), actual (violeta con anillo) y pendiente. */
export function Pasos({
  pasos,
  actual,
  onIr,
  puedeIr = () => true,
}: {
  pasos: { titulo: string; pregunta: string }[];
  actual: number;
  onIr: (i: number) => void;
  puedeIr?: (i: number) => boolean;
}) {
  return (
    <nav aria-label="Pasos" className="no-imprimir rounded-[24px] bg-white px-4 py-4 shadow-suave sm:px-[22px]">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2.5 gap-y-3 p-0">
        {pasos.map((p, i) => {
          const hecho = i < actual;
          const esActual = i === actual;
          return (
            <li key={p.titulo} className={`flex items-center gap-2.5 ${i < pasos.length - 1 ? 'flex-[1_1_130px]' : 'flex-[0_1_auto]'}`}>
              <button
                type="button"
                onClick={() => puedeIr(i) && onIr(i)}
                aria-current={esActual ? 'step' : undefined}
                title={p.pregunta}
                className="flex items-center gap-2.5 rounded-full text-left disabled:cursor-not-allowed"
                disabled={!puedeIr(i)}
              >
                <span
                  className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[15px] font-black ${
                    hecho
                      ? 'bg-menta-500 text-white'
                      : esActual
                        ? 'bg-blue-600 text-white shadow-[0_0_0_5px_rgb(91_75_245/0.22)]'
                        : 'border-2 border-slate-200 text-slate-500'
                  }`}
                >
                  {hecho ? <Icono nombre="check" tamano={18} grosor={2.6} /> : i + 1}
                </span>
                <span className="flex flex-col">
                  <span
                    className={`text-[11px] font-extrabold tracking-[0.08em] uppercase ${hecho ? 'text-menta-700' : esActual ? 'text-blue-600' : 'text-slate-500'}`}
                  >
                    Paso {i + 1}
                  </span>
                  <span className={`text-[13px] ${hecho || esActual ? 'font-extrabold text-slate-900' : 'font-bold text-slate-500'}`}>{p.titulo}</span>
                </span>
              </button>
              {i < pasos.length - 1 && <span aria-hidden="true" className={`h-[3px] min-w-3 flex-1 rounded ${hecho ? 'bg-menta-500' : 'bg-slate-200'}`} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
