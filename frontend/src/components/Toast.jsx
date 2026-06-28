export function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.type === 'success' ? '✓' : '✕'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
