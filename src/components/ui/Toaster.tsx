import { useToastStore } from './toast';

export function Toaster() {
  const { message, key } = useToastStore();
  return (
    <div aria-live="polite" role="status">
      {message && (
        <div key={key} className="toast">
          {message}
        </div>
      )}
    </div>
  );
}
