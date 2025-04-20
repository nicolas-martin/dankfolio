import { NavigationState, ParamListBase } from '@react-navigation/native';

export const navigationMiddleware = (
	state: Readonly<NavigationState<ParamListBase>> | undefined
) => {
	const prevState = state;
	if (state && state.routes.length > 0) {
		const currentRoute = state.routes[state.index];
		const prevRoute = state.routes[Math.max(0, state.index - 1)];

		console.log('📱 Navigation:', {
			from: prevRoute?.name || 'Initial',
			to: currentRoute.name,
			params: currentRoute.params || 'No params'
		});
	}
}; 
