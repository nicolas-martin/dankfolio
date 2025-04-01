export const getButtonState = (isSubmitting: boolean, disabled: boolean) => ({
	isDisabled: disabled || isSubmitting,
	showSpinner: isSubmitting
});
