# Plan de desarrollo — App de Planificación Docente (EBI · Uruguay)

> Aplicación para que maestros y maestras uruguayos creen planificaciones (anuales, de unidad/proyecto, secuencias y planes diarios) a partir de los **Programas de Educación Básica Integrada (EBI)** ya cargados en `PROGRAMAS/`, alineados al **Marco Curricular Nacional (MCN)**.

---

## 1. Punto de partida: qué hay en los programas

En `PROGRAMAS/` hay 10 programas del **Tramo 3 (3.º y 4.º grado)**:

| Espacio curricular | Unidades curriculares |
|---|---|
| Científico-Matemático | Matemática, Física-Química, Ciencias del Ambiente (Biología), Ciencias de la Tierra y el Espacio |
| Ciencias Sociales y Humanidades | Historia, Geografía, Formación para la Ciudadanía |
| Creativo-Artístico | Artes Visuales y Plásticas, Literatura |
| Comunicación | Lengua Española |

Todos los PDF siguen **la misma estructura**, lo que permite modelarlos como datos:

1. **Nivel espacio:** fundamentación, competencias específicas del espacio (CE) y a qué competencias generales del MCN contribuyen, contenidos estructurantes por disciplina, orientaciones metodológicas, orientaciones de evaluación, autonomía curricular.
2. **Nivel unidad curricular (UC):** justificación, ejes (p. ej. Matemática: *Número, Variable, Figura*), CE de la UC (CE1…CE7) con su vínculo a las competencias generales.
3. **Nivel tramo:** perfil general de tramo.
4. **Nivel grado (3.º y 4.º por separado):**
   - **Contenidos específicos**, agrupados por contenido estructurante → eje → bloque (p. ej. *NUMERACIÓN RACIONAL*), cada bloque vinculado a ciertas CE.
   - **Criterios de logro**, agrupados por CE.
5. **Cierre:** orientaciones metodológicas de la UC, consideraciones para abordar los contenidos del tramo, bibliografía para docente y estudiante.

Los programas recomiendan explícitamente el **diseño inverso (Wiggins y McTighe)**: 1) identificar logros esperados → 2) definir evidencias → 3) planificar actividades e instrumentos de evaluación. **La app se organiza en torno a ese flujo.**

> Nota técnica: el texto de los PDF ya se pudo extraer (pdf.js). Las tablas salen “desarmadas” (los ejes aparecen como letras verticales: `N Ú M E R O`), por lo que la carga necesita un paso de **estructuración + revisión humana** (ver Fase 1).

---

## 2. Objetivos

- **Fácil:** un docente sin experiencia técnica crea una planificación completa en minutos, guiado paso a paso.
- **Completa:** cubre todos los formatos de planificación de uso habitual y todos los elementos del programa (CE, contenidos, criterios de logro, competencias MCN, evaluación).
- **Fiel al programa:** nada se escribe “de memoria”; contenidos y criterios se eligen del programa oficial y quedan citados.
- **Funciona sin internet** (escuelas con conectividad irregular, equipos Ceibal).
- **Exporta** a Word y PDF listos para entregar a dirección/inspección.

### Fuera de alcance del MVP
- Datos personales de estudiantes (listas, calificaciones). Si se agrega luego, aplica la **Ley 18.331** de protección de datos personales.
- Otros tramos (la arquitectura los soporta; se cargan después).

---

## 3. Usuarios y casos de uso

| Usuario | Necesidad principal |
|---|---|
| Maestro/a de 3.º o 4.º | Plan anual, unidades/proyectos, secuencias y plan diario de **todas** las UC (en primaria un mismo docente da todas las áreas). |
| Maestro/a de escuela rural / **multigrado** | Planificar 3.º y 4.º juntos: mismo tema, contenidos y criterios diferenciados por grado. |
| Maestro/a de apoyo, profesor/a de área (Arte, etc.) | Planificar una sola UC para varios grupos. |
| Director/a, Inspector/a (fase posterior) | Ver planificaciones compartidas y comentarlas. |

