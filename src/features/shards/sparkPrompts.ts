import type { ShardType } from './shardModel';

export interface SparkPrompt {
  text: string;
  /** The shard type a spark from this prompt most likely is. */
  type: ShardType;
}

/** "What if" prompts to shake loose new shards. Stored as data so the pool can grow. */
export const SPARK_PROMPTS: SparkPrompt[] = [
  { text: 'What if a town forgot one person every night?', type: 'premise' },
  { text: 'What if the map was right and the land was wrong?', type: 'location' },
  { text: 'What if the villain was keeping a promise?', type: 'character' },
  { text: 'What if magic cost a memory instead of energy?', type: 'magic' },
  { text: 'What if the last letter ever written arrived today?', type: 'moment' },
  { text: 'What if a lighthouse kept ships away on purpose?', type: 'location' },
  { text: 'What if your hero is the only one who can’t lie?', type: 'character' },
  { text: 'What if an heirloom remembers every owner?', type: 'item' },
  { text: 'What if the war ended and nobody told the soldiers?', type: 'premise' },
  { text: 'What if loyalty and honesty can’t both survive?', type: 'theme' },
  { text: 'What if the city moved one street every night?', type: 'location' },
  { text: 'What if a healer could only heal by taking the wound?', type: 'magic' },
  { text: 'What if someone found their own name on a gravestone, dated tomorrow?', type: 'moment' },
  { text: 'What if the mentor has been wrong the whole time?', type: 'character' },
  { text: 'What if a key opens any door, but only once?', type: 'item' },
  { text: 'What if the monster was trying to warn them?', type: 'premise' },
  { text: 'What if home is the thing that has to be left behind?', type: 'theme' },
  { text: 'What if two rivals had to share one body every other day?', type: 'premise' },
  { text: 'What if a library held the books people never wrote?', type: 'location' },
  { text: 'What if a song could change the weather?', type: 'magic' },
  { text: 'What if a child was the kingdom’s only honest judge?', type: 'character' },
  { text: 'What if the crown chooses who wears it, and it chose wrong?', type: 'item' },
  { text: 'What if the rescue party arrived and the captive refused to leave?', type: 'moment' },
  { text: 'What if forgiveness was the dangerous choice?', type: 'theme' },
  { text: 'What if the stars went out one at a time, and someone was counting?', type: 'premise' },
  { text: 'What if a ship’s crew were all ghosts except the cook?', type: 'character' },
  { text: 'What if shadows could be traded at market?', type: 'magic' },
  { text: 'What if a village lived on the back of something sleeping?', type: 'location' },
  { text: 'What if the hero wins in chapter one, and that’s the problem?', type: 'premise' },
  { text: 'What if a compass pointed to what you’d lost?', type: 'item' },
  { text: 'What if the person they hate most saves their life?', type: 'moment' },
  { text: 'What if a thief steals something they can’t give back?', type: 'premise' },
  { text: 'What if being remembered was worth more than being alive?', type: 'theme' },
  { text: 'What if every lie told in a house became a new room?', type: 'magic' },
  { text: 'What if the queen’s double started making better decisions?', type: 'character' },
  { text: 'What if the border between two countries was a living forest?', type: 'location' },
  { text: 'What if the prophecy was a mistranslation?', type: 'question' },
  { text: 'Who would lie to protect the person they’re betraying?', type: 'question' },
  { text: 'What does your hero hide even from themself?', type: 'question' },
  { text: 'What if a door appeared in a wall that had none yesterday?', type: 'moment' },
];

/** A random prompt, never the same as the one just shown. */
export function nextSparkPrompt(current?: SparkPrompt, random = Math.random): SparkPrompt {
  const pool = current ? SPARK_PROMPTS.filter((p) => p !== current) : SPARK_PROMPTS;
  return pool[Math.floor(random() * pool.length)]!;
}
