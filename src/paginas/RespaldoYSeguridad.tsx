import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { estadoAlmacenamiento, pedirAlmacenamientoPersistente } from '../datos/almacenamiento';
import { carpetaDisponible, elegirCarpeta, guardarEnCarpeta, leerCarpeta, permisoCarpeta, quitarCarpeta, ultimaCopiaCarpeta } from '../datos/carpeta';
import { FRECUENCIAS, guardarFrecuencia, haceCuanto, useEstadoCopia } from '../datos/copias';
import { descargarRespaldo, leerRespaldo, NecesitaClave, resumenDe, restaurarDatos, textoDeResumen, type Respaldo } from '../datos/respaldo';
import { Aviso, Boton, Campo, Pildora } from '../componentes/ui';
import { Icono } from '../componentes/Iconos';

const cuandoLargo = (iso: string) => new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
type Mensaje = { texto: string; error?: boolean } | null;

function Tarjeta({ titulo, icono, children }: { titulo: string; icono: 'descargar' | 'carpeta' | 'check' | 'estrella'; children: ReactNode }) {
  return (
    <section className="rounded-[24px] bg-white p-5 shadow-suave sm:p-6">
      <h2 className="flex items-center gap-3 text-[19px] font-extrabold text-slate-900">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-blue-100 text-blue-700"><Icono nombre={icono} tamano={20} grosor={2.2} /></span>
        {titulo}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
const Estado = ({ m }: { m: Mensaje }) => (m ? <p className={`text-sm font-semibold ${m.error ? 'text-red-700' : 'text-menta-700'}`} role="status">{m.texto}</p> : null);

function Descargar() {
  const [proteger, setProteger] = useState(false);
  const [clave, setClave] = useState('');
  const [repetida, setRepetida] = useState('');
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [ocupado, setOcupado] = useState(false);
  const claveOk = !proteger || (clave.length >= 8 && clave === repetida);
  return (
    <Tarjeta titulo="Descargar una copia" icono="descargar">
      <p className="text-sm text-slate-600">
        Se guarda un archivo con todo: planificaciones, planes anuales, horarios, grupos y avance del programa. Guardalo en tu computadora, un pendrive o enviatelo por
        correo: lo mejor es tenerlo en dos lugares.
      </p>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={proteger} onChange={(e) => setProteger(e.target.checked)} className="mt-0.5 h-5 w-5 accent-blue-600" />
        <span className="text-sm text-slate-700"><strong>Protegerla con una contraseña</strong> (recomendado si la guardás en un correo o en la nube: nadie sin la contraseña puede leerla)</span>
      </label>
      {proteger && (
        <div className="space-y-3 rounded-[18px] bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Contraseña (mínimo 8 caracteres)" tipo="password" valor={clave} onCambio={setClave} />
            <Campo etiqueta="Repetí la contraseña" tipo="password" valor={repetida} onCambio={setRepetida} />
          </div>
          {clave && repetida && clave !== repetida && <p className="text-sm font-semibold text-red-700">Las contraseñas no coinciden.</p>}
          <Aviso tono="alerta">Anotá la contraseña en un lugar seguro. <strong>Si la olvidás, la copia no se puede abrir</strong>: no hay forma de recuperarla.</Aviso>
        </div>
      )}
      <Boton
        disabled={!claveOk || ocupado}
        onClick={async () => {
          setOcupado(true);
          setMensaje(null);
          try {
            const n = await descargarRespaldo(proteger ? clave : undefined);
            setMensaje({ texto: `Copia descargada${proteger ? ' y protegida' : ''}: ${textoDeResumen(n)}.` });
            setClave('');
            setRepetida('');
          } catch (e) {
            setMensaje({ texto: (e as Error).message || 'No se pudo hacer la copia.', error: true });
          } finally {
            setOcupado(false);
          }
        }}
      >
        <Icono nombre="descargar" tamano={18} grosor={2.4} />
        {ocupado ? 'Preparando la copia…' : 'Descargar la copia'}
      </Boton>
      <Estado m={mensaje} />
    </Tarjeta>
  );
}

function Restaurar() {
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [clave, setClave] = useState('');
  const [pideClave, setPideClave] = useState(false);
  const [previa, setPrevia] = useState<Respaldo | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [ocupado, setOcupado] = useState(false);

  const abrir = async (f: File, k?: string) => {
    setOcupado(true);
    setMensaje(null);
    setPrevia(null);
    try {
      setPrevia(await leerRespaldo(f, k));
      setPideClave(false);
    } catch (e) {
      if (e instanceof NecesitaClave) setPideClave(true);
      else {
        if (k === undefined) setPideClave(false); // con una contraseña equivocada se deja el campo para volver a probar
        setMensaje({ texto: (e as Error).message, error: true });
      }
    } finally {
      setOcupado(false);
    }
  };
  const limpiar = () => {
    setArchivo(null);
    setClave('');
    setPideClave(false);
    setPrevia(null);
  };

  return (
    <Tarjeta titulo="Restaurar desde una copia" icono="carpeta">
      <p className="text-sm text-slate-600">
        Elegí un archivo de copia. Antes de restaurar te mostramos lo que tiene y comprobamos que no esté dañado. <strong>No se borra nada</strong>: se agrega lo que falta y,
        si algo ya existe, queda la versión más reciente.
      </p>
      <input
        ref={entrada}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="Elegir archivo de copia de seguridad"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          limpiar();
          setArchivo(f);
          abrir(f);
        }}
      />
      <Boton variante="secundario" onClick={() => entrada.current?.click()}>Elegir el archivo de copia…</Boton>
      {archivo && <p className="text-sm text-slate-600">Archivo: <strong>{archivo.name}</strong></p>}
      {pideClave && archivo && (
        <form
          className="flex flex-wrap items-end gap-3 rounded-[18px] bg-slate-50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            abrir(archivo, clave);
          }}
        >
          <div className="min-w-56 flex-1"><Campo etiqueta="Este archivo tiene contraseña" tipo="password" valor={clave} onCambio={setClave} /></div>
          <button type="submit" disabled={!clave || ocupado} className="mb-0.5 min-h-11 rounded-full bg-blue-600 px-5 text-sm font-extrabold text-white hover:bg-blue-700 disabled:bg-blue-300">Abrir la copia</button>
        </form>
      )}
      {previa && (
        <div className="space-y-3 rounded-[18px] bg-menta-50 p-4">
          <p className="text-sm font-semibold text-menta-700"><Icono nombre="check" tamano={16} grosor={2.6} className="mr-1 inline" /> El archivo está bien. Hecha el {cuandoLargo(previa.fecha)}; tiene {textoDeResumen(resumenDe(previa))}.</p>
          <Boton
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true);
              try {
                const r = await restaurarDatos(previa);
                setMensaje({ texto: `Listo: ${r.agregadas} agregadas y ${r.actualizadas} actualizadas. No se borró nada.` });
                setPrevia(null);
                setArchivo(null);
              } catch (e) {
                setMensaje({ texto: (e as Error).message || 'No se pudo restaurar.', error: true });
              } finally {
                setOcupado(false);
              }
            }}
          >
            Restaurar estos datos
          </Boton>
        </div>
      )}
      <Estado m={mensaje} />
    </Tarjeta>
  );
}

