import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { copiaAutomatica } from '../datos/carpeta';
import { pedirAlmacenamientoPersistente } from '../datos/almacenamiento';
import { haceCuanto, useEstadoCopia } from '../datos/copias';
import { Icono } from './Iconos';

/** Al abrir la app: pide la protección del almacenamiento y, si hay una carpeta elegida, guarda la copia del día. */
export function RespaldoAutomatico() {
  useEffect(() => {
    pedirAlmacenamientoPersistente();
    copiaAutomatica();
  }, []);
  return null;
}

/** Tarjeta de la barra lateral: cuándo fue la última copia y si toca hacer una. */
export function TarjetaCopia() {
  const { ultima, dias, vencida, hayDatos } = useEstadoCopia();
  const alDia = hayDatos && ultima && !vencida;
  return (
    <div className={`flex flex-col gap-2.5 rounded-[22px] p-[18px] ${vencida ? 'bg-amarillo-50' : 'bg-gradient-to-br from-blue-100 to-coral-50'}`}>
      <span className={vencida ? 'text-amarillo-800' : alDia ? 'text-menta-700' : 'text-coral-700'}>
        <Icono nombre={alDia ? 'check' : 'estrella'} tamano={24} grosor={alDia ? 2.6 : 2} />
      </span>
      <p className="m-0 text-[15px] leading-snug font-extrabold text-slate-900">
        {vencida ? (ultima ? `Hace ${dias} días que no hacés una copia` : 'Todavía no hiciste una copia') : alDia ? 'Tu copia está al día' : '¿Hiciste tu copia de seguridad?'}
      </p>
      <p className="m-0 text-[13px] leading-snug font-semibold text-slate-600">
        {ultima && dias !== null
          ? `Última copia: ${haceCuanto(dias)}${ultima.cifrada ? ' (con contraseña)' : ''}.`
          : 'Tus planificaciones viven en este equipo. Guardá una copia cada tanto.'}
      </p>
      <Link to="/respaldo" className="inline-flex min-h-11 items-center self-start rounded-full bg-white px-[18px] text-sm font-extrabold text-blue-800 hover:bg-blue-50">
        {vencida ? 'Hacer la copia ahora' : 'Respaldo y seguridad'}
      </Link>
    </div>
  );
}