**Historias clave**
1. “Quiero armar mi **plan anual** de 4.º repartiendo los contenidos por mes y ver qué me queda sin cubrir.”
2. “Quiero un **proyecto interdisciplinario** sobre *el agua* que tome contenidos de Ciencias del Ambiente, Geografía y Matemática.”
3. “Quiero una **secuencia didáctica** de fracciones con sus criterios de logro y una **rúbrica** ya armada.”
4. “Quiero el **plan del día** de mañana a partir de la secuencia, y exportarlo.”
5. “Quiero **reutilizar** lo que hice el año pasado y que se adapte al nuevo calendario.”

---

## 4. Funcionalidades

### 4.1 Explorador de programas (consulta)
- Navegación por Tramo → Grado → Espacio → UC, con buscador global (“fracciones”, “Artigas”, “ecosistema”).
- Vista lado a lado **3.º vs 4.º** de una UC (progresión de contenidos y criterios).
- Cada ítem muestra sus vínculos: contenido ↔ CE ↔ criterios de logro ↔ competencias generales MCN.
- Botón “Agregar a mi planificación” desde cualquier ítem.
- Enlace a la página del PDF original para verificar.

### 4.2 Tipos de planificación
| Tipo | Contenido principal |
|---|---|
| **Plan anual** | Distribución de contenidos por mes/período, por UC; mapa de cobertura. |
| **Unidad / Proyecto** (disciplinar o interdisciplinario) | Pregunta/situación problema, producto final, contenidos de 1+ UC, CE, criterios, evidencias, cronograma. |
| **Secuencia didáctica** | Serie de clases con propósito, actividades de inicio/desarrollo/cierre, recursos, evaluación. |
| **Plan diario / semanal** | Clases concretas con horario, agrupamientos y materiales; se genera desde la secuencia. |

Todas se encadenan: *anual → unidad → secuencia → clase*, y lo elegido arriba aparece pre-cargado abajo.

### 4.3 Asistente paso a paso (diseño inverso)
1. **Datos generales:** escuela, grupo, grado(s), turno, período, tipo de planificación.
2. **¿Qué quiero lograr?** Elegir **criterios de logro** del programa (filtrables por CE). La app sugiere las CE y competencias MCN asociadas.
3. **¿Qué voy a enseñar?** Elegir **contenidos específicos**; la app resalta los que se vinculan con los criterios elegidos y advierte si un criterio no tiene contenido asociado.
4. **¿Cómo sabré que lo lograron?** Evidencias e instrumentos (rúbrica, lista de cotejo, portafolio, autoevaluación, coevaluación). **Generador de rúbricas** a partir de los criterios elegidos (niveles editables).
5. **¿Cómo lo voy a enseñar?** Metodología (ABP, STEAHM, resolución de problemas, análisis de casos, aprendizaje-servicio, por experiencias — las que nombran los programas), actividades, recursos, agrupamientos, atención a la diversidad.
6. **Cronograma** sobre el calendario escolar.
7. **Revisión y exportación** con vista previa del documento final.

Cada paso tiene ayuda breve (“¿Qué es una CE?”) tomada de las orientaciones del propio programa.

### 4.4 Otras funcionalidades
- **Mapa de cobertura:** qué contenidos/criterios de cada UC ya están planificados en el año (semáforo).
- **Multigrado:** una planificación con columnas por grado.
- **Interdisciplinariedad:** sugerir UC que comparten contenidos estructurantes o CE del mismo espacio.
- **Calendario escolar:** períodos, vacaciones de julio y primavera, Semana de Turismo, fechas patrias y efemérides; editable cada año (las fechas oficiales cambian, se cargan por año y el docente las puede ajustar).
- **Banco de actividades y plantillas:** propias y de ejemplo; duplicar, reutilizar, “copiar al año siguiente”.
- **Guardado automático**, historial de versiones, deshacer.
- **Exportación** a Word (.docx editable), PDF e impresión; formato configurable (logo/encabezado de la escuela).
- **Respaldo:** exportar/importar todas mis planificaciones en un archivo.
- **(Fase 4) Asistente con IA opcional:** sugerir actividades, consignas o niveles de rúbrica **siempre a partir del programa seleccionado**, con edición del docente; la app funciona completa sin IA.

