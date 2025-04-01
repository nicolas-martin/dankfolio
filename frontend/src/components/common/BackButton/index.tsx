import React from 'react';
import { Pressable, Icon } from '@gluestack-ui/themed';
import { useNavigation } from '@react-navigation/native';
import { ICON_BACK } from '../../../utils/icons';
import { BackButtonProps } from './backbutton_types';

const BackButton: React.FC<BackButtonProps> = () => {
  const navigation = useNavigation();

  return (
    <Pressable
      p="$2"
      rounded="$full"
      onPress={() => navigation.goBack()}
      _hover={{ bg: '$backgroundDark' }}
      _pressed={{ bg: '$backgroundDark' }}
    >
      <Icon
        as={ICON_BACK}
        size={24}
        color="$text"
      />
    </Pressable>
  );
};

export default BackButton;
