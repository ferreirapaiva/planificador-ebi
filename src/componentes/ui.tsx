import type { ReactNode } from 'react';

const CAMPO = 'mt-1 w-full min-h-11 rounded-[14px] border-[1.5px] border-slate-200 bg-white px-3.5 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none';

export function Campo({
  etiqueta,
  ayuda,
  valor,
  onCambio,
  tipo = 'text',
  placeholder,
}: {
  etiqueta: string;
  ayuda?: string;
  valor: string;
  onCambio: (v: string) => void;
  tipo?: 'text' | 'date';
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{etiqueta}</span>
      <input type={tipo} value={valor} placeholder={placeholder} onChange={(e) => onCambio(e.target.value)} className={CAMPO} />
      {ayuda && <span className="mt-1 block text-xs text-slate-500">{ayuda}</span>}
    </label>
  );
}

export function AreaTexto({
  etiqueta,
  ayuda,
  valor,
  onCambio,
  filas = 3,
  placeholder,
}: {
  etiqueta: string;
  ayuda?: string;
  valor: string;
  onCambio: (v: string) => void;
  filas?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{etiqueta}</span>
      <textarea rows={filas} value={valor} placeholder={placeholder} onChange={(e) => onCambio(e.target.value)} className={CAMPO} />
      {ayuda && <span className="mt-1 block text-xs text-slate-500">{ayuda}</span>}
    </label>
  );
}

/** Tarjeta seleccionable con casilla: el patrón principal para elegir ítems del programa. */
export function TarjetaCasilla({
  marcada,
  onCambio,
  children,
  destacada,
}: {
  marcada: boolean;
  onCambio: (v: boolean) => void;
  children: ReactNode;
  destacada?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3.5 rounded-[20px] px-[18px] py-4 transition ${
        marcada
          ? 'border-2 border-blue-600 bg-blue-100 shadow-suave'
          : destacada
            ? 'border-[1.5px] border-menta-500/60 bg-menta-50 hover:border-menta-500'
            : 'border-[1.5px] border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      <input type="checkbox" checked={marcada} onChange={(e) => onCambio(e.target.checked)} className="mt-0.5 h-[22px] w-[22px] shrink-0 accent-blue-600" />
      <span className={`text-[15px] leading-relaxed text-slate-900 ${marcada ? 'font-semibold' : ''}`}>{children}</span>
    </label>
  );
}

export function Boton({
  children,
  onClick,
  variante = 'primario',
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variante?: 'primario' | 'secundario' | 'peligro' | 'texto';
  disabled?: boolean;
  title?: string;
}) {
  const estilos = {
    primario: 'min-h-11 rounded-full bg-blue-600 px-5 text-white shadow-[0_8px_20px_rgb(91_75_245/0.28)] hover:bg-blue-700 disabled:bg-blue-300 disabled:shadow-none',
    secundario: 'min-h-11 rounded-full border-[1.5px] border-slate-200 bg-white px-5 text-slate-900 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50',
    peligro: 'min-h-11 rounded-full border-[1.5px] border-red-200 bg-white px-5 text-red-700 hover:bg-red-50',
    texto: 'rounded-lg px-1 text-blue-700 hover:underline',
  }[variante];
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={`inline-flex items-center justify-center gap-2 text-sm font-extrabold transition ${estilos}`}>
      {children}
    </button>
  );
}

export function Aviso({ children, tono = 'info' }: { children: ReactNode; tono?: 'info' | 'exito' | 'alerta' }) {
  const estilos = {
    info: 'bg-blue-100 text-blue-900',
    exito: 'bg-menta-50 text-menta-700',
    alerta: 'bg-amarillo-50 text-amarillo-800',
  }[tono];
  return <div className={`rounded-[18px] px-4 py-3 text-sm leading-relaxed ${estilos}`}>{children}</div>;
}

export function Pildora({ children, activa, onClick }: { children: ReactNode; activa: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-bold transition ${
        activa ? 'bg-slate-900 text-white' : 'border-[1.5px] border-slate-200 bg-white text-slate-700 hover:border-blue-400'
      }`}
    >
      {children}
    </button>
  );
}