function CarpetaAutomatica() {
  const [carpeta, setCarpeta] = useState<Awaited<ReturnType<typeof leerCarpeta>>>(null);
  const [permiso, setPermiso] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    leerCarpeta().then(async (h) => {
      setCarpeta(h);
      setPermiso(h ? await permisoCarpeta(h) : false);
    });
  }, [version]);
  if (!carpetaDisponible())
    return (
      <Tarjeta titulo="Copia automática en una carpeta" icono="carpeta">
        <Aviso>Este navegador no permite guardar copias en una carpeta. Con Chrome o Edge en la computadora sí: abrí la app desde ahí para usarlo.</Aviso>
      </Tarjeta>
    );
  const ultima = ultimaCopiaCarpeta();
  return (
    <Tarjeta titulo="Copia automática en una carpeta" icono="carpeta">
      <p className="text-sm text-slate-600">
        Elegí una carpeta de tu computadora —por ejemplo, una que se sincronice con Google Drive u OneDrive— y la app guarda sola una copia por día cuando la abrís. Se
        conservan las últimas 10. Estas copias no llevan contraseña: la carpeta es tuya.
      </p>
      {carpeta ? (
        <>
          <p className="text-sm text-slate-700">
            Carpeta elegida: <strong>{carpeta.name}</strong>
            {ultima && <> · última copia automática: {cuandoLargo(ultima)}</>}
          </p>
          {!permiso && <Aviso tono="alerta">El navegador necesita que vuelvas a permitir el acceso a la carpeta. Tocá «Guardar una copia ahora» y aceptá el aviso.</Aviso>}
          <div className="flex flex-wrap gap-2">
            <Boton
              onClick={async () => {
                setMensaje(null);
                try {
                  if (!(await permisoCarpeta(carpeta, true))) throw new Error('No se permitió el acceso a la carpeta.');
                  const nombre = await guardarEnCarpeta(carpeta);
                  setMensaje({ texto: `Copia guardada en la carpeta: ${nombre}.` });
                  setVersion((v) => v + 1);
                } catch (e) {
                  setMensaje({ texto: (e as Error).message || 'No se pudo guardar la copia.', error: true });
                }
              }}
            >
              Guardar una copia ahora
            </Boton>
            <Boton
              variante="secundario"
              onClick={async () => {
                try {
                  await elegirCarpeta();
                  setVersion((v) => v + 1);
                } catch {
                  /* se canceló el selector */
                }
              }}
            >
              Cambiar de carpeta
            </Boton>
            <Boton
              variante="peligro"
              onClick={async () => {
                await quitarCarpeta();
                setMensaje(null);
                setVersion((v) => v + 1);
              }}
            >
              Dejar de usarla
            </Boton>
          </div>
        </>
      ) : (
        <Boton
          onClick={async () => {
            setMensaje(null);
            try {
              const h = await elegirCarpeta();
              await guardarEnCarpeta(h);
              setMensaje({ texto: 'Carpeta elegida y primera copia guardada.' });
              setVersion((v) => v + 1);
            } catch (e) {
              if ((e as Error).name !== 'AbortError') setMensaje({ texto: (e as Error).message || 'No se pudo elegir la carpeta.', error: true });
            }
          }}
        >
          <Icono nombre="carpeta" tamano={18} grosor={2.2} />
          Elegir una carpeta
        </Boton>
      )}
      <Estado m={mensaje} />
    </Tarjeta>
  );
}

