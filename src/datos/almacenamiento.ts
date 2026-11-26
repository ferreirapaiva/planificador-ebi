/** Protección del almacenamiento del navegador: con ella, el navegador no borra los datos de la app cuando falta espacio. */
export async function pedirAlmacenamientoPersistente(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function estadoAlmacenamiento(): Promise<{ persistente: boolean | null; usado?: number; cuota?: number }> {
  try {
    const persistente = navigator.storage?.persisted ? await navigator.storage.persisted() : null;
    const e = navigator.storage?.estimate ? await navigator.storage.estimate() : undefined;
    return { persistente, usado: e?.usage, cuota: e?.quota };
  } catch {
    return { persistente: null };
  }
}
