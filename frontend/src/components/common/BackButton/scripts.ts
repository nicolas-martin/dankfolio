export const ICON_NAME = 'arrow-back';
export const ICON_SIZE = 24;
export const ICON_COLOR = '#fff';

export const handleNavigation = (goBack: () => void) => () => {
	goBack();
};
