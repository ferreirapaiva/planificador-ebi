import type { Planificacion } from '../datos/db';

export type PropsPaso = {
  plan: Planificacion;
  cambiar: (parcial: Partial<Planificacion>) => void;
};

export const alternar = <T,>(lista: T[], item: T, incluir: boolean) =>
  incluir ? (lista.includes(item) ? lista : [...lista, item]) : lista.filter((x) => x !== item);
