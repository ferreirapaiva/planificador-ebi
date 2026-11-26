import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

const CLAVE_ULTIMA = 'planificador-ebi:ultima-copia';
const CLAVE_FRECUENCIA = 'planificador-ebi:frecuencia-copia';
const CLAVE_POSPONER = 'planificador-ebi:copia-posponer';
const EVENTO = 'planificador-ebi:copias';

export type UltimaCopia = { fecha: string; cifrada: boolean; origen: 'descarga' | 'carpeta' };

const leer = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const escribir = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* sin almacenamiento disponible: no es grave */
  }
  window.dispatchEvent(new Event(EVENTO));
};

export function leerUltimaCopia(): UltimaCopia | null {
  try {
    const c = JSON.parse(leer(CLAVE_ULTIMA) ?? 'null');
    return c && typeof c.fecha === 'string' ? c : null;
  } catch {
    return null;
  }
}
/** Anota que se hizo una copia (descargada o guardada en la carpeta elegida). */
export function registrarCopia(origen: UltimaCopia['origen'], cifrada: boolean) {
  escribir(CLAVE_ULTIMA, JSON.stringify({ fecha: new Date().toISOString(), cifrada, origen } satisfies UltimaCopia));
  escribir(CLAVE_POSPONER, null);
}

/** Cada cuántos días recordar la copia (0 = no recordar). */
export const FRECUENCIAS = [3, 7, 15, 30, 0] as const;
export const leerFrecuencia = () => {
  const n = Number(leer(CLAVE_FRECUENCIA));
  return leer(CLAVE_FRECUENCIA) !== null && (FRECUENCIAS as readonly number[]).includes(n) ? n : 7;
};
export const guardarFrecuencia = (n: number) => escribir(CLAVE_FRECUENCIA, String(n));
export const posponerRecordatorio = (dias = 1) => escribir(CLAVE_POSPONER, String(Date.now() + dias * 86_400_000));

export const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
export const haceCuanto = (dias: number) => (dias <= 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`);

/** Estado de la copia de seguridad: cuándo fue la última y si toca hacer una. Se actualiza solo. */
export function useEstadoCopia() {
  const [, refrescar] = useState(0);
  useEffect(() => {
    const f = () => refrescar((n) => n + 1);
    window.addEventListener(EVENTO, f);
    window.addEventListener('storage', f);
    return () => {
      window.removeEventListener(EVENTO, f);
      window.removeEventListener('storage', f);
    };
  }, []);
  const cuantos = useLiveQuery(async () => (await db.planificaciones.count()) + (await db.planesAnuales.count()) + (await db.planesSemanales.count()), []);
  const ultima = leerUltimaCopia();
  const dias = ultima ? diasDesde(ultima.fecha) : null;
  const frecuencia = leerFrecuencia();
  const hayDatos = (cuantos ?? 0) > 0;
  const pospuesto = Number(leer(CLAVE_POSPONER) ?? 0) > Date.now();
  const vencida = hayDatos && frecuencia > 0 && !pospuesto && (dias === null || dias >= frecuencia);
  return { ultima, dias, frecuencia, hayDatos, vencida };
}
