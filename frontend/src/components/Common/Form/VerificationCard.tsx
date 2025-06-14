import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useStyles, VerificationStatus } from './VerificationCard.styles';

interface VerificationCardProps {
  status: VerificationStatus;
  message?: string;
  title?: string;
}

const VerificationCard: React.FC<VerificationCardProps> = ({
  status,
  message,
  title,
}) => {
  const styles = useStyles();

  const getStatusStyle = () => {
    switch (status) {
      case 'valid':
        return styles.cardValid;
      case 'invalid':
        return styles.cardInvalid;
      case 'checking':
        return styles.cardChecking;
      case 'warning':
        return styles.cardWarning;
      case 'idle':
      default:
        return styles.cardIdle;
    }
  };

  const getIconInfo = (): { name: string; color: string } | null => {
    switch (status) {
      case 'valid':
        return { name: 'check-circle-outline', color: styles.textValid.color || styles.title.color };
      case 'invalid':
        return { name: 'alert-circle-outline', color: styles.textInvalid.color || styles.title.color };
      case 'warning':
        return { name: 'alert-outline', color: styles.textWarning.color || styles.title.color };
      // For 'checking', we show ActivityIndicator instead of an icon from this function
      // For 'idle', no icon by default unless specified via props (not implemented here)
      default:
        return null;
    }
  };

  const iconInfo = getIconInfo();
  const cardStyle = getStatusStyle();
  const defaultTitle = status.charAt(0).toUpperCase() + status.slice(1);

  if (status === 'idle' && !message) {
    return null; // Don't render anything if idle and no message
  }

  return (
    <View style={cardStyle} testID={`verification-card-${status}`}>
      <View style={styles.header}>
        {status === 'checking' ? (
          <ActivityIndicator size="small" color={styles.textChecking.color || styles.title.color} style={styles.iconContainer} />
        ) : iconInfo ? (
          <View style={styles.iconContainer}>
            <Icon source={iconInfo.name} size={24} color={iconInfo.color} />
          </View>
        ) : null}
        <Text style={[styles.title, status === 'valid' && styles.textValid, status === 'invalid' && styles.textInvalid, status === 'warning' && styles.textWarning, status === 'checking' && styles.textChecking]}>
          {title || defaultTitle}
        </Text>
      </View>
      {message && (
        <Text style={[styles.message, status === 'valid' && styles.textValid, status === 'invalid' && styles.textInvalid, status === 'warning' && styles.textWarning, status === 'checking' && styles.textChecking]}>
          {message}
        </Text>
      )}
    </View>
  );
};

export default VerificationCard;
