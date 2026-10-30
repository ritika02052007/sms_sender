import Button from './Button.jsx';

export default function ErrorBanner({ message, onRetry, retrying = false }) {
  return (
    <div className="banner banner--error" role="alert">
      <p>{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry} loading={retrying}>Retry</Button>}
    </div>
  );
}
