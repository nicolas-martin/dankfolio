# CopyToClipboard Component

A reusable React Native component that provides copy-to-clipboard functionality with visual feedback using a green checkmark animation instead of toast notifications.

## Features

- ✅ Copy text to clipboard with a single tap
- ✅ Visual feedback with animated green checkmark overlay
- ✅ No toast notifications - cleaner UX
- ✅ Customizable callback on copy success
- ✅ Disabled state support
- ✅ TypeScript support
- ✅ Accessibility friendly

## Usage

### Basic Usage

```tsx
import CopyToClipboard from '@/components/Common/CopyToClipboard';
import { IconButton } from 'react-native-paper';

<CopyToClipboard text="Hello, World!">
  <IconButton icon="content-copy" size={20} />
</CopyToClipboard>
```

### With Custom Callback

```tsx
<CopyToClipboard 
  text={walletAddress}
  onCopy={() => {
    console.log('Address copied!');
    // Custom logic here
  }}
>
  <IconButton icon="content-copy" size={16} />
</CopyToClipboard>
```

### With Disabled State

```tsx
<CopyToClipboard 
  text={sensitiveData}
  disabled={!isAuthorized}
>
  <IconButton icon="content-copy" size={16} />
</CopyToClipboard>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `text` | `string` | ✅ | - | The text to copy to clipboard |
| `children` | `React.ReactNode` | ✅ | - | The component to wrap (usually a button) |
| `onCopy` | `() => void` | ❌ | - | Callback function called after successful copy |
| `disabled` | `boolean` | ❌ | `false` | Whether the copy functionality is disabled |
| `testID` | `string` | ❌ | - | Test identifier for testing |

## Animation

The component shows a green checkmark overlay for 1.5 seconds after a successful copy operation. The animation includes:

- Semi-transparent overlay
- Green circular background
- White checkmark icon
- Smooth fade in/out transitions

## Accessibility

The component maintains accessibility features of the wrapped child component while adding copy functionality.

## Migration from Toast-based Copy

### Before (with toast)
```tsx
import { copyToClipboard } from './scripts';
import { useToast } from '@components/Common/Toast';

const { showToast } = useToast();

<IconButton
  icon="content-copy"
  onPress={() => copyToClipboard(text, 'Label', showToast)}
/>
```

### After (with CopyToClipboard)
```tsx
import CopyToClipboard from '@/components/Common/CopyToClipboard';

<CopyToClipboard text={text}>
  <IconButton icon="content-copy" />
</CopyToClipboard>
```

## Styling

The component uses the app's theme colors and can be customized by modifying the styles in `styles.ts`. 