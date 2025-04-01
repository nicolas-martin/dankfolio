import {
  ArrowLeft,
  Home,
  Coins,
  Settings,
  Search,
  Plus,
  Trash,
  Pencil,
  User,
  Menu,
  X,
  Check,
  AlertCircle,
  Globe,
  Link,
  ArrowUpDown,
  Wallet,
  MessageCircle,
  Twitter,
  type LucideIcon
} from 'lucide-react-native';

// Navigation icons
export const ICON_BACK = ArrowLeft;
export const ICON_HOME = Home;
export const ICON_MENU = Menu;

// Action icons
export const ICON_ADD = Plus;
export const ICON_DELETE = Trash;
export const ICON_EDIT = Pencil;
export const ICON_CLOSE = X;
export const ICON_CHECK = Check;
export const ICON_SEARCH = Search;
export const ICON_SWAP = ArrowUpDown;

// Feature icons
export const ICON_PROFILE = User;
export const ICON_SETTINGS = Settings;
export const ICON_COINS = Coins;
export const ICON_WALLET = Wallet;

// Link icons
export const ICON_WEBSITE = Globe;
export const ICON_LINK = Link;

// Social icons
export const ICON_TWITTER = Twitter;
export const ICON_TELEGRAM = MessageCircle;
export const ICON_DISCORD = MessageCircle; // Using MessageCircle as a fallback for Discord

// Status icons
export const ICON_WARNING = AlertCircle;

export type IconType = LucideIcon;