import type { EndingType } from '../pathsModel';
import type { CondOp, EffectOp, VarKind } from '../stateModel';

/** A sample story, written as data so it can be added to anyone's adventures. */
export interface SampleStory {
  key: string;
  title: string;
  blurb: string;
  categories: string[];
  /** Art from public/paths-art/ for its cover. */
  cover: string;
  vars?: Record<string, { name: string; kind: VarKind; start?: number }>;
  /** The key of the first passage. */
  start: string;
  passages: Record<string, SamplePassage>;
}

export interface SamplePassage {
  title: string;
  /** Paragraphs. */
  text: string[];
  ending?: EndingType;
  choices?: SampleChoice[];
  lines?: { text: string; when: SampleRule<CondOp> }[];
}

export interface SampleChoice {
  label: string;
  /** The key of the passage it leads to. */
  to: string;
  needs?: SampleRule<CondOp>[];
  does?: SampleRule<EffectOp>[];
  /** Gems to unlock it. */
  cost?: number;
}

export interface SampleRule<Op extends string> {
  var: string;
  op: Op;
  value?: number;
}
