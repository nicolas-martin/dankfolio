export interface CommonProps {
	source: { uri: string } | number;
	style?: any;
	resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
	alt?: string;
}
