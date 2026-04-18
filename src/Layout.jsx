import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import BurgerMenu from './components/BurgerMenu';

const NAV_PANEL_ID = 'main-nav-panel';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="layout">
      <header className="site-header">
        <button
          type="button"
          className={`burger-button${menuOpen ? ' burger-button--open' : ''}`}
          aria-expanded={menuOpen}
          aria-controls={NAV_PANEL_ID}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="burger-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="visually-hidden">Atvērt izvēlni</span>
        </button>
        <span className="site-title">Pingvīna spēle</span>
      </header>
      <BurgerMenu
        id={NAV_PANEL_ID}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <main className="site-main">
        <Outlet />
      </main>
    </div>
  );
}
