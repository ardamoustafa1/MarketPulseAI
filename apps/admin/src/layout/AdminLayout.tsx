import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { ADMIN_NAV_ITEMS } from '../config/navigation';

export function AdminLayout() {
  const { state, logout } = useAuth();
  const visibleNavItems = ADMIN_NAV_ITEMS.filter(
    (item) => !item.requiredRoles || (state.role ? item.requiredRoles.includes(state.role) : false)
  );

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <span className="brand-accent">MP</span>
            <div>
              <h2>MarketPulse AI</h2>
              <p>Admin Command Center</p>
            </div>
          </div>
          <nav>
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <button className="ghost-btn" onClick={logout} type="button">
          Sign out ({state.username})
        </button>
      </aside>

      <main className="content-area">
        <div className="content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
