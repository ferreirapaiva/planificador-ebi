import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Opciones = { titulo: string; mensaje?: string; aceptar?: string; peligro?: boolean };
type Pedido = Opciones & { resolver: (ok: boolean) => void };

const Contexto = createContext<(o: Opciones) => Promise<boolean>>(async () => false);

/**
 * Confirmación propia de la app. Reemplaza a window.confirm, que algunos navegadores integrados
 * (como el panel de la app de Claude) bloquean y responden siempre "Cancelar".
 */
export function ConfirmarProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const botonCancelar = useRef<HTMLButtonElement>(null);

  const confirmar = useCallback((o: Opciones) => new Promise<boolean>((resolver) => setPedido({ ...o, resolver })), []);
  const responder = (ok: boolean) => {
    pedido?.resolver(ok);
    setPedido(null);
  };

  useEffect(() => {
    if (!pedido) return;
    botonCancelar.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && responder(false);
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  return (
    <Contexto.Provider value={confirmar}>
      {children}
      {pedido && (
        <div className="no-imprimir fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => responder(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmar-titulo"
            aria-describedby="confirmar-mensaje"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirmar-titulo" className="text-lg font-semibold text-slate-900">{pedido.titulo}</h2>
            {pedido.mensaje && <p id="confirmar-mensaje" className="mt-2 text-sm text-slate-600">{pedido.mensaje}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button
                ref={botonCancelar}
                type="button"
                onClick={() => responder(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => responder(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${pedido.peligro ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {pedido.aceptar ?? 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Contexto.Provider>
  );
}

export const useConfirmar = () => useContext(Contexto);
