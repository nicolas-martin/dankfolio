import React, { useCallback } from 'react';
import { TouchableOpacity, Linking, View, StyleSheet } from 'react-native';
import { Text, Icon, useTheme, Divider } from 'react-native-paper';
import { CoinInfoProps } from './coininfo_types';
import {
  ICON_WEBSITE,
  ICON_TWITTER,
  ICON_TELEGRAM,
  ICON_DISCORD,
  ICON_LINK,
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

interface LinkItemProps {
  icon: any;
  label: string;
  value: string;
  onPress: (url: string) => void;
}

const LinkItem: React.FC<LinkItemProps> = ({ icon: IconComponent, label, value, onPress }) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <TouchableOpacity onPress={() => onPress(value)}>
      <View style={styles.linkItemContainer}>
        <View style={[styles.linkItemIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Icon source={IconComponent} size={20} color={theme.colors.onSurface} />
        </View>
        <View style={styles.linkItemTextContainer}>
          <Text style={[styles.linkItemLabel, { color: theme.colors.onSurface }]}>{label}</Text>
          <Text style={[styles.linkItemValue, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{value}</Text>
        </View>
        <Icon source={ICON_LINK} size={16} color={theme.colors.onSurfaceVariant} />
      </View>
    </TouchableOpacity>
  );
};

const CoinInfo: React.FC<CoinInfoProps> = ({ metadata }) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const handleLinkPress = useCallback((url?: string) => {
    if (url) {
      const validUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      Linking.openURL(validUrl);
    }
  }, []);

  return (
    <View style={styles.container}>
      {metadata.description && (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>About</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 16 }}>{metadata.description}</Text>
        </View>
      )}

      <View>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Details</Text>

        {metadata.decimals !== undefined && (
          <View style={styles.detailRow}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 16 }}>Decimals</Text>
            <Text style={{ color: theme.colors.onSurface, fontSize: 16 }}>{metadata.decimals}</Text>
          </View>
        )}

        {metadata.daily_volume !== undefined && (
          <View style={styles.detailRow}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 16 }}>24h Volume</Text>
            <Text style={{ color: theme.colors.onSurface, fontSize: 16 }}>
              ${formatNumber(metadata.daily_volume)}
            </Text>
          </View>
        )}

        {metadata.tags && metadata.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 16, marginBottom: 8 }}>Tags</Text>
            <View style={styles.tagsInnerContainer}>
              {metadata.tags.map((tag, index) => (
                <View
                  key={index}
                  style={[styles.tagItem, { backgroundColor: theme.colors.surfaceVariant }]}
                >
                  <Text style={{ color: theme.colors.onSurface, fontSize: 14 }}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Links</Text>
        <View style={{ backgroundColor: theme.colors.surfaceVariant, borderRadius: 8 }}>
          {metadata.website && (
            <>
              <LinkItem
                icon={ICON_WEBSITE}
                label="Website"
                value={metadata.website}
                onPress={handleLinkPress}
              />
              <Divider style={{ backgroundColor: theme.colors.outline }} />
            </>
          )}

          {metadata.twitter && (
            <>
              <LinkItem
                icon={ICON_TWITTER}
                label="Twitter"
                value={`@${metadata.twitter}`}
                onPress={handleLinkPress}
              />
              <Divider style={{ backgroundColor: theme.colors.outline }} />
            </>
          )}

          {metadata.telegram && (
            <>
              <LinkItem
                icon={ICON_TELEGRAM}
                label="Telegram"
                value={metadata.telegram}
                onPress={handleLinkPress}
              />
              <Divider style={{ backgroundColor: theme.colors.outline }} />
            </>
          )}

          {metadata.discord && (
            <LinkItem
              icon={ICON_DISCORD}
              label="Discord"
              value={metadata.discord}
              onPress={handleLinkPress}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    padding: 16,
  },
  linkItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  linkItemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 999,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkItemTextContainer: {
    flex: 1,
  },
  linkItemLabel: {
    fontWeight: '500',
    fontSize: 16,
  },
  linkItemValue: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  tagsContainer: {
    marginTop: 8,
  },
  tagsInnerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagItem: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
});

export default CoinInfo;
