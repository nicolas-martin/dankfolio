import AsyncStorage from "@react-native-async-storage/async-storage";

export interface TermsSection {
  title: string;
  content: string;
}

export const STORAGE_KEYS = {
  TERMS_ACCEPTED: "@dankfolio/terms_accepted",
  TERMS_ACCEPTED_DATE: "@dankfolio/terms_accepted_date",
};

export const handleAcceptTerms = async (onSuccess: () => void) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, "true");
    await AsyncStorage.setItem(
      STORAGE_KEYS.TERMS_ACCEPTED_DATE,
      new Date().toISOString()
    );
    onSuccess();
  } catch (error) {
    console.error("Error saving terms acceptance:", error);
  }
};

export const handleCheckboxToggle = (
  currentState: boolean,
  setState: (value: boolean) => void
) => {
  setState(!currentState);
};

export const checkTermsAccepted = async (): Promise<boolean> => {
  try {
    const accepted = await AsyncStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTED);
    return accepted === "true";
  } catch (error) {
    console.error("Error checking terms acceptance:", error);
    return false;
  }
};

export const TERMS_CONTENT: TermsSection[] = [
  {
    title: "1. Acceptance of Terms",
    content:
      "By accessing or using Dankfolio, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our application.",
  },
  {
    title: "2. Description of Service",
    content:
      "Dankfolio is a decentralized application that provides a non-custodial wallet interface for trading meme coins on the Solana blockchain. We do not hold, control, or have access to your private keys or funds.",
  },
  {
    title: "3. Wallet Security",
    content:
      "You are solely responsible for maintaining the security of your wallet's private keys and recovery phrase. We strongly recommend storing your recovery phrase in a secure location. Loss of your recovery phrase may result in permanent loss of access to your funds.",
  },
  {
    title: "4. Trading Risks",
    content:
      "Trading cryptocurrencies, especially meme coins, involves substantial risk of loss. Prices can be extremely volatile. You should only trade with funds you can afford to lose. Past performance is not indicative of future results.",
  },
  {
    title: "5. No Investment Advice",
    content:
      "Nothing in this application constitutes investment, financial, legal, or tax advice. We do not recommend or endorse any specific cryptocurrencies. You should conduct your own research and consult with qualified professionals before making any trading decisions.",
  },
  {
    title: "6. Third-Party Services",
    content:
      "Dankfolio integrates with third-party services including Jupiter aggregator and Birdeye for market data. We are not responsible for the availability, accuracy, or security of these services.",
  },
  {
    title: "7. Fees",
    content:
      "You are responsible for all transaction fees on the Solana blockchain. Additional fees may apply for swaps through integrated DEX aggregators. All fees will be clearly displayed before you confirm any transaction.",
  },
  {
    title: "8. Compliance",
    content:
      "You are responsible for complying with all applicable laws and regulations in your jurisdiction. The use of this application may not be legal in all jurisdictions.",
  },
  {
    title: "9. Limitation of Liability",
    content:
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.",
  },
  {
    title: "10. Indemnification",
    content:
      "You agree to indemnify and hold harmless Dankfolio and its affiliates from any claims, losses, or damages arising from your use of the application or violation of these terms.",
  },
  {
    title: "11. Changes to Terms",
    content:
      "We reserve the right to modify these terms at any time. Continued use of the application after changes constitutes acceptance of the modified terms.",
  },
  {
    title: "12. Contact Information",
    content:
      "If you have any questions about these Terms of Service, please contact us through our support channels in the application.",
  },
];