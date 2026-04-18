import { NavLink } from 'react-router-dom';

export default function BurgerMenu({ id, open, onClose }) {
  const handleNav = () => {
    onClose();
  };

  return (
    <>
      <div
        className={`menu-backdrop ${open ? 'menu-backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <nav
        id={id}
        className={`burger-panel ${open ? 'burger-panel--open' : ''}`}
        aria-hidden={!open}
        aria-label="Galvenā navigācija"
      >
        <div className="burger-panel__inner">
          <section className="menu-section">
            <h2 className="menu-section__title">Spēles</h2>
            <ul className="menu-list">
              <li>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `menu-link${isActive ? ' menu-link--active' : ''}`
                  }
                  onClick={handleNav}
                >
                  Briesmīgais pingvīns
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/rukitis"
                  className={({ isActive }) =>
                    `menu-link${isActive ? ' menu-link--active' : ''}`
                  }
                  onClick={handleNav}
                >
                  Rūķīša ceļojums
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/99-naktis-mezā"
                  className={({ isActive }) =>
                    `menu-link${isActive ? ' menu-link--active' : ''}`
                  }
                  onClick={handleNav}
                >
                  99 naktis mežā (3D)
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/bomzis-skrien"
                  className={({ isActive }) =>
                    `menu-link${isActive ? ' menu-link--active' : ''}`
                  }
                  onClick={handleNav}
                >
                  Bomža medības (3D)
                </NavLink>
              </li>
            </ul>
          </section>
          <section className="menu-section">
            <h2 className="menu-section__title">Citas lapas</h2>
            <ul className="menu-list">
              <li>
                <NavLink
                  to="/cita-lapa"
                  className={({ isActive }) =>
                    `menu-link${isActive ? ' menu-link--active' : ''}`
                  }
                  onClick={handleNav}
                >
                  Cita lapa
                </NavLink>
              </li>
            </ul>
          </section>
        </div>
      </nav>
    </>
  );
}
