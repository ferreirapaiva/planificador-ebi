import type { ReactNode } from 'react';

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
      <span className="text-sm font-medium text-slate-700">{etiqueta}</span>
      <input
        type={tipo}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onCambio(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500"
      />
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
      <span className="text-sm font-medium text-slate-700">{etiqueta}</span>
      <textarea
        rows={filas}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onCambio(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500"
      />
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
      className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
        marcada ? 'border-blue-500 bg-blue-50' : destacada ? 'border-emerald-300 bg-emerald-50/50 hover:border-emerald-400' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <input type="checkbox" checked={marcada} onChange={(e) => onCambio(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />
      <span className="text-sm text-slate-800">{children}</span>
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
    primario: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
    secundario: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50',
    peligro: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
    texto: 'text-blue-700 hover:underline',
  }[variante];
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={`rounded-lg px-4 py-2 text-sm font-medium ${estilos}`}>
      {children}
    </button>
  );
}

export function Aviso({ children, tono = 'info' }: { children: ReactNode; tono?: 'info' | 'exito' | 'alerta' }) {
  const estilos = {
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    exito: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    alerta: 'border-amber-300 bg-amber-50 text-amber-900',
  }[tono];
  return <div className={`rounded-xl border p-3 text-sm ${estilos}`}>{children}</div>;
}

export function Pildora({ children, activa, onClick }: { children: ReactNode; activa: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
        activa ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400'
      }`}
    >
      {children}
    </button>
  );
}
