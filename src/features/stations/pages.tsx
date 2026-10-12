import { StationPage } from './StationPage';
import { charactersStation, deskStation, outlinesStation } from './content';

export const OutlinesPage = () => <StationPage content={outlinesStation} />;
export const DeskPage = () => <StationPage content={deskStation} />;
export const CharactersPage = () => <StationPage content={charactersStation} />;
