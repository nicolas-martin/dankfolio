import React from 'react';
import {
  useToast as useGlueToast,
  Toast as GlueToast,
  ToastTitle,
  ToastDescription,
  Button,
  ButtonText,
  HStack,
  VStack,
  Icon,
  Box,
} from '@gluestack-ui/themed';
import { ToastProps, ToastType } from './toast_types';
import { useToastStore } from '../../../store/toast';
import {
  ICON_CHECK,
  ICON_WARNING,
  ICON_LINK,
  IconType
} from '../../../utils/icons';

const TOAST_ICONS: Record<ToastType, IconType> = {
  success: ICON_CHECK,
  error: ICON_WARNING,
  info: ICON_LINK,
  warning: ICON_WARNING,
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: '$success',
  error: '$error',
  info: '$primary',
  warning: '$warning',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const useToast = () => {
  const toast = useGlueToast();
  const showGlueToast = useToastStore((state) => state.showToast);
  const hideGlueToast = useToastStore((state) => state.hideToast);

  const createTransactionAction = (txHash: string) => ({
    label: 'View Transaction',
    onPress: () => window.open(`https://solscan.io/tx/${txHash}`, '_blank'),
    style: 'secondary'
  });

  const showToast = (props: ToastProps) => {
    const { message, type = 'info', actions = [], icon, txHash } = props;
    
    const allActions = [
      ...actions,
      ...(txHash ? [createTransactionAction(txHash)] : [])
    ];

    toast.show({
      placement: "top",
      render: ({ id }) => (
        <GlueToast 
          action="attention"
          variant="accent"
          borderColor={TOAST_COLORS[type]}
          borderWidth="$1"
          bg="$backgroundDark"
        >
          <HStack space="sm" alignItems="flex-start">
            <Box 
              mr="$2"
              p="$2"
              rounded="$full"
              bg={TOAST_COLORS[type]}
              opacity={0.2}
            >
              <Icon
                as={icon ? icon : TOAST_ICONS[type]}
                size={20}
                color={TOAST_COLORS[type]}
              />
            </Box>
            
            <VStack flex={1}>
              <ToastTitle color="$text">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </ToastTitle>
              <ToastDescription color="$textSecondary">
                {message}
              </ToastDescription>
              
              {allActions.length > 0 && (
                <HStack space="sm" mt="$2">
                  {allActions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.style === 'primary' ? 'solid' : 'outline'}
                      size="sm"
                      borderColor={TOAST_COLORS[type]}
                      bg={action.style === 'primary' ? TOAST_COLORS[type] : 'transparent'}
                      onPress={() => {
                        action.onPress();
                        toast.close(id);
                      }}
                    >
                      <ButtonText 
                        color={action.style === 'primary' ? '$textLight' : TOAST_COLORS[type]}
                        fontSize="$sm"
                      >
                        {action.label}
                      </ButtonText>
                    </Button>
                  ))}
                </HStack>
              )}
            </VStack>

            <Button
              variant="link"
              onPress={() => toast.close(id)}
              p="$2"
              ml="$2"
              _hover={{
                opacity: 0.8
              }}
            >
              <Icon 
                as={ICON_WARNING}  // Using warning icon for close
                size={16}
                color="$textSecondary"
              />
            </Button>
          </HStack>
        </GlueToast>
      ),
      duration: 5000,
    });
    
    showGlueToast(props);
  };

  return { showToast, hideToast: hideGlueToast };
};

export default GlueToast;
