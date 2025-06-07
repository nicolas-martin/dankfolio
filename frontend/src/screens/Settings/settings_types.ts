import { RouteProp, NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';

export type SettingsScreenNavigationProp = NavigationProp<RootStackParamList>;
export type SettingsScreenRouteProp = RouteProp<RootStackParamList, 'Settings'>;
