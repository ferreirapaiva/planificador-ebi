// Valida todos los JSON de data/programas contra el esquema. Uso: npm run validar
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { UnidadCurricular, chequearConsistencia } from '../src/datos/esquema.ts';

const raiz = path.resolve('data/programas');
let fallas = 0;
for (const tramo of await readdir(raiz)) {
  for (const archivo of (await readdir(path.join(raiz, tramo))).filter((f) => f.endsWith('.json'))) {
    const nombre = `${tramo}/${archivo}`;
    const r = UnidadCurricular.safeParse(JSON.parse(await readFile(path.join(raiz, tramo, archivo), 'utf8')));
    if (!r.success) {
      fallas++;
      console.log(`✘ ${nombre}`);
      for (const i of r.error.issues) console.log(`   ${i.path.join('.')}: ${i.message}`);
      continue;
    }
    const errores = chequearConsistencia(r.data);
    if (errores.length) {
      fallas++;
      console.log(`✘ ${nombre}`);
      errores.forEach((e) => console.log(`   ${e}`));
      continue;
    }
    const n = r.data.grados.map((g) => `${g.grado}.º: ${g.bloques.length} bloques, ${g.criteriosLogro.length} criterios`).join(' · ');
    console.log(`✔ ${nombre} (${n})${r.data.revisado ? '' : ' — pendiente de revisión humana'}`);
  }
}
process.exit(fallas ? 1 : 0);