---

## 5. Experiencia de uso (UX)

- Lenguaje docente, nada técnico; todo en español rioplatense.
- **Inicio** con tres botones grandes: *Nueva planificación* · *Mis planificaciones* · *Explorar programas*.
- Asistente con barra de progreso, se puede saltar pasos y volver.
- Selección por **tarjetas con casillas** (no formularios largos); filtros por eje y CE.
- **Vista previa en vivo** del documento a la derecha (en pantallas chicas, pestaña aparte).
- Colores por espacio curricular, consistentes en toda la app.
- Accesible (WCAG AA: contraste, teclado, tamaños de letra), funciona en laptops Ceibal, tablets y celular.
- Mensajes vacíos que orientan (“Todavía no elegiste criterios de logro. Empezá por acá →”).
- Prueba con 3–5 docentes reales al final de cada fase.

---

## 6. Arquitectura técnica (recomendada)

| Capa | Elección | Por qué |
|---|---|---|
| App | **Web app instalable (PWA)** con **React + TypeScript + Vite** | Corre en cualquier equipo con navegador, se instala como app, funciona offline. |
| UI | Tailwind CSS + componentes accesibles (shadcn/ui / Radix) | Interfaz prolija y accesible rápido. |
| Datos locales | **IndexedDB** (Dexie) | Planificaciones guardadas en el equipo, sin cuenta ni internet. |
| Programas | **JSON versionado** en el repo (`data/programas/tramo-3/*.json`) | Fuente única, revisable, actualizable cuando salga una “v3” del programa. |
| Búsqueda | MiniSearch (índice en el navegador) | Búsqueda instantánea offline, tolerante a tildes. |
| Exportación | `docx` (Word) y vista de impresión/PDF | Documento editable + PDF. |
| Validación | Zod (esquemas) | Garantiza que los JSON de programas estén completos. |
| Pruebas | Vitest + Playwright | Lógica y flujos principales. |
| Fase 3 (opcional) | Supabase (cuentas, sincronización, compartir) | Usar en varios equipos y compartir con dirección. |

**Requisito previo:** en este equipo no están instalados Node.js ni Python. Hay que instalar **Node.js LTS** para desarrollar (la app final no lo necesita: se publica como sitio estático, p. ej. GitHub Pages o Netlify).

### 6.1 Modelo de datos del programa (resumen)

```ts
Tramo { id, nombre, grados: [3, 4], perfil }
Espacio { id, nombre, fundamentacion, ceEspacio: CE[], contenidosEstructurantes, orientaciones }
UnidadCurricular { id, espacioId, nombre, version, justificacion, ejes: Eje[], ce: CE[], bibliografia, fuente: {archivo, paginas} }
CE { codigo: "CE1", texto, competenciasMCN: CompetenciaGeneral[] }
Eje { id, nombre }                      // Número, Variable, Figura…
BloqueContenido { grado, eje, contenidoEstructurante, titulo, ceVinculadas: ["CE1",...], items: Contenido[] }
Contenido { id, texto, subitems?: Contenido[] }
CriterioLogro { id, grado, ce: "CE2", texto }
CompetenciaGeneral                       // las 10 del MCN: Comunicación, Pensamiento creativo, crítico, científico, computacional, Metacognitiva, Intrapersonal, Iniciativa y orientación a la acción, Relacionamiento con los otros, Ciudadanía local, global y digital
```

### 6.2 Modelo de datos de la planificación (resumen)

```ts
Planificacion { id, tipo: "anual"|"unidad"|"secuencia"|"clase", padreId?, titulo,
  escuela, grupo, grados[], periodo: {desde, hasta}, ucIds[],
  criteriosIds[], contenidosIds[], ceIds[], competenciasMCN[],
  situacionProblema?, productoFinal?, evidencias[], instrumentos: Instrumento[],
  metodologias[], clases: Clase[], recursos[], diversidad, notas,
  versionProgramas, creada, modificada }
Clase { fecha, duracion, proposito, inicio, desarrollo, cierre, agrupamiento, recursos[], evaluacion }
Instrumento { tipo: "rubrica"|"lista_cotejo"|..., criteriosIds[], niveles[] }
```

