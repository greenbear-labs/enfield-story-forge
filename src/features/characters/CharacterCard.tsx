import { Link } from '@tanstack/react-router';
import type { Entry } from '../../data/types';
import { Avatar } from '../images/EntryImg';
import { characterRole, fieldText } from './characterModel';

/** How a character looks in the cast, and anywhere else a character is shown. */
export function CharacterCard({ character }: { character: Entry }) {
  const role = characterRole(character);
  const want = fieldText(character, 'want');
  const flaw = fieldText(character, 'flaw');
  return (
    <Link
      to="/characters/$characterId"
      params={{ characterId: character.id }}
      data-sec="char"
      className="entry-card"
    >
      <div className="flex items-center gap-3">
        <Avatar entry={character} />
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <span className="chip">{role || 'No role yet'}</span>
          <h3 className="text-[1.05rem]">{character.title || 'Unnamed character'}</h3>
        </div>
      </div>
      {want || flaw ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[0.88rem]">
          {want && (
            <>
              <dt className="text-muted">Wants</dt>
              <dd className="body">{want}</dd>
            </>
          )}
          {flaw && (
            <>
              <dt className="text-muted">Flaw</dt>
              <dd className="body">{flaw}</dd>
            </>
          )}
        </dl>
      ) : (
        <p className="text-[0.88rem] text-muted">Nothing on the card yet.</p>
      )}
    </Link>
  );
}
