import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Entry } from '../../data/types';
import { coverOf } from '../../lib/entries/images';
import { useAuthStore } from '../auth/authStore';
import { EntryImg } from '../images/EntryImg';
import {
  addChoice,
  CARD,
  choicesOf,
  coverArtOf,
  createPassage,
  freeSpot,
  endingLabel,
  endingOf,
  movePassage,
  passageName,
  posOf,
  type EndingType,
  type MapPos,
} from './pathsModel';

interface PassageData extends Record<string, unknown> {
  passage: Entry;
  isStart: boolean;
}
type PassageNode = Node<PassageData, 'passage'>;

/** One passage on the map: its picture, name, and whether it starts or ends the story. */
function PassageCard({ data, selected }: NodeProps<PassageNode>) {
  const { passage, isStart } = data;
  const ending = endingOf(passage);
  const choices = choicesOf(passage).length;
  const cover = coverOf(passage);
  const art = coverArtOf(passage);
  return (
    <div
      className="sp-node"
      data-ending={ending ?? undefined}
      data-selected={selected || undefined}
    >
      <Handle type="target" position={Position.Left} />
      {cover ? (
        <EntryImg image={cover} alt="" className="sp-node-cover" />
      ) : (
        art && <img src={art} alt="" className="sp-node-cover" />
      )}
      <div className="flex flex-col gap-1 px-3 py-2">
        {(isStart || ending) && (
          <span className="flex flex-wrap gap-1">
            {isStart && <span className="chip">Start</span>}
            {ending && <span className="sp-ending-chip">{endingLabel(ending)}</span>}
          </span>
        )}
        <b className="font-display text-[1.02rem] leading-tight">{passageName(passage)}</b>
        {!ending && (
          <span className="text-[0.75rem] text-muted">
            {choices === 0 ? 'No choices yet' : choices === 1 ? '1 choice' : `${choices} choices`}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const NODE_TYPES = { passage: PassageCard };

const toNode = (
  passage: Entry,
  startId: string | null,
  selectedId: string | null,
): PassageNode => ({
  id: passage.id,
  type: 'passage',
  position: posOf(passage),
  data: { passage, isStart: passage.id === startId },
  selected: passage.id === selectedId,
});

/**
 * The story as a map: passages as cards, choices as arrows. Drag a card to
 * move it, drag from a card's right edge to another card to add a choice, or
 * to an empty spot to add a choice that leads to a new passage there.
 */
function MapView({
  adventure,
  passages,
  startId,
  selectedId,
  onSelect,
}: {
  adventure: Entry;
  passages: Entry[];
  startId: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const flow = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<PassageNode[]>(() =>
    passages.map((p) => toNode(p, startId, selectedId)),
  );

  // Follow the saved passages (adjusting state while rendering, as React suggests for props),
  // but leave a card that's being dragged where the pointer has it. A card keeps its measured
  // size: React Flow hides a card until it's measured, and won't measure it again unless its
  // size changes.
  const [synced, setSynced] = useState({ passages, startId, selectedId });
  if (
    synced.passages !== passages ||
    synced.startId !== startId ||
    synced.selectedId !== selectedId
  ) {
    setSynced({ passages, startId, selectedId });
    setNodes((prev) => {
      const before = new Map(prev.map((n) => [n.id, n] as const));
      return passages.map((p) => {
        const node = toNode(p, startId, selectedId);
        const old = before.get(p.id);
        if (!old) return node;
        const kept = { ...node, measured: old.measured };
        return old.dragging ? { ...kept, position: old.position, dragging: true } : kept;
      });
    });
  }

  // A passage opened from elsewhere (story health, search) is brought into view if it's off screen.
  useEffect(() => {
    const node = selectedId ? flow.getNode(selectedId) : undefined;
    const box = wrapper.current?.getBoundingClientRect();
    if (!node || !box) return;
    const { x, y, zoom } = flow.getViewport();
    const left = node.position.x * zoom + x;
    const top = node.position.y * zoom + y;
    const width = (node.measured?.width ?? CARD.width) * zoom;
    const height = (node.measured?.height ?? CARD.height) * zoom;
    if (left < 0 || top < 0 || left + width > box.width || top + height > box.height)
      void flow.setCenter(node.position.x + width / zoom / 2, node.position.y + height / zoom / 2, {
        zoom,
        duration: 300,
      });
  }, [selectedId, flow]);

  const edges = useMemo<Edge[]>(() => {
    const ids = new Set(passages.map((p) => p.id));
    return passages.flatMap((p) =>
      choicesOf(p)
        .filter((c) => c.to && ids.has(c.to))
        .map((c) => ({
          id: `${p.id}:${c.id}`,
          source: p.id,
          target: c.to!,
          label: c.label.trim() || undefined,
          markerEnd: { type: MarkerType.ArrowClosed },
          selectable: false,
        })),
    );
  }, [passages]);

  const onNodesChange = useCallback(
    (changes: NodeChange<PassageNode>[]) =>
      // Selection is ours (from the URL), so only moves are applied here.
      setNodes((ns) =>
        applyNodeChanges(
          changes.filter((c) => c.type !== 'select'),
          ns,
        ),
      ),
    [],
  );

  const byId = useMemo(() => new Map(passages.map((p) => [p.id, p])), [passages]);

  const onConnect = useCallback(
    ({ source, target }: Connection) => {
      const from = byId.get(source);
      if (!from || source === target) return;
      addChoice(ws, from, target);
      onSelect(source);
    },
    [byId, ws, onSelect],
  );

  // Dropped on another card (not just its edge): a choice that leads there.
  // Dropped on an empty spot: a new passage there, and a choice that leads to it.
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (state.isValid || !state.fromNode) return;
      const from = byId.get(state.fromNode.id);
      if (!from) return;
      const point = 'changedTouches' in event ? event.changedTouches[0] : event;
      if (!point) return;
      const card = document
        .elementFromPoint(point.clientX, point.clientY)
        ?.closest<HTMLElement>('.react-flow__node');
      const onto = card?.dataset.id;
      if (onto && onto !== from.id && byId.has(onto)) {
        addChoice(ws, from, onto);
        onSelect(from.id);
        return;
      }
      if (onto) return;
      const pos = flow.screenToFlowPosition({ x: point.clientX, y: point.clientY });
      const id = createPassage(ws, adventure, freeSpot(passages, { x: pos.x, y: pos.y - 30 }));
      addChoice(ws, from, id);
      onSelect(id);
    },
    [byId, flow, ws, adventure, passages, onSelect],
  );

  /** The middle of what's on screen, for a passage added with a button. */
  const viewCenter = (): MapPos => {
    const box = wrapper.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    const at = flow.screenToFlowPosition({
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
    });
    return { x: at.x - 100, y: at.y - 40 };
  };

  const add = (ending?: EndingType) => {
    const id = createPassage(
      ws,
      adventure,
      freeSpot(passages, viewCenter()),
      ending ? { ending } : {},
    );
    onSelect(id);
  };

  return (
    <div ref={wrapper} className="sp-map" aria-label="Story map">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        colorMode="dark"
        onNodesChange={onNodesChange}
        onNodeDragStop={(_, node) => movePassage(ws, node.id, node.position)}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        connectionRadius={40}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={28} size={1.2} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeBorderRadius={6} />
        <Panel position="top-left" className="flex gap-2">
          <button type="button" className="btn btn-small" onClick={() => add()}>
            + Passage
          </button>
          <button type="button" className="btn btn-small" onClick={() => add('other')}>
            + Ending
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function StoryMap(props: Parameters<typeof MapView>[0]) {
  return (
    <ReactFlowProvider>
      <MapView {...props} />
    </ReactFlowProvider>
  );
}
