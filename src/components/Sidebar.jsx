import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const ICONS = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  waitlists: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  notifications: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
};

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/sessions/session-1/waitlist', label: 'Waitlists', icon: 'waitlists', match: '/sessions' },
  { to: '/notifications', label: 'Notifications', icon: 'notifications' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  return (
    <nav className="sidebar" aria-label="Primary">
      <ul>
        {LINKS.map(({ to, label, icon, match }) => {
          const active = pathname === to || pathname.startsWith(match ?? to);
          return (
            <li key={to}>
              <Link to={to} className="sidebar__link" aria-current={active ? 'page' : undefined}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d={ICONS[icon]} />
                </svg>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
