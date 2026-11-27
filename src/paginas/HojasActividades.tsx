import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icono } from '../componentes/Iconos';

type Aviso = { texto: string; clase: string; n: number };

/**
 * Generador de hojas de actividades (cuentas, sopas, crucigramas, repaso…).
 * Es una página independiente (public/actividades) que se muestra dentro del marco de la app.
 * Guarda sus opciones y temas propios en este navegador.
 *
 * El marco crece con el contenido (el generador avisa su altura), así la página se desplaza
 * una sola vez y no hay un scroll dentro de otro en el celular. Por eso la barra inferior
 * («Ver hoja» / «Descargar PDF») y los avisos del generador los muestra esta página.
 */
export function HojasActividades() {
  // Si se llega desde una clase del plan semanal, se pasa el tema al generador (?q=…&c=…&uc=…).
  const [params] = useSearchParams();
  const vinculo = ['q', 'c', 'uc'].filter((k) => params.get(k)).map((k) => `${k}=${encodeURIComponent(params.get(k) ?? '')}`).join('&');
  const destino = `actividades/index.html${vinculo ? `?${vinculo}` : ''}`;
  const marco = useRef<HTMLIFrameElement>(null);
  const [alto, setAlto] = useState<number | null>(null);
  const [movil, setMovil] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    const alRecibir = (e: MessageEvent) => {
      if (!marco.current || e.source !== marco.current.contentWindow) return;
      const d = e.data;
      if (d?.tipo === 'hojas-altura' && typeof d.alto === 'number') {
        setAlto(d.alto);
        if (typeof d.movil === 'boolean') setMovil(d.movil);
      } else if (d?.tipo === 'hojas-aviso' && typeof d.texto === 'string') {
        setAviso((a) => ({ texto: d.texto, clase: typeof d.clase === 'string' ? d.clase : '', n: (a?.n ?? 0) + 1 }));
      }
    };
    window.addEventListener('message', alRecibir);
    return () => window.removeEventListener('message', alRecibir);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  const accion = (a: 'ver' | 'descargar') => marco.current?.contentWindow?.postMessage({ tipo: 'hojas-accion', accion: a }, '*');

  return (
    <div className={`flex flex-col gap-3 ${movil ? 'pb-20' : ''}`}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 sm:text-[30px]">Hojas de actividades</h1>
          <p className="mt-1 text-slate-600">Elegí la actividad, ajustala y descargala en PDF lista para imprimir, con su hoja de respuestas.</p>
        </div>
        <a
          href={destino}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-900 hover:border-blue-300 hover:bg-blue-50"
        >
          Abrir en pantalla completa
          <Icono nombre="flecha" tamano={18} grosor={2.4} />
        </a>
      </div>
      <iframe
        ref={marco}
        src={destino}
        key={destino}
        title="Generador de hojas de actividades"
        style={alto ? { height: `${alto}px` } : undefined}
        className="h-[calc(100dvh-11rem)] min-h-[34rem] w-full border-0 bg-transparent"
      />

      {/* Celular y tablet: acciones siempre a mano */}
      {movil && (
        <div className="no-imprimir fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-slate-200 bg-white/95 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur lg:left-[264px]">
          <button
            type="button"
            onClick={() => accion('ver')}
            className="min-h-12 flex-1 rounded-full border-[1.5px] border-slate-200 bg-white px-3 text-[15px] font-extrabold text-slate-900"
          >
            Ver hoja
          </button>
          <button
            type="button"
            onClick={() => accion('descargar')}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 px-3 text-[15px] font-extrabold text-white shadow-suave"
          >
            <Icono nombre="descargar" tamano={18} grosor={2.4} />
            Descargar PDF
          </button>
        </div>
      )}

      {aviso && (
        <div
          key={aviso.n}
          role="status"
          className={`no-imprimir fixed left-1/2 z-30 w-max max-w-[min(92vw,520px)] -translate-x-1/2 rounded-xl px-4 py-2.5 text-center text-sm font-bold text-white shadow-elevada ${
            movil ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]' : 'bottom-6'
          } ${aviso.clase === 'err' ? 'bg-red-600' : aviso.clase === 'ok' ? 'bg-emerald-600' : 'bg-[#1b1840]'}`}
        >
          {aviso.texto}
        </div>
      )}
    </div>
  );
}
