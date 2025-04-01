import React from 'react';
import { TouchableOpacity, Linking } from 'react-native';
import { Text, Icon, Box, HStack, VStack, Divider } from '@gluestack-ui/themed';
import { CoinInfoProps } from './coininfo_types';
import {
  ICON_WEBSITE,
  ICON_TWITTER,
  ICON_TELEGRAM,
  ICON_DISCORD,
  ICON_LINK,
  IconType
} from '../../../utils/icons';

const formatNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
};

const LinkItem: React.FC<{
  icon: IconType;
  label: string;
  value: string;
  onPress: () => void;
}> = ({ icon: IconComponent, label, value, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <HStack 
      space="sm" 
      alignItems="center" 
      px="$4" 
      py="$3"
      _hover={{
        bg: '$backgroundDark'
      }}
    >
      <Box 
        p="$2" 
        rounded="$full" 
        bg="$backgroundDark"
        mr="$2"
      >
        <Icon as={IconComponent} size={20} color="$text" />
      </Box>
      <VStack flex={1}>
        <Text color="$text" fontSize="$base" fontWeight="$medium">{label}</Text>
        <Text color="$textSecondary" fontSize="$sm" numberOfLines={1}>{value}</Text>
      </VStack>
      <Icon as={ICON_LINK} size={16} color="$textSecondary" />
    </HStack>
  </TouchableOpacity>
);

const CoinInfo: React.FC<CoinInfoProps> = ({ metadata }) => {
  const handleLinkPress = (url?: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <VStack space="lg">
      {metadata.description && (
        <Box>
          <Text color="$text" fontWeight="$bold" fontSize="$lg" mb="$2">About</Text>
          <Text color="$textSecondary" fontSize="$base">{metadata.description}</Text>
        </Box>
      )}

      <Box>
        <Text color="$text" fontWeight="$bold" fontSize="$lg" mb="$2">Details</Text>

        {metadata.decimals !== undefined && (
          <HStack justifyContent="space-between" py="$2">
            <Text color="$textSecondary" fontSize="$base">Decimals</Text>
            <Text color="$text" fontSize="$base">{metadata.decimals}</Text>
          </HStack>
        )}

        {metadata.daily_volume !== undefined && (
          <HStack justifyContent="space-between" py="$2">
            <Text color="$textSecondary" fontSize="$base">24h Volume</Text>
            <Text color="$text" fontSize="$base">
              ${formatNumber(metadata.daily_volume)}
            </Text>
          </HStack>
        )}

        {metadata.tags && metadata.tags.length > 0 && (
          <Box mt="$2">
            <Text color="$textSecondary" fontSize="$base" mb="$2">Tags</Text>
            <HStack flexWrap="wrap" gap="$2">
              {metadata.tags.map((tag, index) => (
                <Box 
                  key={index}
                  bg="$backgroundDark"
                  px="$3"
                  py="$1"
                  rounded="$full"
                >
                  <Text color="$text" fontSize="$sm">{tag}</Text>
                </Box>
              ))}
            </HStack>
          </Box>
        )}
      </Box>

      <Box>
        <Text color="$text" fontWeight="$bold" fontSize="$lg" mb="$2">Links</Text>
        <Box bg="$backgroundLight" rounded="$lg">
          {metadata.website && (
            <>
              <LinkItem
                icon={ICON_WEBSITE}
                label="Website"
                value={metadata.website}
                onPress={() => handleLinkPress(metadata.website)}
              />
              <Divider bg="$borderLight" />
            </>
          )}

          {metadata.twitter && (
            <>
              <LinkItem
                icon={ICON_TWITTER}
                label="Twitter"
                value={`@${metadata.twitter}`}
                onPress={() => handleLinkPress(`https://twitter.com/${metadata.twitter}`)}
              />
              <Divider bg="$borderLight" />
            </>
          )}

          {metadata.telegram && (
            <>
              <LinkItem
                icon={ICON_TELEGRAM}
                label="Telegram"
                value={metadata.telegram}
                onPress={() => handleLinkPress(`https://t.me/${metadata.telegram}`)}
              />
              <Divider bg="$borderLight" />
            </>
          )}

          {metadata.discord && (
            <LinkItem
              icon={ICON_DISCORD}
              label="Discord"
              value={metadata.discord}
              onPress={() => handleLinkPress(metadata.discord)}
            />
          )}
        </Box>
      </Box>
    </VStack>
  );
};

export default CoinInfo;
