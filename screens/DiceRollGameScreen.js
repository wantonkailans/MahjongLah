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

// Assuming these are correctly configured if you use them for persistence,

// otherwise, they can be removed if strictly local

// import { auth, db } from '../firebase';

// import { doc, getDoc, setDoc, onSnapshot, updateDoc, collection } from 'firebase/firestore';





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

const [gameSessionId, setGameSessionId] = useState(null); // Not used for now, but kept

const [isLoading, setIsLoading] = useState(false); // Not actively used for now, but kept



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



// Create a game session ID (not used for logic yet)

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



if (!allRequiredPlayersRolled) {

// Find next player who hasn't rolled

const nextPlayerIndex = findNextPlayerToRoll(updatedPlayers);

if (nextPlayerIndex !== -1) {

setCurrentPlayerIndex(nextPlayerIndex);

showMessage(`It's ${updatedPlayers[nextPlayerIndex].name}'s turn to roll!`);

}

} else {

// All required players have rolled, resolve the game

resolveDiceRolls(updatedPlayers);

}

}, [players, currentPlayerIndex, showMessage, hideMessageBox, playersToReroll, isInitialRound]);



// Check if all required players have rolled

const checkAllPlayersRolled = useCallback((currentPlayersState) => {

if (isInitialRound) {

// In initial round, ALL players must roll

return currentPlayersState.every(p => p.hasRolled);

} else {

// In re-roll round, only players who need to re-roll must roll

return playersToReroll.every(rerollPlayer => {

const player = currentPlayersState.find(p => p.id === rerollPlayer.id);

return player && player.hasRolled;

});

}

}, [isInitialRound, playersToReroll]);



// Find next player who needs to roll

const findNextPlayerToRoll = useCallback((currentPlayersState) => {

if (isInitialRound) {

// Find next player in order who hasn't rolled

for (let i = 1; i <= currentPlayersState.length; i++) {

const checkIdx = (currentPlayerIndex + i) % currentPlayersState.length;

if (!currentPlayersState[checkIdx].hasRolled) {

return checkIdx;

}

}

} else {

// Find next player who needs to re-roll and hasn't rolled yet

// Iterate through the players in their original order to maintain turn sequence

for (let i = 0; i < currentPlayersState.length; i++) {

const player = currentPlayersState[i];

const needsToReroll = playersToReroll.some(rerollPlayer => rerollPlayer.id === player.id);

if (needsToReroll && !player.hasRolled) {

// This finds the first one in the overall player list

// If you want it to be "current player + 1 in the reroll list", it's more complex

// For simplicity, we find the next *unrolled* player among those needing to reroll

return i;

}

}

}

return -1; // No more players need to roll

}, [currentPlayerIndex, isInitialRound, playersToReroll]);



// Resolve dice rolls (determine banker or ties)

