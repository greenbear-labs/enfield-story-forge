import { StationPage } from './StationPage';
import { deskStation, outlinesStation } from './content';

export const OutlinesPage = () => <StationPage content={outlinesStation} />;
export const DeskPage = () => <StationPage content={deskStation} />;
