// Extrae el texto de cada PDF de PROGRAMAS/ a data/raw/<nombre>.txt, con marcas de página.
// Uso: npm run extraer
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const ORIGEN = path.resolve('PROGRAMAS');
const DESTINO = path.resolve('data/raw');
await mkdir(DESTINO, { recursive: true });

for (const nombre of (await readdir(ORIGEN)).filter((n) => n.toLowerCase().endsWith('.pdf'))) {
  const datos = new Uint8Array(await readFile(path.join(ORIGEN, nombre)));
  const pdf = await getDocument({ data: datos, verbosity: 0 }).promise;
  let salida = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const { items } = await (await pdf.getPage(i)).getTextContent();
    salida += `\n=== [página ${i}] ===\n`;
    let linea = '';
    let ultimaY = null;
    for (const it of items) {
      if (!('str' in it)) continue;
      const y = Math.round(it.transform[5]);
      if (ultimaY !== null && Math.abs(y - ultimaY) > 2) {
        salida += linea.trimEnd() + '\n';
        linea = '';
      }
      linea += it.str;
      ultimaY = y;
      if (it.hasEOL) {
        salida += linea.trimEnd() + '\n';
        linea = '';
        ultimaY = null;
      }
    }
    salida += linea.trimEnd() + '\n';
  }
  const archivo = nombre.replace(/\.pdf$/i, '.txt');
  await writeFile(path.join(DESTINO, archivo), salida.replace(/\n{3,}/g, '\n\n'), 'utf8');
  console.log(`✔ ${nombre}: ${pdf.numPages} páginas`);
}
