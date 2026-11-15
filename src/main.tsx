import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { Marco } from './componentes/Marco';
import { Inicio } from './paginas/Inicio';
import { Programas } from './paginas/Programas';
import { ExploradorUC } from './paginas/ExploradorUC';
import { Proximamente } from './paginas/Proximamente';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Marco />}>
          <Route index element={<Inicio />} />
          <Route path="programas" element={<Programas />} />
          <Route path="programas/:ucId" element={<ExploradorUC />} />
          <Route path="nueva" element={<Proximamente titulo="Nueva planificación" />} />
          <Route path="mis-planificaciones" element={<Proximamente titulo="Mis planificaciones" />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);
