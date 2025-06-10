import React from 'react';
import { ScrollView, View } from 'react-native';
import { Modal, Portal, Text, Button, useTheme } from 'react-native-paper';
import { createStyles } from './styles';
import { TermsModalProps } from './types';
import { logger } from '@/utils/logger';

const TermsModal: React.FC<TermsModalProps> = ({
  isVisible,
  onAccept,
  onClose,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const handleAccept = () => {
    logger.breadcrumb({ category: 'ui', message: 'Terms and conditions accepted' });
    onAccept();
    onClose();
  };

  return (
    <Portal>
      <Modal
        visible={isVisible}
        onDismiss={onClose}
        contentContainerStyle={styles.container}
        dismissable={true}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Terms & Conditions</Text>
        </View>

        <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={true}>
          <Text style={styles.subtitle}>
            Welcome to DankFolio! Please read these terms carefully.
          </Text>
          
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing or using DankFolio, you agree to be bound by these Terms and Conditions 
            and our Privacy Policy. If you do not agree to these terms, please do not use our services.
          </Text>
          
          <Text style={styles.sectionTitle}>2. Meme Trading</Text>
          <Text style={styles.paragraph}>
            DankFolio is a platform for trading cryptocurrency tokens related to internet memes and culture.
            All transactions are executed on the Solana blockchain and subject to network fees and conditions.
          </Text>

          <Text style={styles.sectionTitle}>3. Risks</Text>
          <Text style={styles.paragraph}>
            Cryptocurrency trading involves significant risk. The value of meme tokens can be extremely volatile.
            You should never invest more than you can afford to lose. Past performance is not indicative of future results.
          </Text>

          <Text style={styles.sectionTitle}>4. Account Security</Text>
          <Text style={styles.paragraph}>
            You are responsible for maintaining the confidentiality of your wallet credentials and 
            recovery phrase. Never share your private keys or recovery phrases with anyone.
            DankFolio will never ask for this information.
          </Text>

          <Text style={styles.sectionTitle}>5. Prohibited Activities</Text>
          <Text style={styles.paragraph}>
            Users may not engage in market manipulation, fraudulent activities, or use of the platform
            for any illegal purposes. DankFolio reserves the right to restrict or terminate service to
            any user engaged in prohibited activities.
          </Text>

          <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            To the maximum extent permitted by law, DankFolio shall not be liable for any direct,
            indirect, incidental, special, consequential or exemplary damages resulting from your
            use or inability to use the service.
          </Text>

          <Text style={styles.sectionTitle}>7. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            DankFolio may modify these terms at any time. We will provide notice of significant changes.
            Your continued use of the platform constitutes acceptance of the updated terms.
          </Text>

          <Text style={styles.sectionTitle}>8. Governing Law</Text>
          <Text style={styles.paragraph}>
            These terms shall be governed by and construed in accordance with the laws of the jurisdiction
            in which DankFolio operates, without regard to its conflict of law provisions.
          </Text>

          <View style={styles.spacer} />
        </ScrollView>

        <View style={styles.actionSection}>
          <Button
            mode="outlined"
            onPress={onClose}
            style={styles.cancelButton}
          >
            <Text>Decline</Text>
          </Button>
          <Button
            mode="contained"
            onPress={handleAccept}
            style={styles.acceptButton}
          >
            <Text>Accept</Text>
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

export default TermsModal; 