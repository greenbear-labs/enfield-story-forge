import { StationPage } from './StationPage';
import {
  charactersStation,
  conceptsStation,
  deskStation,
  outlinesStation,
  shardsStation,
} from './content';

export const ShardsPage = () => <StationPage content={shardsStation} />;
export const ConceptsPage = () => <StationPage content={conceptsStation} />;
export const OutlinesPage = () => <StationPage content={outlinesStation} />;
export const DeskPage = () => <StationPage content={deskStation} />;
export const CharactersPage = () => <StationPage content={charactersStation} />;
