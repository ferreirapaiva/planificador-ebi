import { useEffect, useState } from 'react';

/** Tema de la app: claro, oscuro o el del sistema (automático). Se recuerda en este equipo y también lo usan las hojas de actividades. */
export type Tema = 'claro' | 'oscuro' | 'auto';

const CLAVE = 'planificador-ebi:tema';
const EVENTO = 'planificador-ebi:tema';
export const TEMAS: { valor: Tema; etiqueta: string }[] = [
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
  { valor: 'auto', etiqueta: 'Automático' },
];

export function leerTema(): Tema {
  try {
    const t = localStorage.getItem(CLAVE);
    return t === 'claro' || t === 'oscuro' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

const sistemaOscuro = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
export const esOscuro = (t: Tema) => t === 'oscuro' || (t === 'auto' && sistemaOscuro());

/** Pone el tema en la página (y el color de la barra del navegador). */
export function aplicarTema(t: Tema) {
  const oscuro = esOscuro(t);
  document.documentElement.dataset.theme = oscuro ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#12102a' : '#1d4ed8');
}

export function guardarTema(t: Tema) {
  try {
    if (t === 'auto') localStorage.removeItem(CLAVE);
    else localStorage.setItem(CLAVE, t);
  } catch {
    /* sin almacenamiento disponible: el tema vale solo hasta cerrar la página */
  }
  aplicarTema(t);
  window.dispatchEvent(new Event(EVENTO));
}

export const siguienteTema = (t: Tema): Tema => (t === 'claro' ? 'oscuro' : t === 'oscuro' ? 'auto' : 'claro');

/** Tema elegido y su efecto: con «automático» sigue al sistema aunque cambie con la app abierta. */
export function useTema() {
  const [tema, setTema] = useState<Tema>(leerTema);
  useEffect(() => {
    aplicarTema(tema);
    const leer = () => setTema(leerTema());
    const sistema = window.matchMedia?.('(prefers-color-scheme: dark)');
    const alCambiarSistema = () => aplicarTema(leerTema());
    window.addEventListener(EVENTO, leer);
    window.addEventListener('storage', leer);
    sistema?.addEventListener('change', alCambiarSistema);
    return () => {
      window.removeEventListener(EVENTO, leer);
      window.removeEventListener('storage', leer);
      sistema?.removeEventListener('change', alCambiarSistema);
    };
  }, [tema]);
  return { tema, elegir: guardarTema, esOscuro: esOscuro(tema) };
}
