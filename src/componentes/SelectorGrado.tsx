import { TRAMOS } from '../datos/programas';
import { Pildora } from './ui';

const iguales = (a: number[], b: readonly number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Grados de 1.º a 6.º agrupados por tramo, con la opción multigrado de cada tramo. */
export function SelectorGrado({ grados, onCambio }: { grados: number[]; onCambio: (grados: number[]) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {TRAMOS.map((t) => (
        <div key={t.tramo} className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-xs font-bold tracking-wide text-slate-500 uppercase">Tramo {t.tramo}</span>
          {t.grados.map((g) => (
            <Pildora key={g} activa={iguales(grados, [g])} onClick={() => onCambio([g])}>
              {g}.º
            </Pildora>
          ))}
          <Pildora activa={iguales(grados, t.grados)} onClick={() => onCambio([...t.grados])}>
            {t.grados.map((g) => `${g}.º`).join(' y ')} (multigrado)
          </Pildora>
        </div>
      ))}
    </div>
  );
}
