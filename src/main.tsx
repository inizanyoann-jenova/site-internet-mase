import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import HomePage from './pages/HomePage';
import MatricePage from './pages/MatricePage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/outil" element={<App />} />
        <Route path="/matrice-polyvalence" element={<MatricePage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
