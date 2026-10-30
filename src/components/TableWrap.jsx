// Scrollable tables must be keyboard focusable and labelled.
export default function TableWrap({ label, children }) {
  return (
    <div className="table-wrap" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