const resolveDiceRolls = useCallback((currentPlayersState) => {

console.log("resolveDiceRolls called!");

console.log("Current player states for resolution:", currentPlayersState);



// Determine which players to consider based on round type

const playersToConsider = isInitialRound

? currentPlayersState // All players in initial round

: currentPlayersState.filter(p => playersToReroll.some(rerollPlayer => rerollPlayer.id === p.id)); // Only re-roll players



console.log("Players to consider for this resolution:", playersToConsider);



// Filter out players who haven't rolled yet in the current consideration set, or have null rolls

const rolledPlayersInConsideration = playersToConsider.filter(p => p.roll !== null && p.hasRolled);



// If no one has rolled yet in the playersToConsider, or all rolls are null, defer resolution

if (rolledPlayersInConsideration.length === 0) {

console.log("No players have rolled in the current set of players to consider. Deferring resolution.");

return;

}



// Find the highest roll among only those who have rolled

const sortedPlayers = [...rolledPlayersInConsideration].sort((a, b) => b.roll - a.roll);

const highestRoll = sortedPlayers[0].roll;

const winners = sortedPlayers.filter(p => p.roll === highestRoll);



console.log("Highest roll:", highestRoll);

console.log("Winners (players with highest roll):", winners);

console.log("Number of winners (should be > 1 for a tie):", winners.length);



if (winners.length === 1) {

console.log("Single winner found. Setting banker.");

// Single winner - this player becomes the banker

const banker = winners[0];



// Find distributor by counting clockwise from first player based on first player in original array

// Always use the original complete player list for distributor calculation based on initial order (originalIndex)

const distributor = findDistributor(banker.roll, initialPlayers.map((player, index) => ({

id: player.uid || `player_${index}`,

name: player.displayName || player.username,

originalIndex: index // Ensure originalIndex is passed

})));



setBankerInfo(banker);

setDistributorInfo(distributor);

setIsBankerModalVisible(true);

hideMessageBox();



// Reset states for the next potential game or screen

setPlayersToReroll([]);

setIsInitialRound(true);



} else {

console.log("Tie detected! Proceeding with re-roll logic.");

// Tie detected - ALL tied players must re-roll

const tiedPlayersNames = winners.map(p => p.name).join(', ');

showMessage(`Tie detected! ${tiedPlayersNames} rolled ${highestRoll}. All tied players must roll again!`, 'info');



// Set players who need to reroll (all tied players)

setPlayersToReroll(winners);

setIsInitialRound(false); // Now in re-roll mode



// Reset only the tied players' roll data

const resetPlayers = currentPlayersState.map(p => {

if (winners.find(w => w.id === p.id)) {

return { ...p, roll: null, hasRolled: false };

}

return p; // Keep non-tied players' data intact

});



setPlayers(resetPlayers);



// Set current player to first tied player in *original order* for the re-roll

// This ensures consistent turn order even after ties

const firstTiedPlayerInOriginalOrder = resetPlayers

.filter(p => winners.some(w => w.id === p.id)) // Filter to only tied players

.sort((a, b) => a.originalIndex - b.originalIndex)[0]; // Sort by original index



if (firstTiedPlayerInOriginalOrder) {

const firstTiedPlayerIndex = resetPlayers.findIndex(p => p.id === firstTiedPlayerInOriginalOrder.id);

setCurrentPlayerIndex(firstTiedPlayerIndex);

showMessage(`${firstTiedPlayerInOriginalOrder.name}, you're first to roll again!`);

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



// Loading state (not currently used actively, but good practice)

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

{/* Header - Standardized for simplicity */}

<View style={styles.header}>

<TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()}>

<Text style={styles.navButtonText}>← Back</Text>

</TouchableOpacity>

<Text style={styles.headerTitle}>Dice Roll</Text>

{/* Placeholder to balance header - removed profile icon */}

<View style={styles.navButtonPlaceholder} />

</View>



{/* Centered Content Rectangle - Using contentContainer style for consistency */}

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



{/* Bottom Navigation Bar - Standardized with StartGameScreen */}

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

players: players, // Pass all players to the next screen

banker: bankerInfo, // Pass banker info

distributor: distributorInfo // Pass distributor info

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

backgroundColor: '#004d00', // Dark green background

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

// Standardized Header

header: {

flexDirection: 'row',

justifyContent: 'space-between',

alignItems: 'center',

paddingHorizontal: 20,

paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,

paddingBottom: 15,

backgroundColor: '#004d00', // Consistent with fullScreenContainer

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

// Main Content Container (card style)

contentContainer: {

backgroundColor: '#fff',

borderRadius: 30, // Apply radius to all corners for a floating card effect

marginTop: 20,

marginBottom: 20, // Add a margin at the bottom to separate from navbar

marginHorizontal: 20, // Add horizontal margin for a card effect

flex: 1, // Let it take up available space, but bounded by margins

maxHeight: '75%', // Set max height to ensure separation from bottom bar

overflow: 'hidden', // Ensures content stays within rounded borders

},

scrollContent: {

padding: 20,

alignItems: 'center',

paddingBottom: 40, // Ensure space at the bottom of scrollable content

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

// Bottom Navigation Bar Styles (Standardized)

bottomNavBar: {

flexDirection: 'row',

justifyContent: 'space-around',

alignItems: 'center',

backgroundColor: '#fff', // White background as in StartGameScreen

paddingVertical: 15,

paddingBottom: Platform.OS === 'ios' ? 25 : 15, // Adjusted for iOS safe area

borderTopLeftRadius: 25, // Rounded top corners

borderTopRightRadius: 25,

position: 'absolute', // Fixed at the bottom

bottom: 0,

left: 0,

right: 0,

elevation: 10, // Android shadow

shadowColor: '#000', // iOS shadow

shadowOffset: { width: 0, height: -5 },

shadowOpacity: 0.15,

shadowRadius: 10,

},

navItem: {

flex: 1,

alignItems: 'center',

paddingVertical: 5,

},

navIconContainer: { // New container for icon to maintain size consistency

alignItems: 'center',

justifyContent: 'center',

width: 40, // Fixed width/height for touchable area visual consistency

height: 40,

},

navTextIcon: { // For emoji icons

fontSize: 24, // Size of emoji

color: '#666', // Color of emoji

},

// Modal Styles

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