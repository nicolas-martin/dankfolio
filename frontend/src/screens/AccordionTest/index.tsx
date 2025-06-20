import React, { useState, useCallback } from 'react';
import { ScrollView, SafeAreaView } from 'react-native';
import { Text, List, Button, Card } from 'react-native-paper';
import { useStyles } from './styles';

// Mock data to test the accordion
const mockSolFeeBreakdown = {
	tradingFee: '0.002500',
	transactionFee: '0.000005',
	accountCreationFee: '0.002039',
	priorityFee: '0.000100',
	total: '0.004644',
	accountsToCreate: 1
};

const AccordionTest: React.FC = () => {
	const styles = useStyles();
	const [expanded1, setExpanded1] = useState(false);
	const [expanded2, setExpanded2] = useState(false);
	const [expanded3, setExpanded3] = useState(false);

	const handlePress1 = useCallback(() => {
		console.log('Accordion 1 pressed, current expanded:', expanded1);
		setExpanded1(!expanded1);
	}, [expanded1]);

	const handlePress2 = useCallback(() => {
		console.log('Accordion 2 pressed, current expanded:', expanded2);
		setExpanded2(!expanded2);
	}, [expanded2]);

	const handlePress3 = useCallback(() => {
		console.log('Accordion 3 pressed, current expanded:', expanded3);
		setExpanded3(!expanded3);
	}, [expanded3]);

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
				<Text variant="headlineMedium" style={styles.title}>
					List.Accordion Test Screen
				</Text>

				{/* Test 1: Simple Accordion */}
				<Card style={styles.card}>
					<Card.Title title="Test 1: Simple Accordion" />
					<Card.Content>
						<List.Accordion
							title="Simple Test Accordion"
							description="Tap to expand/collapse"
							expanded={expanded1}
							onPress={handlePress1}
							testID="simple-accordion"
						>
							<List.Item
								title="Item 1"
								description="This is item 1"
							/>
							<List.Item
								title="Item 2"
								description="This is item 2"
							/>
						</List.Accordion>
					</Card.Content>
				</Card>

				{/* Test 2: Accordion with Custom Styles */}
				<Card style={styles.card}>
					<Card.Title title="Test 2: Styled Accordion" />
					<Card.Content>
						<List.Accordion
							title="Styled Test Accordion"
							description="With custom styles"
							expanded={expanded2}
							onPress={handlePress2}
							titleStyle={styles.accordionTitle}
							descriptionStyle={styles.accordionDescription}
							style={styles.accordionContainer}
							testID="styled-accordion"
						>
							<List.Item
								title="Styled Item 1"
								titleStyle={styles.listItemTitle}
							/>
							<List.Item
								title="Styled Item 2"
								titleStyle={styles.listItemTitle}
							/>
						</List.Accordion>
					</Card.Content>
				</Card>

				{/* Test 3: Fee Breakdown Accordion (like TradeDetails) */}
				<Card style={styles.card}>
					<Card.Title title="Test 3: Fee Breakdown Accordion" />
					<Card.Content>
						<List.Accordion
							title={`Total Fee: ${mockSolFeeBreakdown.total} SOL`}
							description="Tap to see fee breakdown"
							expanded={expanded3}
							onPress={handlePress3}
							titleStyle={styles.accordionTitle}
							descriptionStyle={styles.accordionDescription}
							style={styles.accordionContainer}
							testID="fee-accordion"
						>
							{parseFloat(mockSolFeeBreakdown.tradingFee) > 0 && (
								<List.Item
									title={`Trading: ${mockSolFeeBreakdown.tradingFee} SOL`}
									titleStyle={styles.feeBreakdownItem}
								/>
							)}

							{parseFloat(mockSolFeeBreakdown.transactionFee) > 0 && (
								<List.Item
									title={`Transaction: ${mockSolFeeBreakdown.transactionFee} SOL`}
									titleStyle={styles.feeBreakdownItem}
								/>
							)}

							{parseFloat(mockSolFeeBreakdown.accountCreationFee) > 0 && (
								<List.Item
									title={`Account creation: ${mockSolFeeBreakdown.accountCreationFee} SOL (${mockSolFeeBreakdown.accountsToCreate} account)`}
									titleStyle={styles.feeBreakdownItem}
								/>
							)}

							{parseFloat(mockSolFeeBreakdown.priorityFee) > 0 && (
								<List.Item
									title={`Priority: ${mockSolFeeBreakdown.priorityFee} SOL`}
									titleStyle={styles.feeBreakdownItem}
								/>
							)}

							<List.Item
								title="💡 Most cost is for creating new token accounts (one-time setup)"
								titleStyle={styles.helpText}
							/>
						</List.Accordion>
					</Card.Content>
				</Card>

				{/* Debug Info */}
				<Card style={styles.card}>
					<Card.Title title="Debug Info" />
					<Card.Content>
						<Text style={styles.debugText}>Accordion 1 expanded: {expanded1 ? 'true' : 'false'}</Text>
						<Text style={styles.debugText}>Accordion 2 expanded: {expanded2 ? 'true' : 'false'}</Text>
						<Text style={styles.debugText}>Accordion 3 expanded: {expanded3 ? 'true' : 'false'}</Text>
						
						<Button
							mode="outlined"
							onPress={() => {
								console.log('Debug button pressed');
								console.log('States:', { expanded1, expanded2, expanded3 });
							}}
							style={styles.debugButton}
							// eslint-disable-next-line react-native/no-raw-text
						>
							Debug: Log States
						</Button>
					</Card.Content>
				</Card>

			</ScrollView>
		</SafeAreaView>
	);
};

export default AccordionTest;