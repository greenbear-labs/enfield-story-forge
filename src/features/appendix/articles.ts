import type { Section } from '../../data/types';

/**
 * The Appendix: short craft articles behind the (i) links. Bodies use a tiny
 * format: blank lines between blocks, "## " for a heading, "- " for list
 * items, **bold**, and [[Article title]] to link another article.
 */
export interface Article {
  title: string;
  group: string;
  sec: Section;
  summary: string;
  body: string;
}

export const ARTICLE_GROUPS = [
  'Getting started',
  'Shards and concepts',
  'Story structure',
  'Characters',
  'Writing',
] as const;

export const ARTICLES: Article[] = [
  {
    title: 'How Story Forge works',
    group: 'Getting started',
    sec: 'home',
    summary: 'Four stations, two companion workshops, and why nothing is ever in the wrong order.',
    body: `Story Forge is a row of workshops. Each one does one job, and work moves from one to the next.

## The four stations
- **Story Shards:** save sparks before they're lost. A place, a person, a moment, a what-if.
- **Concepts:** turn sparks into an idea you could pitch in one sentence.
- **Outline Builder:** pick a structure and build the skeleton of the story.
- **Writer's Desk:** break the outline into chapters and scenes, then write.

## The companion workshops
The **Character Center** holds your cast, and every station can use it. The **World Creator** (coming later) holds the places, peoples, and things of your world.

## Start anywhere
You never have to go in order. Some writers start with a shard, some with a character, some with a theme and an ending. Everything links up later, and you can always go back a station.

## Learn as you go
The (i) links open articles like this one. Read them when you're curious, never because you have to.`,
  },
  {
    title: 'What is a story shard?',
    group: 'Shards and concepts',
    sec: 'shard',
    summary: 'A fragment of an idea, saved fast, before it fades.',
    body: `A story shard is any piece of a story that shows up before the story does. A line of dialogue in the shower. A place you saw on a walk. A "what if" that won't leave you alone.

## Why save fragments?
Ideas fade fast, and most of them aren't a story yet. Saving them without judging them builds a pile you can mine later. Many stories start when two unrelated shards turn out to belong together.

## Good habits
- **Capture first, sort later.** Type it, pick a rough type, save. Tags can wait.
- **Keep them small.** One idea per shard makes them easier to combine.
- **Visit the Shard Mines.** Every so often, pull a few shards into the mine cart and see which ones spark against each other. A group of shards that belong together can become a concept.

Stuck? **Spark Prompts** offer a random "what if" to get you going.`,
  },
  {
    title: 'What makes a strong concept?',
    group: 'Shards and concepts',
    sec: 'concept',
    summary: 'Who it’s about, what they want, what’s in the way, and why it matters.',
    body: `A concept is a story you could pitch in one sentence. It isn't the plot yet; it's the promise of one.

## The parts of a strong concept
- **A specific character.** Not "a girl" but "a teenage oracle who can't see her own future."
- **A clear want.** Something they're chasing that a reader can picture.
- **Real opposition.** Someone or something that makes the want hard, ideally for good reasons of its own.
- **Stakes and a clock.** What's lost if they fail, and why it has to happen now.
- **A hook.** The twist, image, or irony that makes someone say "ooh."

## The logline test
Try writing it as one sentence: *A [character] wants [goal] in [world], but [opposition], before [deadline].* If it won't fit, the idea may still be two stories, or it may be missing a part. That's fine. Concepts are cheap; make several and keep the one that won't let go.

## Tools that help
The **Concept Generator** builds this sentence from random parts. **The Mashup** combines two concepts into a third. When one feels ready, send it to the Outline Builder.`,
  },
  {
    title: 'Story structures explained',
    group: 'Story structure',
    sec: 'story',
    summary:
      'Every structure describes the same shape. Pick the lens that helps you see your story.',
    body: `Every popular story structure describes the same basic shape: a stable world is disrupted, the hero struggles against rising pressure, hits a crisis, makes a choice, and ends somewhere changed. The structures differ in how many moments they name and what they emphasize.

## Structure is a lens, not a cage
Beats sit at predictable points in a story. The midpoint really does tend to fall halfway through, and the climax near the end. That's why the Beat Board shows each beat's rough position, and why you can compare two structures side by side: their beats line up.

## Which one fits?
- [[The Hero’s Journey (Monomyth)]]: epic, mythic, and fantasy journeys. 17 beats.
- [[The Writer’s Journey]]: a streamlined Hero's Journey that works well on screen. 12 beats.
- [[Three-Act Structure]]: the universal baseline. Good for anything.
- [[Save the Cat]]: very concrete beats for commercial fiction. 15 beats.
- [[Story Circle]]: compact and cyclical, great for episodes and character stories. 8 beats.
- [[Seven-Point Structure]]: built for planning backward from the ending.
- [[Freytag’s Pyramid]]: classic drama and tragedy. 5 parts.
- [[Kishōtenketsu]]: a four-part shape built on a twist instead of conflict.

## You can switch
Switching structures never loses your notes. They're kept for each structure, and "Compare with" shows them beside the new one.`,
  },
  {
    title: 'The Hero’s Journey (Monomyth)',
    group: 'Story structure',
    sec: 'story',
    summary: 'Joseph Campbell’s 17 stages of departure, initiation, and return.',
    body: `In *The Hero with a Thousand Faces* (1949), the mythologist Joseph Campbell argued that myths from around the world share one pattern, which he called the monomyth. A hero leaves the known world, is tested and transformed, and returns with something that renews their community.

## Three movements
- **Departure:** the call, the refusal, help from a mentor or a gift, and the crossing into the unknown.
- **Initiation:** the road of trials, temptation, facing the power that rules the hero's life, and the transformation it brings.
- **Return:** the reluctance to go back, the flight home, and becoming a master of both worlds.

## Using it
Campbell was describing myths, not giving writing rules, so treat the 17 stages as questions rather than requirements. Some stages will be a single line in your story; some you'll skip. Its strength is the big arc of a person changed by a journey, which is why it suits epic fantasy and quests.

See also [[The Writer’s Journey]], Christopher Vogler's screen-friendly version.`,
  },
  {
    title: 'The Writer’s Journey',
    group: 'Story structure',
    sec: 'story',
    summary: 'Christopher Vogler’s 12-stage Hero’s Journey for storytellers.',
    body: `Christopher Vogler, a Hollywood story analyst, condensed Campbell's monomyth into 12 stages in a famous studio memo, later the book *The Writer's Journey* (1992). It keeps the shape of [[The Hero’s Journey (Monomyth)]] but uses plainer language and fits a three-act film.

## The stages
Ordinary World, Call to Adventure, Refusal, Meeting the Mentor, Crossing the Threshold, Tests/Allies/Enemies, Approach to the Inmost Cave, the Ordeal, Reward, the Road Back, Resurrection, and Return with the Elixir.

## Using it
The **Ordeal** sits near the midpoint, and the **Resurrection** is the climax: a final test that proves the hero has changed. Vogler also describes character archetypes (mentor, threshold guardian, herald, shapeshifter, shadow, trickster) as roles characters play, not fixed types.`,
  },
  {
    title: 'Three-Act Structure',
    group: 'Story structure',
    sec: 'story',
    summary: 'Beginning, middle, and end, with turning points that lock the hero in.',
    body: `The idea that a story has a beginning, middle, and end goes back to Aristotle's *Poetics*. Screenwriting teacher Syd Field made it practical in *Screenplay* (1979) by naming the plot points that turn one act into the next.

## The shape
- **Act One (about the first quarter):** the setup, the inciting incident, and **Plot Point One**, a decision that locks the hero into the conflict.
- **Act Two (the middle half):** rising obstacles, a **midpoint** that changes the stakes, and **Plot Point Two**, the low point that sets up the end.
- **Act Three (the last quarter):** the climax and the resolution.

## Using it
It's the most flexible structure, so it's a good default when nothing else fits. If your middle sags, the midpoint is usually the fix: give it a real reversal or revelation. See also [[Save the Cat]], which splits these acts into more specific beats.`,
  },
  {
    title: 'Save the Cat',
    group: 'Story structure',
    sec: 'story',
    summary: 'Blake Snyder’s 15 concrete beats, adapted for novels by Jessica Brody.',
    body: `Screenwriter Blake Snyder's *Save the Cat!* (2005) breaks the three acts into 15 beats with specific jobs. Jessica Brody adapted it for novelists in *Save the Cat! Writes a Novel* (2018). The name comes from the idea of giving your hero an early moment that makes us like them, like saving a cat.

## The beats
Opening Image, Theme Stated, Setup, Catalyst, Debate, Break into Two, B Story, Fun and Games, Midpoint, Bad Guys Close In, All Is Lost, Dark Night of the Soul, Break into Three, Finale, and Final Image.

## Using it
It's concrete, which makes it beginner-friendly. Two ideas worth stealing even if you don't use it all:
- The **Opening Image** and **Final Image** mirror each other, so the change is visible.
- The **B Story** is usually a relationship that carries the theme and helps the hero find the answer in Act Three.`,
  },
  {
    title: 'Story Circle',
    group: 'Story structure',
    sec: 'story',
    summary: 'Dan Harmon’s eight steps: comfort, need, go, search, find, take, return, change.',
    body: `Dan Harmon, the creator of *Community*, distilled the Hero's Journey into eight steps around a circle. The top half is the familiar world (order) and the bottom half the unfamiliar (chaos).

## The eight steps
1. **You:** a character in a zone of comfort.
2. **Need:** they want something.
3. **Go:** they enter an unfamiliar situation.
4. **Search:** they adapt to it.
5. **Find:** they get what they wanted.
6. **Take:** they pay a heavy price for it.
7. **Return:** they go back to the familiar.
8. **Change:** having changed.

## Using it
It's small enough to use at any scale: a whole book, one subplot, a TV episode, even a single chapter. The **Take** step is the one writers most often skip, and it's what makes the change cost something.`,
  },
  {
    title: 'Seven-Point Structure',
    group: 'Story structure',
    sec: 'story',
    summary: 'Dan Wells’s structure, planned from the ending backward.',
    body: `Author Dan Wells popularized the Seven-Point Structure in a well-known series of lectures. Its big idea is to plan the **resolution first**, then make the hook its opposite, then fill in the turns between.

## The seven points
- **Hook:** where the hero starts, the opposite of where they end.
- **Plot Turn One:** something changes and the conflict begins.
- **Pinch One:** pressure forces the hero to act.
- **Midpoint:** the hero moves from reacting to acting.
- **Pinch Two:** things go terribly wrong; something is taken away.
- **Plot Turn Two:** the hero finds the last piece they need.
- **Resolution:** the ending you planned first.

## Using it
It pairs naturally with [[The theme-first, ending-first method]]. Try it on a subplot or a character arc as well as the main plot.`,
  },
  {
    title: 'Freytag’s Pyramid',
    group: 'Story structure',
    sec: 'story',
    summary: 'Gustav Freytag’s five-part shape of classical drama.',
    body: `In 1863 the German novelist Gustav Freytag described the shape of classical five-act drama, especially tragedy, as a pyramid: rising to a peak, then falling.

## The five parts
- **Exposition:** the situation and the people.
- **Rising action:** the conflict builds.
- **Climax:** the turning point, where the hero's fortunes reverse. In Freytag's pyramid it sits in the **middle**, not near the end.
- **Falling action:** the consequences unravel.
- **Denouement:** the ending, often a catastrophe in tragedy.

## Using it
Freytag's climax is the point of no return, closer to what other structures call the midpoint. It's a good lens for tragedies and stories about a fall, where the second half is the price of the first.`,
  },
  {
    title: 'Kishōtenketsu',
    group: 'Story structure',
    sec: 'story',
    summary: 'A four-part structure built on a twist rather than conflict.',
    body: `Kishōtenketsu comes from classical Chinese poetry and is common in Japanese, Chinese, and Korean storytelling, including many manga and films. It has four parts, and it doesn't need a central conflict.

## The four parts
- **Ki (introduction):** the characters and their world.
- **Shō (development):** that world deepens.
- **Ten (twist):** something unexpected shifts how we see everything.
- **Ketsu (reconciliation):** the parts come together into a new understanding.

## Using it
Instead of a hero fighting an obstacle, the story's energy comes from the twist and how it reframes what came before. It suits quiet, literary, and slice-of-life stories, and it's a refreshing exercise when every outline starts to feel like a battle.`,
  },
  {
    title: 'The theme-first, ending-first method',
    group: 'Story structure',
    sec: 'story',
    summary: 'Decide what your story argues and how it ends, then work back to the start.',
    body: `Many writers start with an event. This method starts with a **question**, and builds the story to answer it. It's the order the Story Spine walks when you choose "Theme and ending."

## The steps
1. **Theme as a question.** "Is safety worth giving up freedom?" A question is better than a statement, because the story has to argue both sides.
2. **The controlling idea.** Your answer, the thing the climax will prove. The term comes from Robert McKee.
3. **The climax.** Design the moment where the hero's choice *demonstrates* that answer.
4. **The resolution.** What the world and the hero look like after the choice.
5. **The opening state.** Start the hero believing the *wrong* answer. That's their lie.
6. **The midpoint.** Where they first glimpse the truth, or start acting instead of reacting.
7. **The turns between.** Fill in what pushes them from the opening, through the midpoint, to the climax.

## Assign the argument
Following John Truby's idea, let the antagonist embody the opposite answer, and let side characters try other answers. Their outcomes reinforce what your story says. [[Seven-Point Structure]] fits this method well.`,
  },
  {
    title: 'The Story Spine',
    group: 'Story structure',
    sec: 'story',
    summary: 'The slots every story fills, in whatever order you start from.',
    body: `The Story Spine is the core of an outline: the logline, theme question, controlling idea, central conflict, climax, resolution, opening state, and the hero's want, need, lie, and truth.

## Same slots, different paths
Writers start from different places, so the spine is numbered in the order your way in walks it:
- **An idea** starts from the logline and the conflict.
- **Theme and ending** follows [[The theme-first, ending-first method]].
- **A character** starts from their want, need, lie, and truth.
- **A premise** starts from the what-if.

You can fill the slots in any order. Writers who start from theme and writers who start from character end up with the same spine.

## Why it matters
When you're deep in chapter 20, the spine reminds you what the story is about and where it's going. If a scene doesn't serve the spine, ask what it's doing there.`,
  },
  {
    title: 'Building characters readers believe',
    group: 'Characters',
    sec: 'char',
    summary: 'Want, need, flaw, and wound: the four questions behind a believable character.',
    body: `Readers believe characters who want something, are wrong about something, and pay a price to change.

## The core card
- **Want:** the outer goal they're chasing. It drives the plot.
- **Need:** the inner truth that would actually make them whole. It drives the arc.
- **Flaw:** the habit or belief that keeps getting in the way.
- **Role:** the job they do in this story: protagonist, mentor, rival, and so on.

The best stories put the want and the need in tension: getting what they want would cost them what they need, or the other way round.

## Depth on demand
Start with the core card. Add modules (arc, backstory, voice, relationships) only when the character needs them. A minor character might never need more than a name and a want.

## Discovery tools
The **Character Interview** asks questions in the character's voice. The **Archetype Spark** rolls a random role, flaw, wound, and want to start from. See [[Character arcs]] for how characters change.`,
  },
  {
    title: 'Character arcs',
    group: 'Characters',
    sec: 'char',
    summary: 'Positive, flat, and negative: how a character changes, or changes the world.',
    body: `A character arc is the inner journey that runs alongside the plot. K.M. Weiland's *Creating Character Arcs* (2016) gives a clear model built on four pieces:

- **The wound (or ghost):** something that happened before the story.
- **The lie:** what they came to believe because of it.
- **The want:** the outer goal, often shaped by the lie.
- **The need:** the truth they have to accept.

## Three kinds of arc
- **Positive:** they believe a lie, and the story forces them to embrace the truth. Most hero stories.
- **Flat:** they already know the truth, and they change the world around them instead. Think of Paddington or Captain America.
- **Negative:** they refuse the truth, fall for a worse lie, or are corrupted. Tragedies and villain stories.

## Using it
Set the arc type in a character's **Arc** module, and write where they start and where they end. The opening state and the resolution in your [[The Story Spine]] are the same arc, seen from the story's side.`,
  },
  {
    title: 'From outline to chapters',
    group: 'Writing',
    sec: 'desk',
    summary: 'How beats become chapters, and chapters become scenes.',
    body: `An outline tells you what happens. Chapters and scenes decide how the reader experiences it.

## A practical path
1. **Pick a target length.** A 90,000-word novel is often 30 to 40 chapters.
2. **Place the beats.** Set a chapter count on the Beat Board to see where each beat should land. With 36 chapters, the midpoint falls around chapter 18.
3. **Expand beats into scenes.** A big beat may take several scenes; a small one, a single scene.
4. **Group scenes into chapters** by point of view, place, time, and where the hooks fall.
5. **Check the rhythm.** Vary chapter lengths, and end each chapter on a question or a turn.

## Scenes are the real unit
Every scene should change something: from safe to endangered, from trust to betrayal. If nothing changes, the scene may not be needed. The **Writer's Desk** (coming next) is built around these scene cards.`,
  },
];

const BY_TITLE = new Map(ARTICLES.map((a) => [a.title, a]));

/** The article for an (i) link's topic, if one is written. */
export const articleFor = (topic: string | undefined) => (topic ? BY_TITLE.get(topic) : undefined);
