import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { Marco } from './componentes/Marco';
import { Inicio } from './paginas/Inicio';
import { Programas } from './paginas/Programas';
import { ExploradorUC } from './paginas/ExploradorUC';
import { Asistente } from './paginas/Asistente';
import { MisPlanificaciones, NuevaPlanificacion } from './paginas/MisPlanificaciones';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Marco />}>
          <Route index element={<Inicio />} />
          <Route path="programas" element={<Programas />} />
          <Route path="programas/:ucId" element={<ExploradorUC />} />
          <Route path="nueva" element={<NuevaPlanificacion />} />
          <Route path="mis-planificaciones" element={<MisPlanificaciones />} />
          <Route path="planificacion/:id" element={<Asistente />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);
