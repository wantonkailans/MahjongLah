import React, { useState, useEffect, useCallback } from 'react';
import {
StyleSheet,
View,
Text,
TouchableOpacity,
ScrollView,
ActivityIndicator,
Modal,
Image,
Alert,
Platform,
StatusBar,
SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function DiceRollGameScreen({ route }) {
const navigation = useNavigation();

// Extract players data from navigation params
const { players: initialPlayers } = route.params || { players: [] };

// Game logic states
const [players, setPlayers] = useState(
initialPlayers.map((player, index) => ({
id: player.uid || `player_${index}`,
name: player.displayName || player.username,
roll: null,
hasRolled: false,
originalIndex: index // Keep track of original seating order
}))
);

const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
const [message, setMessage] = useState('');
const [messageType, setMessageType] = useState('info');
const [gameSessionId, setGameSessionId] = useState(null);
const [isLoading, setIsLoading] = useState(false);

// Modal state for banker announcement
const [isBankerModalVisible, setIsBankerModalVisible] = useState(false);
const [bankerInfo, setBankerInfo] = useState(null);
const [distributorInfo, setDistributorInfo] = useState(null);

// State to hold the current player's dice roll for local display
const [currentRollsDisplay, setCurrentRollsDisplay] = useState({});

// Keep track of players who need to re-roll (ESSENTIAL FOR TIE BREAKER)
const [playersToReroll, setPlayersToReroll] = useState([]);

// Track if this is the initial round or a re-roll round (ESSENTIAL FOR TIE BREAKER)
const [isInitialRound, setIsInitialRound] = useState(true);

// Set initial message when component mounts
useEffect(() => {
if (players.length > 0) {
setMessage(`It's ${players[0].name}'s turn to roll!`);

// Initialize currentRollsDisplay for all players to '?'
const initialRolls = {};
players.forEach(player => {
initialRolls[player.id] = '?';
});
setCurrentRollsDisplay(initialRolls);

// Create a game session ID
const sessionId = `game_${Date.now()}_${Math.random().toString(36).substring(7)}`;
setGameSessionId(sessionId);
}
}, []);

// Utility functions for messages
const showMessage = useCallback((msg, type = 'info') => {
setMessage(msg);
setMessageType(type);
}, []);

const hideMessageBox = useCallback(() => {
setMessage('');
}, []);

// Dice rolling function
const rollDice = () => Math.floor(Math.random() * 6) + 1;

// Handle a player rolling the dice
const handlePlayerRoll = useCallback(async (playerToRollId) => {
const playerIndex = players.findIndex(p => p.id === playerToRollId);
if (playerIndex === -1 || playerIndex !== currentPlayerIndex) {
return; // Not the current player's turn or player not found
}

const newRoll = rollDice();
console.log(`${players[playerIndex].name} rolled: ${newRoll}`);

// Update local display immediately
setCurrentRollsDisplay(prev => ({ ...prev, [playerToRollId]: newRoll }));

const updatedPlayers = players.map((p, idx) =>
idx === playerIndex ? { ...p, roll: newRoll, hasRolled: true } : p
);
setPlayers(updatedPlayers);

hideMessageBox();

// Check if all required players have rolled
const allRequiredPlayersRolled = checkAllPlayersRolled(updatedPlayers);

console.log('All required players rolled:', allRequiredPlayersRolled);
console.log('Is initial round:', isInitialRound);
console.log('Players to reroll:', playersToReroll);

if (!allRequiredPlayersRolled) {
// Find next player who hasn't rolled
const nextPlayerIndex = findNextPlayerToRoll(updatedPlayers);
console.log('Next player index:', nextPlayerIndex);
if (nextPlayerIndex !== -1) {
setCurrentPlayerIndex(nextPlayerIndex);
showMessage(`It's ${updatedPlayers[nextPlayerIndex].name}'s turn to roll!`);
}
} else {
// All required players have rolled, resolve the game
console.log('All players have rolled, resolving...');
resolveDiceRolls(updatedPlayers);
}
}, [players, currentPlayerIndex, showMessage, hideMessageBox, playersToReroll, isInitialRound]);

// Check if all required players have rolled
const checkAllPlayersRolled = useCallback((currentPlayersState) => {
if (isInitialRound) {
// In initial round, ALL players must roll
const result = currentPlayersState.every(p => p.hasRolled);
console.log('Initial round - all players rolled:', result);
return result;
} else {
// In re-roll round, only players who need to re-roll must roll
const result = playersToReroll.every(rerollPlayer => {
const player = currentPlayersState.find(p => p.id === rerollPlayer.id);
const hasRolled = player && player.hasRolled;
console.log(`Reroll player ${rerollPlayer.name} has rolled:`, hasRolled);
return hasRolled;
});
console.log('Reroll round - all required players rolled:', result);
return result;
}
}, [isInitialRound, playersToReroll]);

// Find next player who needs to roll
const findNextPlayerToRoll = useCallback((currentPlayersState) => {
if (isInitialRound) {
// Find next player in order who hasn't rolled
for (let i = 1; i <= currentPlayersState.length; i++) {
const checkIdx = (currentPlayerIndex + i) % currentPlayersState.length;
if (!currentPlayersState[checkIdx].hasRolled) {
console.log(`Initial round - next player index: ${checkIdx} (${currentPlayersState[checkIdx].name})`);
return checkIdx;
}
}
} else {
// Find next player who needs to re-roll and hasn't rolled yet
// Find the tied players in their original order
const tiedPlayersInOrder = currentPlayersState
.filter(p => playersToReroll.some(rerollPlayer => rerollPlayer.id === p.id))
.sort((a, b) => a.originalIndex - b.originalIndex);

// Find current tied player and get next one
const currentTiedPlayerIndex = tiedPlayersInOrder.findIndex(p => p.id === currentPlayersState[currentPlayerIndex].id);

for (let i = 1; i <= tiedPlayersInOrder.length; i++) {
const nextTiedPlayerIndex = (currentTiedPlayerIndex + i) % tiedPlayersInOrder.length;
const nextTiedPlayer = tiedPlayersInOrder[nextTiedPlayerIndex];
if (!nextTiedPlayer.hasRolled) {
const actualIndex = currentPlayersState.findIndex(p => p.id === nextTiedPlayer.id);
console.log(`Reroll round - next player index: ${actualIndex} (${nextTiedPlayer.name})`);
return actualIndex;
}
}
}
return -1; // No more players need to roll
}, [currentPlayerIndex, isInitialRound, playersToReroll]);

// Resolve dice rolls (determine banker or ties)
const resolveDiceRolls = useCallback((currentPlayersState) => {
console.log("=== RESOLVING DICE ROLLS ===");
console.log("Is initial round:", isInitialRound);
console.log("Players to reroll:", playersToReroll);
console.log("Current player states:", currentPlayersState);

// Determine which players to consider based on round type
const playersToConsider = isInitialRound
? currentPlayersState // All players in initial round
: currentPlayersState.filter(p => playersToReroll.some(rerollPlayer => rerollPlayer.id === p.id)); // Only re-roll players

console.log("Players to consider for resolution:", playersToConsider);

// Filter out players who haven't rolled yet or have null rolls
const rolledPlayersInConsideration = playersToConsider.filter(p => p.roll !== null && p.hasRolled);

console.log("Players who have actually rolled:", rolledPlayersInConsideration);

// If no one has rolled yet, defer resolution
if (rolledPlayersInConsideration.length === 0) {
console.log("No players have rolled yet. Deferring resolution.");
return;
}

// Find the highest roll among those who have rolled
const sortedPlayers = [...rolledPlayersInConsideration].sort((a, b) => b.roll - a.roll);
const highestRoll = sortedPlayers[0].roll;
const winners = sortedPlayers.filter(p => p.roll === highestRoll);

console.log("Sorted players by roll:", sortedPlayers);
console.log("Highest roll:", highestRoll);
console.log("Winners (tied players):", winners);

if (winners.length === 1) {
console.log("✅ SINGLE WINNER - SETTING BANKER");
// Single winner - this player becomes the banker
const banker = winners[0];

// Find distributor by counting clockwise from first player based on banker's roll
const distributor = findDistributor(banker.roll, initialPlayers.map((player, index) => ({
id: player.uid || `player_${index}`,
name: player.displayName || player.username,
originalIndex: index
})));

console.log("Banker:", banker);
console.log("Distributor:", distributor);

setBankerInfo(banker);
setDistributorInfo(distributor);
setIsBankerModalVisible(true);
hideMessageBox();

// Reset states for next game
setPlayersToReroll([]);
setIsInitialRound(true);

} else {
console.log("🔄 TIE DETECTED - INITIATING REROLL");
// Tie detected - ALL tied players must re-roll
const tiedPlayersNames = winners.map(p => p.name).join(', ');
showMessage(`Tie detected! ${tiedPlayersNames} rolled ${highestRoll}. All tied players must roll again!`, 'info');

// Set players who need to reroll (all tied players)
setPlayersToReroll(winners);
setIsInitialRound(false); // Now in re-roll mode

console.log("Setting players to reroll:", winners);

// Reset only the tied players' roll data
const resetPlayers = currentPlayersState.map(p => {
if (winners.find(w => w.id === p.id)) {
console.log(`Resetting ${p.name} for reroll`);
return { ...p, roll: null, hasRolled: false };
}
return p; // Keep non-tied players' data intact
});

setPlayers(resetPlayers);

// Set current player to first tied player in original order for the re-roll
const firstTiedPlayerInOriginalOrder = resetPlayers
.filter(p => winners.some(w => w.id === p.id)) // Filter to only tied players
.sort((a, b) => a.originalIndex - b.originalIndex)[0]; // Sort by original index

if (firstTiedPlayerInOriginalOrder) {
const firstTiedPlayerIndex = resetPlayers.findIndex(p => p.id === firstTiedPlayerInOriginalOrder.id);
setCurrentPlayerIndex(firstTiedPlayerIndex);
showMessage(`${firstTiedPlayerInOriginalOrder.name}, you're first to roll again!`);
console.log(`First tied player to roll: ${firstTiedPlayerInOriginalOrder.name} (index: ${firstTiedPlayerIndex})`);
}

// Reset roll displays only for tied players
const resetRollsDisplay = { ...currentRollsDisplay };
winners.forEach(p => {
resetRollsDisplay[p.id] = '?';
});
setCurrentRollsDisplay(resetRollsDisplay);
}
}, [players, currentRollsDisplay, showMessage, hideMessageBox, playersToReroll, isInitialRound, initialPlayers]);

// Find distributor by counting clockwise from first player based on banker's roll
const findDistributor = useCallback((bankerRoll, playerList) => {
// Use the original username entry order (originalIndex) for counting
const sortedByOriginalOrder = [...playerList].sort((a, b) => a.originalIndex - b.originalIndex);

// Count clockwise from the first player (index 0) based on banker's roll
// If banker rolls 1, first player distributes
// If banker rolls 2, second player distributes, etc.
const distributorIndex = (bankerRoll - 1) % sortedByOriginalOrder.length;

return sortedByOriginalOrder[distributorIndex];
}, []);

// Loading state
if (isLoading) {
return (
<View style={styles.loadingContainer}>
<ActivityIndicator size="large" color="#F8B100" />
<Text style={styles.loadingText}>Setting up the game...</Text>
</View>
);
}

// If no players data (error handling)
if (players.length === 0) {
return (
<View style={styles.loadingContainer}>
<Text style={styles.errorText}>No player data found. Please go back and try again.</Text>
<TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
<Text style={styles.primaryButtonText}>Go Back</Text>
</TouchableOpacity>
</View>
);
}

return (
<SafeAreaView style={styles.fullScreenContainer}>
{/* Header */}
<View style={styles.header}>
<TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()}>
<Text style={styles.navButtonText}>← Back</Text>
</TouchableOpacity>
<Text style={styles.headerTitle}>Dice Roll</Text>
<View style={styles.navButtonPlaceholder} />
</View>

{/* Content Container */}
<View style={styles.contentContainer}>
<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
<Text style={styles.title}>🎲 Roll the Dice!</Text>

{/* Show round indicator for tie-breaker */}
{!isInitialRound && playersToReroll.length > 0 && (
<View style={styles.roundIndicator}>
<Text style={styles.roundIndicatorText}>
🎲 TIE BREAKER ROUND 🎲
</Text>
<Text style={styles.roundIndicatorSubText}>
{playersToReroll.map(p => p.name).join(', ')} must roll again!
</Text>
</View>
)}

{players.map((player, index) => {
// Determine if this player should be shown and if they need to roll
const needsToRollInThisRound = isInitialRound
? true // Show all players in initial round
: playersToReroll.some(rerollPlayer => rerollPlayer.id === player.id); // Only show tied players in re-roll

// Don't render players who don't need to reroll in reroll situations
if (!needsToRollInThisRound && !isInitialRound) {
return null;
}

const isCurrentPlayer = index === currentPlayerIndex;
const canRoll = isCurrentPlayer && !player.hasRolled && needsToRollInThisRound;

return (
<View
key={player.id}
style={[
styles.playerCard,
canRoll && styles.currentPlayerCard
]}
>
<Image
source={require('../assets/images/boy1.png')}
style={styles.playerAvatar}
/>
<Text style={styles.playerCardName}>{player.name}</Text>

{player.hasRolled ? (
<View style={styles.rollResultContainer}>
<Text style={styles.rollResultText}>Rolled: {currentRollsDisplay[player.id]}</Text>
</View>
) : (
<TouchableOpacity
style={[
styles.rollButton,
!canRoll && styles.disabledButton
]}
onPress={() => handlePlayerRoll(player.id)}
disabled={!canRoll}
>
<Text style={styles.rollButtonText}>
{canRoll ? 'Roll!' : 'Wait...'}
</Text>
</TouchableOpacity>
)}
</View>
);
})}

{message ? (
<View style={[styles.messageBox, styles[`messageBox_${messageType}`]]}>
<Text style={styles.messageText}>{message}</Text>
</View>
) : null}

{/* Show progress indicator */}
<View style={styles.progressContainer}>
<Text style={styles.progressText}>
{isInitialRound
? `Initial Round - Players rolled: ${players.filter(p => p.hasRolled).length}/${players.length}`
: `Tie Breaker - Tied players rolled: ${playersToReroll.filter(p => players.find(player => player.id === p.id && player.hasRolled)).length}/${playersToReroll.length}`
}
</Text>
{/* Only show current highest if it's the initial round and someone has rolled */}
{isInitialRound && players.some(p => p.hasRolled) && (
<Text style={styles.progressSubText}>
Current highest: {Math.max(...players.filter(p => p.hasRolled && p.roll !== null).map(p => p.roll))}
</Text>
)}
</View>
</ScrollView>
</View>

{/* Bottom Navigation Bar */}
<View style={styles.bottomNavBar}>
<TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
<View style={styles.navIconContainer}>
<Text style={styles.navTextIcon}>🏠</Text>
</View>
</TouchableOpacity>

<TouchableOpacity style={styles.navItem} onPress={() => console.log('Search pressed')}>
<View style={styles.navIconContainer}>
<Text style={styles.navTextIcon}>🔍</Text>
</View>
</TouchableOpacity>

<TouchableOpacity style={styles.navItem} onPress={() => console.log('Profile pressed')}>
<View style={styles.navIconContainer}>
<Text style={styles.navTextIcon}>👤</Text>
</View>
</TouchableOpacity>
</View>

{/* Banker Announcement Modal */}
<Modal
animationType="fade"
transparent={true}
visible={isBankerModalVisible}
onRequestClose={() => setIsBankerModalVisible(false)}
>
<View style={styles.modalOverlay}>
<View style={styles.modalContent}>
<Text style={styles.modalTitle}>🎉 Banker Announced!</Text>

{bankerInfo && (
<View style={styles.modalPlayerInfo}>
<Image source={require('../assets/images/boy1.png')} style={styles.modalAvatar} />
<View style={styles.modalPlayerDetails}>
<Text style={styles.modalPlayerName}>{bankerInfo.name}</Text>
<Text style={styles.modalPlayerRole}>is the Banker!</Text>
<Text style={styles.modalPlayerRoll}>Rolled: {bankerInfo.roll}</Text>
</View>
</View>
)}

{distributorInfo && (
<View style={[styles.modalPlayerInfo, { marginTop: 20 }]}>
<Image source={require('../assets/images/boy1.png')} style={styles.modalAvatar} />
<View style={styles.modalPlayerDetails}>
<Text style={styles.modalPlayerName}>{distributorInfo.name}</Text>
<Text style={styles.modalDistributorText}>
will distribute tiles (Position #{bankerInfo?.roll} clockwise from first player).
</Text>
</View>
</View>
)}

<TouchableOpacity
style={styles.primaryButton}
onPress={() => {
setIsBankerModalVisible(false);
// Navigate to the ChipCountingScreen, passing relevant data
navigation.navigate('ChipCounting', {
players: players,
banker: bankerInfo,
distributor: distributorInfo
});
}}
>
<Text style={styles.primaryButtonText}>Start Game!</Text>
</TouchableOpacity>
</View>
</View>
</Modal>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
fullScreenContainer: {
flex: 1,
backgroundColor: '#004d00',
},
loadingContainer: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
backgroundColor: '#004d00',
},
loadingText: {
color: '#fff',
marginTop: 10,
fontSize: 16,
},
errorText: {
color: '#fff',
fontSize: 16,
textAlign: 'center',
marginHorizontal: 20,
marginBottom: 20,
},
header: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
paddingHorizontal: 20,
paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
paddingBottom: 15,
backgroundColor: '#004d00',
},
navButton: {
paddingVertical: 8,
paddingHorizontal: 12,
borderRadius: 8,
},
navButtonText: {
color: '#fff',
fontSize: 16,
fontWeight: '600',
},
headerTitle: {
color: '#fff',
fontSize: 20,
fontWeight: 'bold',
flex: 1,
textAlign: 'center',
marginLeft: -10,
marginRight: -10,
},
navButtonPlaceholder: {
width: 44,
height: 44,
},
contentContainer: {
backgroundColor: '#fff',
borderRadius: 30,
marginTop: 20,
marginBottom: 20,
marginHorizontal: 20,
flex: 1,
maxHeight: '75%',
overflow: 'hidden',
},
scrollContent: {
padding: 20,
alignItems: 'center',
paddingBottom: 40,
},
title: {
color: '#004d00',
fontSize: 24,
marginBottom: 25,
fontWeight: 'bold',
textAlign: 'center',
},
roundIndicator: {
backgroundColor: '#fff3cd',
borderColor: '#F8B100',
borderWidth: 1,
borderRadius: 10,
padding: 12,
marginBottom: 15,
width: '100%',
},
roundIndicatorText: {
color: '#856404',
fontSize: 14,
fontWeight: 'bold',
textAlign: 'center',
},
roundIndicatorSubText: {
color: '#856404',
fontSize: 12,
fontWeight: '500',
textAlign: 'center',
marginTop: 4,
},
playerCard: {
backgroundColor: '#f9f9f9',
paddingVertical: 12,
paddingHorizontal: 15,
borderRadius: 12,
marginBottom: 10,
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
width: '100%',
borderWidth: 1,
borderColor: '#e0e0e0',
},
currentPlayerCard: {
borderWidth: 2,
borderColor: '#F8B100',
backgroundColor: '#fffbe6',
},
playerAvatar: {
width: 40,
height: 40,
borderRadius: 20,
marginRight: 12,
borderWidth: 2,
borderColor: '#004d00',
},
playerCardName: {
fontSize: 16,
color: '#333',
flex: 1,
fontWeight: '600',
},
rollButton: {
backgroundColor: '#F8B100',
paddingVertical: 10,
paddingHorizontal: 20,
borderRadius: 8,
minWidth: 80,
alignItems: 'center',
},
rollButtonText: {
color: '#000',
fontSize: 14,
fontWeight: 'bold',
},
disabledButton: {
backgroundColor: '#ccc',
opacity: 0.7,
},
rollResultContainer: {
backgroundColor: '#e6ffe6',
paddingVertical: 8,
paddingHorizontal: 15,
borderRadius: 8,
borderWidth: 1,
borderColor: '#004d00',
},
rollResultText: {
color: '#004d00',
fontSize: 14,
fontWeight: 'bold',
},
messageBox: {
padding: 15,
borderRadius: 10,
marginTop: 20,
width: '100%',
alignItems: 'center',
},
messageText: {
fontSize: 15,
textAlign: 'center',
fontWeight: '500',
},
messageBox_info: {
backgroundColor: '#fff3cd',
borderColor: '#F8B100',
borderWidth: 1,
color: '#856404',
},
messageBox_success: {
backgroundColor: '#d4edda',
borderColor: '#28a745',
borderWidth: 1,
color: '#155724',
},
messageBox_error: {
backgroundColor: '#f8d7da',
borderColor: '#dc3545',
borderWidth: 1,
color: '#721c24',
},
progressContainer: {
marginTop: 20,
padding: 12,
backgroundColor: '#e6ffe6',
borderRadius: 10,
borderWidth: 1,
borderColor: '#004d00',
width: '100%',
},
progressText: {
color: '#004d00',
fontSize: 13,
fontWeight: '600',
textAlign: 'center',
},
progressSubText: {
color: '#666',
fontSize: 12,
textAlign: 'center',
marginTop: 5,
},
primaryButton: {
backgroundColor: '#F8B100',
paddingVertical: 14,
paddingHorizontal: 30,
borderRadius: 10,
marginTop: 20,
width: '100%',
alignItems: 'center',
elevation: 3,
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.2,
shadowRadius: 3,
},
primaryButtonText: {
color: '#000',
fontSize: 17,
fontWeight: 'bold',
},
bottomNavBar: {
flexDirection: 'row',
justifyContent: 'space-around',
alignItems: 'center',
backgroundColor: '#fff',
paddingVertical: 15,
paddingBottom: Platform.OS === 'ios' ? 25 : 15,
borderTopLeftRadius: 25,
borderTopRightRadius: 25,
position: 'absolute',
bottom: 0,
left: 0,
right: 0,
elevation: 10,
shadowColor: '#000',
shadowOffset: { width: 0, height: -5 },
shadowOpacity: 0.15,
shadowRadius: 10,
},
navItem: {
flex: 1,
alignItems: 'center',
paddingVertical: 5,
},
navIconContainer: {
alignItems: 'center',
justifyContent: 'center',
width: 40,
height: 40,
},
navTextIcon: {
fontSize: 24,
color: '#666',
},
modalOverlay: {
flex: 1,
backgroundColor: 'rgba(0, 0, 0, 0.7)',
justifyContent: 'center',
alignItems: 'center',
},
modalContent: {
backgroundColor: '#fff',
padding: 25,
borderRadius: 15,
shadowColor: '#000',
shadowOffset: { width: 0, height: 8 },
shadowOpacity: 0.25,
shadowRadius: 15,
elevation: 15,
width: '85%',
maxWidth: 380,
alignItems: 'center',
},
modalTitle: {
fontSize: 22,
color: '#004d00',
marginBottom: 20,
fontWeight: 'bold',
textAlign: 'center',
},
modalPlayerInfo: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: '#f8fff8',
padding: 15,
borderRadius: 12,
width: '100%',
borderWidth: 1,
borderColor: '#004d00',
},
modalAvatar: {
width: 50,
height: 50,
borderRadius: 25,
marginRight: 15,
borderWidth: 2,
borderColor: '#F8B100',
},
modalPlayerDetails: {
flex: 1,
},
modalPlayerName: {
fontSize: 18,
fontWeight: 'bold',
color: '#004d00',
marginBottom: 4,
},
modalPlayerRole: {
fontSize: 15,
color: '#333',
fontWeight: '600',
},
modalPlayerRoll: {
fontSize: 13,
color: '#666',
marginTop: 4,
},
modalDistributorText: {
fontSize: 13,
color: '#666',
lineHeight: 18,
},
});