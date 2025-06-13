import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import Feather from 'react-native-vector-icons/Feather';
import AntDesign from 'react-native-vector-icons/AntDesign';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import type { IconProps as RNVIconProps } from 'react-native-vector-icons/Icon';

type IconBaseProps = Omit<RNVIconProps, 'name'>;

interface IconProps extends IconBaseProps {
	name: string;
}

// Base icon components
const FeatherIconBase: React.FC<IconProps> = (props) => {
	const { name, size = 24, color = '#000', style } = props;
	return <Feather name={name} size={size} color={color} style={style} />;
};

const MaterialIconBase: React.FC<IconProps> = (props) => {
	const { name, size = 24, color = '#000', style } = props;
	return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
};

const FontAwesome6IconBase: React.FC<IconProps> = (props) => {
	const { name, size = 24, color = '#000', style } = props;
	return <FontAwesome6 solid name={name} size={size} color={color} style={style} />;
};

const AntDesignIconBase: React.FC<IconProps> = (props) => {
	const { name, size = 24, color = '#000', style } = props;
	return <AntDesign name={name} size={size} color={color} style={style} />;
};

// Navigation icons
export const BackIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="arrow-left" {...props} />;
export const HomeIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="home" {...props} />;
export const MenuIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="menu" {...props} />;

// Action icons
export const AddIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="plus" {...props} />;
export const DeleteIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="trash" {...props} />;
export const EditIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="edit" {...props} />;
export const CloseIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="x" {...props} />;
export const CheckIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="check" {...props} />;
export const CopyIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="copy" {...props} />;
export const SearchIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="search" {...props} />;
export const SwapIcon: React.FC<IconBaseProps> = (props) => <AntDesignIconBase name="swap" {...props} />;
export const SendIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="send" {...props} />;

// Feature icons
export const ProfileIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="user" {...props} />;
export const SettingsIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="settings" {...props} />;
export const CoinsIcon: React.FC<IconBaseProps> = (props) => <FontAwesome6IconBase name="coins" {...props} />;
export const WalletIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="credit-card" {...props} />;

// Link icons
export const WebsiteIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="globe" {...props} />;
export const LinkIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="link" {...props} />;

// Social icons
export const TwitterIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="twitter" {...props} />;
export const TelegramIcon: React.FC<IconBaseProps> = (props) => <FontAwesome name="telegram" size={props.size ?? 24} color={props.color ?? '#000'} style={props.style} />;
export const DiscordIcon: React.FC<IconBaseProps> = (props) => <MaterialIconBase name="discord" {...props} />;

// Status icons
export const WarningIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="alert-circle" {...props} />;
export const ChevronDownIcon: React.FC<IconBaseProps> = (props) => <FeatherIconBase name="chevron-down" {...props} />; 
