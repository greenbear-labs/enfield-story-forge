import { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Icon } from '../../components/ui/Icon';
import { openCapture } from './captureStore';
import { shardTypeLabel } from './shardModel';
import { nextSparkPrompt } from './sparkPrompts';

export function SparkPromptsDialog({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState(() => nextSparkPrompt());

  return (
    <Dialog title="Spark Prompts" sec="shard" onClose={onClose}>
      <div className="flex flex-col gap-2 rounded-lg bg-accent-soft p-4">
        <span className="chip self-start bg-surface">{shardTypeLabel(prompt.type)}</span>
        <p className="font-display text-[1.25rem] leading-snug" aria-live="polite">
          {prompt.text}
        </p>
      </div>
      <p className="text-[0.85rem] text-muted">
        Not every prompt fits. Skip until one tugs at you, then write down what it makes you think
        of.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            onClose();
            openCapture({ text: `${prompt.text}\n\n`, shardType: prompt.type });
          }}
        >
          <Icon name="plus" size={16} />
          Make it a shard
        </button>
        <button type="button" className="btn" onClick={() => setPrompt(nextSparkPrompt(prompt))}>
          <Icon name="dice" size={16} />
          Another prompt
        </button>
      </div>
    </Dialog>
  );
}
