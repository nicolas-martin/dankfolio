import React from 'react';
import { Button, ButtonText, Icon, Spinner, HStack } from '@gluestack-ui/themed';
import { TradeButtonProps } from './tradebutton_types';
import {
  ICON_CHECK,
  ICON_WARNING,
  IconType
} from '../../../utils/icons';

const BUTTON_STATES: Record<string, {
  icon?: IconType;
  color: string;
  bg: string;
}> = {
  default: {
    bg: '$primary',
    color: '$textLight',
  },
  processing: {
    bg: '$primary',
    color: '$textLight',
  },
  disabled: {
    bg: '$backgroundDark',
    color: '$textSecondary',
  },
  error: {
    icon: ICON_WARNING,
    bg: '$error',
    color: '$textLight',
  },
  success: {
    icon: ICON_CHECK,
    bg: '$success',
    color: '$textLight',
  },
};

const TradeButton: React.FC<TradeButtonProps> = ({
  onPress,
  isSubmitting,
  disabled,
  label
}) => {
  const state = isSubmitting ? 'processing' : disabled ? 'disabled' : 'default';
  const { icon: StateIcon, color, bg } = BUTTON_STATES[state];

  return (
    <Button
      size="lg"
      variant="solid"
      bg={bg}
      onPress={onPress}
      isDisabled={disabled || isSubmitting}
      rounded="$lg"
      py="$3"
      mt="$4"
      _hover={{
        opacity: 0.8
      }}
      _pressed={{
        opacity: 0.7
      }}
    >
      <HStack space="sm" alignItems="center">
        {isSubmitting ? (
          <Spinner size="small" color="$textLight" />
        ) : StateIcon ? (
          <Icon as={StateIcon} size={20} color={color} />
        ) : null}
        <ButtonText
          color={color}
          fontWeight="$bold"
          fontSize="$lg"
        >
          {label}
        </ButtonText>
      </HStack>
    </Button>
  );
};

export default TradeButton;
