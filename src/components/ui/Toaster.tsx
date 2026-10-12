import { dismissToast, useToastStore } from './toast';

export function Toaster() {
  const { message, action, key } = useToastStore();
  return (
    <div aria-live="polite" role="status">
      {message && (
        <div key={key} className="toast flex items-center gap-3">
          <span>{message}</span>
          {action && (
            <button
              type="button"
              className="border-0 bg-transparent p-0 font-semibold text-[var(--bg)] underline"
              onClick={() => {
                dismissToast();
                action.onClick();
              }}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
