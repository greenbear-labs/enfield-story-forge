import type { Timestamp } from 'firebase/firestore';

/** workspaces/{workspaceId}. A user's personal workspace uses their uid as its id. */
export interface Workspace {
  ownerId: string;
  memberIds: string[];
  name: string;
  createdAt: Timestamp;
}
