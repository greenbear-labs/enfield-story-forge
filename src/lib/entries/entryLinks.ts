import type { Entry } from '../../data/types';

/** Where an entry opens in the app, for entry types that have a page so far. */
export function entryRoute(entry: Pick<Entry, 'id' | 'type'> & { parentId?: string | null }):
  | { to: '/shards/$shardId'; params: { shardId: string } }
  | { to: '/shards/groups/$groupId'; params: { groupId: string } }
  | { to: '/concepts/$conceptId'; params: { conceptId: string } }
  | { to: '/characters/$characterId'; params: { characterId: string } }
  | { to: '/characters'; search: { story: string } }
  | { to: '/outlines/$outlineId'; params: { outlineId: string } }
  | { to: '/outlines/structures/$structureId'; params: { structureId: string } }
  | { to: '/desk/chapters/$chapterId'; params: { chapterId: string } }
  | { to: '/desk/scenes/$sceneId'; params: { sceneId: string } }
  | { to: '/desk/$bookId/breakdown'; params: { bookId: string } }
  | { to: '/world/$notebookId'; params: { notebookId: string } }
  | { to: '/world/index/$indexId'; params: { indexId: string } }
  | { to: '/world/pages/$pageId'; params: { pageId: string } }
  | { to: '/paths/$adventureId'; params: { adventureId: string } }
  | {
      to: '/paths/$adventureId';
      params: { adventureId: string };
      search: { passage: string };
    }
  | null {
  switch (entry.type) {
    case 'shard':
      return { to: '/shards/$shardId', params: { shardId: entry.id } };
    case 'shard_group':
      return { to: '/shards/groups/$groupId', params: { groupId: entry.id } };
    case 'concept':
      return { to: '/concepts/$conceptId', params: { conceptId: entry.id } };
    case 'book':
      return { to: '/outlines/$outlineId', params: { outlineId: entry.id } };
    case 'structure':
      return { to: '/outlines/structures/$structureId', params: { structureId: entry.id } };
    case 'chapter':
      return { to: '/desk/chapters/$chapterId', params: { chapterId: entry.id } };
    case 'scene':
      return { to: '/desk/scenes/$sceneId', params: { sceneId: entry.id } };
    case 'plotline':
      return entry.parentId
        ? { to: '/desk/$bookId/breakdown', params: { bookId: entry.parentId } }
        : null;
    case 'cast_group':
      return { to: '/characters', search: { story: entry.id } };
    case 'character':
      return { to: '/characters/$characterId', params: { characterId: entry.id } };
    case 'notebook':
      return { to: '/world/$notebookId', params: { notebookId: entry.id } };
    case 'index':
      return { to: '/world/index/$indexId', params: { indexId: entry.id } };
    case 'page':
      return { to: '/world/pages/$pageId', params: { pageId: entry.id } };
    case 'adventure':
      return { to: '/paths/$adventureId', params: { adventureId: entry.id } };
    case 'passage':
      return entry.parentId
        ? {
            to: '/paths/$adventureId',
            params: { adventureId: entry.parentId },
            search: { passage: entry.id },
          }
        : null;
    default:
      return null;
  }
}

const TYPE_NAMES: Partial<Record<Entry['type'], string>> = {
  shard: 'Shard',
  shard_group: 'Shard group',
  concept: 'Concept',
  character: 'Character',
  cast_group: 'Cast group',
  book: 'Outline',
  structure: 'Structure',
  chapter: 'Chapter',
  scene: 'Scene',
  plotline: 'Plotline',
  series: 'Series',
  notebook: 'Notebook',
  index: 'Index',
  page: 'World page',
  adventure: 'Adventure',
  passage: 'Passage',
};

export const entryTypeName = (type: Entry['type']) => TYPE_NAMES[type] ?? type;
