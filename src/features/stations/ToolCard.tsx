import { Icon, type IconName } from '../../components/ui/Icon';
import { COMING_SOON, toast } from '../../components/ui/toast';

export interface ToolDef {
  name: string;
  icon: IconName;
  description: string;
  /** "Later" tools are planned beyond v1 and shown dimmed. */
  later?: boolean;
}

/** A tool on a station page. Without `onOpen`, the tool isn't built yet and the card says so. */
export function ToolCard({ tool, onOpen }: { tool: ToolDef; onOpen?: () => void }) {
  const ready = !!onOpen && !tool.later;
  return (
    <button
      type="button"
      className={`tool ${tool.later ? 'tool-later' : ''}`}
      onClick={() => {
        if (ready) onOpen();
        else
          toast(tool.later ? `${tool.name} is planned for later.` : `${tool.name}: ${COMING_SOON}`);
      }}
    >
      <span className="ti">
        <Icon name={tool.icon} />
      </span>
      {tool.later && <span className="chip absolute top-3 right-3">Later</span>}
      <h3 className="text-base">{tool.name}</h3>
      <p className="text-[0.85rem] text-muted">{tool.description}</p>
      <span className="go">{ready ? 'Open →' : tool.later ? 'Planned' : 'Coming soon'}</span>
    </button>
  );
}
