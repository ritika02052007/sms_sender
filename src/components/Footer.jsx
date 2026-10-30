import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} Class Waitlist · SMS Notification Job. Twilio is mocked: no real messages are sent.</p>
    </footer>
  );
}
