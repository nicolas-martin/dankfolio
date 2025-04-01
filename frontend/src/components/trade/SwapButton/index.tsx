import React from 'react';
import { Pressable, Icon } from '@gluestack-ui/themed';
import { ICON_SWAP } from '../../../utils/icons';
import { SwapButtonProps } from './swapbutton_types';

const SwapButton: React.FC<SwapButtonProps> = ({ onPress }) => {
  return (
    <Pressable 
      alignSelf="center"
      p="$3"
      my="$2"
      rounded="$full"
      bg="$backgroundDark"
      onPress={onPress}
      _hover={{ bg: '$background' }}
      _pressed={{ bg: '$background' }}
    >
      <Icon
        as={ICON_SWAP}
        size={24}
        color="$text"
      />
    </Pressable>
  );
};

export default SwapButton;
