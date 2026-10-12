/**
 * The Archetype Spark's pools. Stored as data so they can grow. Each row is
 * rolled on its own; the result is a starting point, not a verdict.
 */
export const SPARK_ROWS = [
  {
    key: 'role',
    label: 'Role',
    path: 'role',
    options: [
      'The reluctant heir',
      'The loyal soldier',
      'The exiled scholar',
      'The charming thief',
      'The weary mentor',
      'The idealistic rebel',
      'The disgraced knight',
      'The hidden royal',
      'The outsider healer',
      'The ambitious courtier',
      'The wandering bard',
      'The grieving inventor',
      'The cynical detective',
      'The runaway apprentice',
      'The last of their order',
      'The smuggler with a code',
      'The village oddball',
      'The trusted advisor',
      'The rival who should have won',
      'The kind monster',
    ],
  },
  {
    key: 'flaw',
    label: 'Flaw',
    path: 'flaw',
    options: [
      'Can’t ask for help',
      'Lies to keep the peace',
      'Needs to be the hero',
      'Trusts too easily',
      'Trusts no one',
      'Quick to anger',
      'Runs from conflict',
      'Proud to a fault',
      'Holds grudges forever',
      'Says yes to everyone',
      'Reckless when scared',
      'Hides behind jokes',
      'Must be in control',
      'Jealous of a friend',
      'Believes they’re unlovable',
      'Puts rules over people',
      'Can’t let the past go',
      'Wants approval too much',
    ],
  },
  {
    key: 'wound',
    label: 'Wound',
    path: 'backstory.wound',
    options: [
      'Left behind by a parent',
      'Blamed for a disaster',
      'Betrayed by a best friend',
      'Survived when others didn’t',
      'Failed the one test that mattered',
      'Grew up in someone’s shadow',
      'Lost a home to fire',
      'Broke a promise to someone dying',
      'Was sold, traded, or given away',
      'Was told they were a mistake',
      'Watched a mentor fall',
      'Lost a sibling and never said goodbye',
      'Was the one who walked away',
      'Was publicly humiliated',
      'Was loved for what they could do, not who they were',
      'Woke up with no memory of a year',
    ],
  },
  {
    key: 'want',
    label: 'Want',
    path: 'want',
    options: [
      'To clear their name',
      'To be chosen, just once',
      'To find who left them',
      'To win the crown',
      'To get home',
      'To pay off a debt',
      'To protect a younger sibling',
      'To be left alone',
      'To prove the teacher wrong',
      'To break a curse',
      'To earn a place at the table',
      'To get revenge',
      'To find the cure',
      'To make one perfect thing',
      'To be forgiven',
      'To keep the family together',
      'To see the edge of the map',
      'To be remembered',
    ],
  },
] as const;

export type SparkKey = (typeof SPARK_ROWS)[number]['key'];
export type Spark = Record<SparkKey, string>;

type Random = () => number;

const pick = (options: readonly string[], random: Random, not?: string) => {
  const pool = options.filter((o) => o !== not);
  return pool[Math.floor(random() * pool.length)]!;
};

/** A fresh role, flaw, wound, and want. */
export const rollSpark = (random: Random = Math.random): Spark =>
  Object.fromEntries(SPARK_ROWS.map((r) => [r.key, pick(r.options, random)])) as Spark;

/** Re-rolls one row, never landing on what it showed before. */
export function rerollRow(spark: Spark, key: SparkKey, random: Random = Math.random): Spark {
  const row = SPARK_ROWS.find((r) => r.key === key)!;
  return { ...spark, [key]: pick(row.options, random, spark[key]) };
}

/** The spark as card values, by field path. */
export const sparkValues = (spark: Spark) =>
  Object.fromEntries(SPARK_ROWS.map((r) => [r.path, spark[r.key]]));
