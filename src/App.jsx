import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import GamePage from './pages/GamePage';
import GnomePage from './pages/GnomePage';
import OtherPage from './pages/OtherPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<GamePage />} />
          <Route path="/rukitis" element={<GnomePage />} />
          <Route path="/cita-lapa" element={<OtherPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
