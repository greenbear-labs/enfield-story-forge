import { useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { TagInput } from '../../components/ui/TagInput';
import { toast } from '../../components/ui/toast';
import { useAuthStore } from '../auth/authStore';
import { closeCapture, useCaptureStore } from './captureStore';
import { createShard, type ShardType } from './shardModel';
import { ShardTypePicker } from './ShardTypePicker';

/** Quick shard capture, opened by + Shard in the top bar and by the station's tools. */
export function CaptureShardDialog() {
  const open = useCaptureStore((s) => s.open);
  // Unmounted while closed, so every opening starts with a fresh form.
  return open ? <CaptureForm /> : null;
}

function CaptureForm() {
  const initial = useCaptureStore.getState().initial;
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const navigate = useNavigate();
  const [text, setText] = useState(initial?.text ?? '');
  const [shardType, setShardType] = useState<ShardType>(initial?.shardType ?? 'moment');
  const [tags, setTags] = useState<string[]>([]);

  const save = (e?: FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || !workspaceId) return;
    const id = createShard(workspaceId, { text, shardType, tags });
    closeCapture();
    toast('Shard saved.', {
      action: {
        label: 'Open',
        onClick: () => void navigate({ to: '/shards/$shardId', params: { shardId: id } }),
      },
    });
  };

  return (
    <Dialog title="New shard" sec="shard" onClose={closeCapture}>
      <form
        className="flex flex-col gap-3"
        onSubmit={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="sr-only">Shard text</span>
          <textarea
            className="txt min-h-28"
            placeholder="A place, a person, a moment, a what-if…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <ShardTypePicker value={shardType} onChange={setShardType} />
        <TagInput tags={tags} onChange={setTags} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
            Save shard
          </button>
          <span className="text-[0.78rem] text-muted max-sm:hidden">Ctrl + Enter saves</span>
          <button
            type="button"
            className="btn btn-ai ml-auto"
            onClick={() => toast('AI help arrives in a later version.')}
          >
            Expand with AI
          </button>
        </div>
      </form>
    </Dialog>
  );
}
