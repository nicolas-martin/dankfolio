import React, { useState } from "react";
import { ScrollView, SafeAreaView, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "./termsofservice_styles";
import ScreenHeader from "@/components/Common/ScreenHeader";
import { handleAcceptTerms, handleCheckboxToggle, TERMS_CONTENT } from "./termsofservice_scripts";

interface TermsOfServiceProps {
	onTermsAccepted?: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onTermsAccepted }) => {
	const styles = useStyles();
	const [isAccepted, setIsAccepted] = useState(false);

	const onAcceptTerms = () => {
		handleAcceptTerms(() => {
			onTermsAccepted?.();
		});
	};

	const onToggleCheckbox = () => {
		handleCheckboxToggle(isAccepted, setIsAccepted);
	};

	return (
		<View style={styles.container}>
			<SafeAreaView style={styles.flex}>
				<ScreenHeader title="Terms of Service" />

				<ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
					<View style={styles.contentContainer}>
						<Text style={styles.lastUpdated}>Last updated: January 1, 2025</Text>

						{TERMS_CONTENT.map((section, index) => (
							<React.Fragment key={index}>
								<Text style={styles.sectionTitle}>{section.title}</Text>
								<Text style={styles.sectionContent}>{section.content}</Text>
							</React.Fragment>
						))}
					</View>
				</ScrollView>

				<TouchableOpacity style={styles.checkboxContainer} onPress={onToggleCheckbox}>
					<View style={styles.checkbox}>
						{isAccepted && <Ionicons name="checkmark" size={18} color="white" />}
					</View>
					<Text style={styles.checkboxText}>
						I have read and agree to the Terms of Service
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={React.useMemo(() => [
						styles.acceptButton,
						isAccepted ? styles.acceptButtonEnabled : styles.acceptButtonDisabled
					], [styles.acceptButton, styles.acceptButtonEnabled, styles.acceptButtonDisabled, isAccepted])}
					disabled={!isAccepted}
					onPress={onAcceptTerms}
				>
					<Text style={styles.acceptButtonText}>Accept and Continue</Text>
				</TouchableOpacity>
			</SafeAreaView>
		</View>
	);
};

export default TermsOfService;
