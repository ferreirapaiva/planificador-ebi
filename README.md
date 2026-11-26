# Planificador EBI

App web para crear planificaciones docentes a partir de los programas de Educación Básica Integrada (Uruguay). Ver el plan completo en [PLAN_DE_DESARROLLO.md](PLAN_DE_DESARROLLO.md).

**Usar la app:** https://ferreirapaiva.github.io/planificador-ebi/ — se puede instalar (Chrome/Edge: “Instalar”) y funciona sin conexión. Las planificaciones se guardan en cada navegador; usá “Respaldo y seguridad” (copia con contraseña opcional, recordatorios y copia automática en una carpeta) para respaldarlas o pasarlas a otro equipo.

**Publicar cambios:** cada `git push` a `main` vuelve a publicar la app automáticamente (GitHub Actions → GitHub Pages).

Los PDF de los programas (`PROGRAMAS/`) no se suben al repositorio: son documentos de ANEP y quedan solo en el equipo.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala las dependencias (una sola vez). |
| `npm run dev` | Abre la app en http://localhost:5173 |
| `npm run extraer` | Extrae el texto de los PDF de `PROGRAMAS/` a `data/raw/`. |
| `npm run validar` | Verifica que los JSON de `data/programas/` estén completos y sean coherentes. |
| `npm run build` | Genera la versión para publicar en `dist/`. |

## Estructura

- `PROGRAMAS/` — PDF originales.
- `data/raw/` — texto extraído de los PDF (generado).
- `data/programas/tramo-N/*.json` — programas estructurados (uno por unidad curricular y tramo: 2 = 1.º y 2.º, 3 = 3.º y 4.º, 4 = 5.º y 6.º). La app carga automáticamente todos los que estén ahí.
- `src/datos/esquema.ts` — modelo de datos y validaciones.
- `src/paginas/` — pantallas de la app.

## Revisar un programa contra el PDF

Con `npm run dev` abierto, entrar a http://localhost:5173/herramientas/ver-pdf.html para ver cualquier página de los PDF de `PROGRAMAS/` y compararla con la app. Cada programa muestra en la app un aviso amarillo con lo que conviene verificar (`notasRevision` en su JSON).

## Cargar un programa nuevo

1. `npm run extraer` y abrir el `.txt` correspondiente en `data/raw/`.
2. Crear `data/programas/tramo-N/<id>.json` siguiendo `tramo-3/matematica.json` como modelo, con `"revisado": false`. Fuera del Tramo 3 el id lleva el tramo (`matematica-t2`) y los ids internos usan el grado (`mat1-…`).
3. `npm run validar` hasta que no haya errores.
4. (Se carga solo: no hace falta tocar el código.)
5. Compararlo con el PDF y, si está todo bien, cambiar a `"revisado": true`.