function ProteccionDelNavegador() {
  const [e, setE] = useState<Awaited<ReturnType<typeof estadoAlmacenamiento>> | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    estadoAlmacenamiento().then(setE);
  }, [version]);
  return (
    <Tarjeta titulo="Protección del navegador" icono="check">
      <p className="text-sm text-slate-600">
        Con la protección activada, el navegador no borra los datos de la app cuando se queda sin espacio. Instalar la app (opción «Instalar» del navegador) ayuda a que
        la conceda.
      </p>
      <p className="text-sm font-semibold text-slate-800">
        {e?.persistente === true && <span className="text-menta-700">Protección activada: tus datos están a salvo de la limpieza automática.</span>}
        {e?.persistente === false && <span className="text-amarillo-800">Protección no activada: hacé copias seguido.</span>}
        {e?.persistente === null && <span className="text-slate-500">Este navegador no informa el estado de la protección.</span>}
        {e?.usado !== undefined && <span className="ml-2 font-normal text-slate-500">Espacio usado: {(e.usado / 1024 / 1024).toFixed(1)} MB</span>}
      </p>
      {e?.persistente === false && (
        <Boton
          variante="secundario"
          onClick={async () => {
            await pedirAlmacenamientoPersistente();
            setVersion((v) => v + 1);
          }}
        >
          Pedir la protección
        </Boton>
      )}
    </Tarjeta>
  );
}

export function RespaldoYSeguridad() {
  const { ultima, dias, frecuencia, vencida, hayDatos } = useEstadoCopia();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Respaldo y seguridad</h1>
        <p className="mt-1 max-w-3xl text-slate-600">
          Tus planificaciones se guardan solo en este navegador y en este equipo. Si se borra el historial, se formatea la computadora o se rompe, se pierden. Con una copia
          de seguridad no perdés nada.
        </p>
      </div>

      <section className={`rounded-[24px] p-5 sm:p-6 ${vencida ? 'bg-amarillo-50' : 'bg-white shadow-suave'}`}>
        <h2 className="text-[19px] font-extrabold text-slate-900">
          {!hayDatos ? 'Todavía no tenés nada para respaldar' : vencida ? (ultima ? `Hace ${dias} días que no hacés una copia` : 'Todavía no hiciste una copia') : 'Tu copia está al día'}
        </h2>
        {ultima && dias !== null && (
          <p className="mt-1 text-sm text-slate-700">
            Última copia: {cuandoLargo(ultima.fecha)} ({haceCuanto(dias)}) · {ultima.origen === 'carpeta' ? 'guardada en tu carpeta' : 'descargada'}
            {ultima.cifrada ? ' · con contraseña' : ''}.
          </p>
        )}
        <div className="mt-3">
          <span className="text-sm font-bold text-slate-700">Recordármelo</span>
          <div className="mt-1.5 flex flex-wrap gap-2" role="group" aria-label="Cada cuánto recordar la copia">
            {FRECUENCIAS.map((n) => (
              <Pildora key={n} activa={frecuencia === n} onClick={() => guardarFrecuencia(n)}>
                {n === 0 ? 'No recordármelo' : `Cada ${n} días`}
              </Pildora>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Descargar />
        <Restaurar />
        <CarpetaAutomatica />
        <ProteccionDelNavegador />
      </div>

      <Aviso>
        <strong>Consejos:</strong> hacé una copia después de cada semana de trabajo fuerte, guardala en dos lugares distintos (por ejemplo, tu computadora y un pendrive o el
        correo) y probá restaurarla de vez en cuando. ¿Dudas? Mirá{' '}
        <Link to="/como-funciona" className="font-bold text-blue-700 underline">Cómo funciona</Link>.
      </Aviso>
    </div>
  );
}
