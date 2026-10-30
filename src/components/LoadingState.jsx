export default function LoadingState({ label = 'Loading', rows = 5 }) {
  return (
    <div className="loading-state" role="status" aria-busy="true">
      <span className="sr-only">{label}…</span>
      <div className="skeleton skeleton--title" aria-hidden="true" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton skeleton--row" aria-hidden="true" />
      ))}
    </div>
  );
}