Las planificaciones guardan **referencias** a los ítems del programa + la versión, así una actualización del programa no rompe planificaciones viejas.

---

## 7. Fases y entregables

### Fase 0 — Preparación (≈ 1 semana)
- Instalar Node.js LTS, inicializar repositorio git y proyecto (Vite + React + TS).
- Definir esquemas Zod del modelo de datos.
- Bocetos de baja fidelidad de: Inicio, Explorador, Asistente, Vista previa. Validarlos con 2–3 docentes.

### Fase 1 — Carga de programas (≈ 2–3 semanas) ⚠️ crítica
1. Script de extracción (pdf.js) → texto por página (ya probado).
2. Estructuración a JSON por UC (semi-automática: reglas por encabezados conocidos — “Contenidos específicos de 3.er grado”, “Criterios de logro…”, “CE1.”… — más corrección manual de las tablas).
3. **Herramienta de revisión** interna: muestra el JSON junto a la página del PDF para corregir y marcar “revisado”.
4. Validación automática: cada UC tiene CE, contenidos y criterios para 3.º y 4.º; cada criterio apunta a una CE existente.
- **Entregable:** 10 JSON revisados del Tramo 3.

### Fase 2 — MVP (≈ 4–6 semanas)
- Explorador de programas con búsqueda y vista 3.º vs 4.º.
- Asistente de **Unidad/Proyecto** y **Secuencia didáctica** (diseño inverso completo).
- Generador de rúbricas y listas de cotejo.
- Mis planificaciones: guardar automáticamente, duplicar, eliminar, buscar.
- Exportar a Word y PDF.
- PWA offline.
- **Entregable:** versión usable para piloto con 5–10 docentes.

### Fase 3 — Versión completa (≈ 4–6 semanas)
- Plan anual con mapa de cobertura y calendario escolar.
- Plan diario/semanal generado desde la secuencia.
- Multigrado e interdisciplinario (múltiples UC).
- Banco de actividades y plantillas; copiar al año siguiente.
- Respaldo/importación; opcional: cuentas y sincronización (Supabase), compartir con dirección y comentarios.

### Fase 4 — Extensiones
- Asistente IA opcional anclado al programa.
- Carga de otros tramos (1, 2, 4, 5, 6) reutilizando el pipeline de Fase 1.
- Estadísticas de cobertura por escuela (si hay cuentas).

---

## 8. Criterios de calidad (cómo sabemos que está bien)

- Un docente nuevo crea y exporta una secuencia completa en **menos de 15 minutos** sin ayuda.
- 100 % de contenidos y criterios del Tramo 3 cargados y revisados contra el PDF.
- La app abre y guarda **sin conexión**.
- El Word exportado se abre correctamente en Word, LibreOffice y Google Docs.
- Puntaje Lighthouse de accesibilidad ≥ 95.

## 9. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Errores al extraer tablas de los PDF | Revisión humana obligatoria con la herramienta de Fase 1 y validaciones automáticas. |
| Cambios en los programas (ya hay “_v2”) | JSON versionados; planificaciones guardan la versión usada; aviso de “programa actualizado”. |
| Fechas del calendario cambian cada año | Calendario cargado por año y editable por el docente. |
| Pérdida de datos locales (equipo formateado) | Respaldo en archivo con recordatorio; sincronización opcional en Fase 3. |
| Formato exigido distinto por escuela/inspección | Plantillas de exportación configurables. |
| Los programas son de ANEP | Citar la fuente; uso educativo; confirmar condiciones antes de publicar la app. |

## 10. Próximos pasos inmediatos

1. Instalar Node.js LTS en este equipo.
2. Inicializar git y el proyecto base.
3. Construir el pipeline de Fase 1 empezando por **Matemática** (la estructura ya está analizada) y validarlo antes de seguir con las otras 9 UC.
4. Bocetos de pantallas y prueba rápida con docentes.
