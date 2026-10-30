/**
 * Accessible button. Uses aria-disabled (not `disabled`) so focus is never
 * lost while an action is running; clicks are ignored while busy.
 */
export default function Button({
  variant = 'secondary', loading = false, disabled = false, type = 'button',
  className = '', onClick, children, ...rest
}) {
  const inactive = disabled || loading;
  const handleClick = (event) => {
    if (inactive) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  return (
    <button
      type={type}
      className={`btn btn--${variant} ${className}`.trim()}
      aria-disabled={inactive ? 'true' : undefined}
      aria-busy={loading ? 'true' : undefined}
      onClick={handleClick}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
