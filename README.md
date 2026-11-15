# Planificador EBI

App web para crear planificaciones docentes a partir de los programas de Educación Básica Integrada (Uruguay). Ver el plan completo en [PLAN_DE_DESARROLLO.md](PLAN_DE_DESARROLLO.md).

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
- `data/programas/tramo-3/*.json` — programas estructurados (uno por unidad curricular).
- `src/datos/esquema.ts` — modelo de datos y validaciones.
- `src/paginas/` — pantallas de la app.

## Revisar un programa contra el PDF

Con `npm run dev` abierto, entrar a http://localhost:5173/herramientas/ver-pdf.html para ver cualquier página de los PDF de `PROGRAMAS/` y compararla con la app. Cada programa muestra en la app un aviso amarillo con lo que conviene verificar (`notasRevision` en su JSON).

## Cargar un programa nuevo

1. `npm run extraer` y abrir el `.txt` correspondiente en `data/raw/`.
2. Crear `data/programas/tramo-3/<id>.json` siguiendo `matematica.json` como modelo, con `"revisado": false`.
3. `npm run validar` hasta que no haya errores.
4. Agregarlo a `src/datos/programas.ts`.
5. Compararlo con el PDF y, si está todo bien, cambiar a `"revisado": true`.
