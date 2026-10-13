import { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { toast } from '../../components/ui/toast';
import {
  deviceInfo,
  FEEDBACK_KINDS,
  MAX_FEEDBACK,
  sendFeedback,
  type FeedbackKind,
} from './feedback';

/** A short note to Alex: something wrong, an idea, or anything else. */
export function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<FeedbackKind>('problem');
  const [message, setMessage] = useState('');
  const [withDevice, setWithDevice] = useState(true);

  const send = () => {
    if (!message.trim()) return;
    sendFeedback({ kind, message, ...(withDevice ? deviceInfo() : {}) });
    onClose();
    toast('Thanks! Your note is on its way.');
  };

  return (
    <Dialog title="Send feedback" onClose={onClose} sec="home">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <p className="text-[0.9rem] text-muted">
          Tell us what went wrong, what you’d love to see, or anything else. Every note is read.
        </p>
        <div className="flex flex-col gap-1.5">
          <span className="label">What’s it about?</span>
          <div role="group" aria-label="What’s it about?" className="flex flex-wrap gap-1.5">
            {FEEDBACK_KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                className="seg"
                aria-pressed={kind === k.key}
                onClick={() => setKind(k.key)}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="label">Your note</span>
          <textarea
            className="txt min-h-32"
            value={message}
            maxLength={MAX_FEEDBACK}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              kind === 'problem'
                ? 'What happened, and what did you expect?'
                : kind === 'idea'
                  ? 'What would make Story Forge better for you?'
                  : 'What’s on your mind?'
            }
          />
        </label>
        <label className="flex items-center gap-2 text-[0.85rem]">
          <input
            type="checkbox"
            checked={withDevice}
            onChange={(e) => setWithDevice(e.target.checked)}
          />
          Include the page I’m on and my device
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!message.trim()}>
            Send
          </button>
        </div>
      </form>
    </Dialog>
  );
}
