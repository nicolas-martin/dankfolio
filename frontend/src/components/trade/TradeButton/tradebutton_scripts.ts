export const SPINNER_SIZE = 'small';
export const SPINNER_COLOR = '#fff';

export const getButtonState = (isSubmitting: boolean, disabled: boolean) => ({
	isDisabled: disabled || isSubmitting,
	showSpinner: isSubmitting
});
