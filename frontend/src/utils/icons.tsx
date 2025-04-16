import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import React from 'react';
import type { IconProps as RNVIconProps } from 'react-native-vector-icons/Icon';

type IconBaseProps = Omit<RNVIconProps, 'name'>;

interface IconProps extends IconBaseProps {
	name: string;
}

// Base icon components
const FeatherIconBase = (props: IconProps) => {
	const { name, size = 24, color = '#000', style } = props;
	return <Feather name={name} size={size} color={color} style={style} />;
};

const MaterialIconBase = (props: IconProps) => {
	const { name, size = 24, color = '#000', style } = props;
	return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
};

const FontAwesomeIconBase = (props: IconProps) => {
	const { name, size = 24, color = '#000', style } = props;
	return <FontAwesome name={name} size={size} color={color} style={style} />;
};

// Navigation icons
export const BackIcon = (props: IconBaseProps) => <FeatherIconBase name="arrow-left" {...props} />;
export const HomeIcon = (props: IconBaseProps) => <FeatherIconBase name="home" {...props} />;
export const MenuIcon = (props: IconBaseProps) => <FeatherIconBase name="menu" {...props} />;

// Action icons
export const AddIcon = (props: IconBaseProps) => <FeatherIconBase name="plus" {...props} />;
export const DeleteIcon = (props: IconBaseProps) => <FeatherIconBase name="trash" {...props} />;
export const EditIcon = (props: IconBaseProps) => <FeatherIconBase name="edit" {...props} />;
export const CloseIcon = (props: IconBaseProps) => <FeatherIconBase name="x" {...props} />;
export const CheckIcon = (props: IconBaseProps) => <FeatherIconBase name="check" {...props} />;
export const SearchIcon = (props: IconBaseProps) => <FeatherIconBase name="search" {...props} />;
export const SwapIcon = (props: IconBaseProps) => <FeatherIconBase name="swap-vertical" {...props} />;
export const SendIcon = (props: IconBaseProps) => <FeatherIconBase name="send" {...props} />;

// Feature icons
export const ProfileIcon = (props: IconBaseProps) => <FeatherIconBase name="user" {...props} />;
export const SettingsIcon = (props: IconBaseProps) => <FeatherIconBase name="settings" {...props} />;
export const CoinsIcon = (props: IconBaseProps) => <FontAwesomeIconBase name="coins" {...props} />;
export const WalletIcon = (props: IconBaseProps) => <FeatherIconBase name="credit-card" {...props} />;

// Link icons
export const WebsiteIcon = (props: IconBaseProps) => <FeatherIconBase name="globe" {...props} />;
export const LinkIcon = (props: IconBaseProps) => <FeatherIconBase name="link" {...props} />;

// Social icons
export const TwitterIcon = (props: IconBaseProps) => <FeatherIconBase name="twitter" {...props} />;
export const TelegramIcon = (props: IconBaseProps) => <FeatherIconBase name="telegram" {...props} />;
export const DiscordIcon = (props: IconBaseProps) => <MaterialIconBase name="discord" {...props} />;

// Status icons
export const WarningIcon = (props: IconBaseProps) => <FeatherIconBase name="alert-circle" {...props} />; 