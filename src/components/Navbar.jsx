import './Navbar.css';

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>Class Waitlist</span>
        <span className="navbar__product">SMS Notification Job</span>
      </div>
      <div className="navbar__user">
        <span className="navbar__name">Staff Admin</span>
        <span className="navbar__avatar" role="img" aria-label="Signed in as Staff Admin">SA</span>
      </div>
    </header>
  );
}
