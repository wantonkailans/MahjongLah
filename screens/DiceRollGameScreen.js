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
  Platform,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function DiceRollGameScreen({ route }) {
  const navigation = useNavigation();

  // Extract initial game state from navigation params
  const {
    players: initialPlayersFromRoute,
    banker: initialBankerFromRoute, // The banker for this round (already determined)
    roundNumber: initialRoundNumber = 1,
    gameWindDirection: initialGameWindDirection = 1,
    gameSeatWind: initialGameSeatWind = 1,
    bankerWinsCount: initialBankerWinsCount = 0,
    lastRoundBankerWon: initialLastRoundBankerWon = false,
    allPlayersOrdered: allPlayersOrderedFromRoute,
    windCycleCount: initialWindCycleCount = 0,
    playersWhoWereBankerInCurrentWind: initialPlayersWhoWereBankerInCurrentWind = new Set()
  } = route.params || {};

  // All players in a consistent order, ensuring 'id' and 'name' are available
  const [allPlayers, setAllPlayers] = useState(() => {
    // Priority: use allPlayersOrdered if available, then initialPlayersFromRoute
    let playersToUse = allPlayersOrderedFromRoute || initialPlayersFromRoute;
    
    if (playersToUse && playersToUse.length > 0) {
      return playersToUse.map((player, index) => ({
        id: player.id || player.uid || `player_${index}`,
        name: player.name || player.displayName || player.username || `Player ${index + 1}`,
        chips: player.chips !== undefined ? player.chips : 1000, // Preserve existing chips
        originalIndex: player.originalIndex !== undefined ? player.originalIndex : index,
      }));
    } else {
      // Fallback for initial load if no players are passed (e.g., direct navigation during development)
      return [
        { id: 'player1', name: 'Audrey', chips: 1000, originalIndex: 0 },
        { id: 'player2', name: 'Wanton', chips: 1000, originalIndex: 1 },
        { id: 'player3', name: 'Aud', chips: 1000, originalIndex: 2 },
        { id: 'player4', name: 'Audreyng', chips: 1000, originalIndex: 3 },
      ];
    }
  });

  // Game state for the dice rolling phase (now only for banker's roll)
  const [bankerRollValue, setBankerRollValue] = useState(0);
  const [bankerHasRolled, setBankerHasRolled] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [isLoading, setIsLoading] = useState(false);

  // Mahjong specific states
  const [currentBanker, setCurrentBanker] = useState(initialBankerFromRoute || null);
  const [currentDistributor, setCurrentDistributor] = useState(null); // Determined by banker's roll
  const [roundNumber, setRoundNumber] = useState(initialRoundNumber);
  const [windDirection, setWindDirection] = useState(initialGameWindDirection);
  const [seatWind, setSeatWind] = useState(initialGameSeatWind);
  const [bankerWinsCount, setBankerWinsCount] = useState(initialBankerWinsCount);

  // Wind state
  const [windCycleCount, setWindCycleCount] = useState(initialWindCycleCount);
  const [playersWhoWereBankerInCurrentWind, setPlayersWhoWereBankerInCurrentWind] = useState(
    initialPlayersWhoWereBankerInCurrentWind instanceof Set 
      ? initialPlayersWhoWereBankerInCurrentWind 
      : new Set(initialPlayersWhoWereBankerInCurrentWind || [])
  );

  // Modal state
  const [isDistributorModalVisible, setIsDistributorModalVisible] = useState(false);

  // Feng (wind) rotation order
  const fengOrder = ['东', '南', '西', '北'];

  // --- useEffect: Initial Setup / Round Reset for Dice Roll ---
  useEffect(() => {
    if (currentBanker) {
      setMessage(`${currentBanker.name}'s turn to roll for tile distribution!`);
      setBankerHasRolled(false);
      setBankerRollValue(0);
    } else {
      setMessage('No banker assigned. Please start a new game.');
    }
  }, [currentBanker, roundNumber]); // Re-run when banker or round changes

  // Debug logging
  useEffect(() => {
    console.log('=== DiceRollGameScreen Debug Info ===');
    console.log('Current banker:', currentBanker);
    console.log('All players:', allPlayers);
    console.log('Wind cycle count:', windCycleCount);
    console.log('Current feng:', fengOrder[windCycleCount]);
    console.log('Players who were banker in current wind:', Array.from(playersWhoWereBankerInCurrentWind));
    console.log('=====================================');
  }, [currentBanker, allPlayers, windCycleCount, playersWhoWereBankerInCurrentWind]);

  // Utility function to set message
  const showMessage = useCallback((msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
  }, []);

  // Function to roll a single die (1-6)
  const rollDie = () => Math.floor(Math.random() * 6) + 1;

  // Handle banker's dice roll for tile distribution
  const handleBankerRoll = useCallback(() => {
    if (!currentBanker || bankerHasRolled) {
      showMessage("It's not the banker's turn to roll, or they've already rolled!", 'error');
      return;
    }

    setIsLoading(true);
    const die1 = rollDie();
    const die2 = rollDie();
    const totalRoll = die1 + die2;

    setBankerRollValue(totalRoll);
    setBankerHasRolled(true);
    showMessage(`${currentBanker.name} rolled a ${totalRoll}!`, 'success');

    // Determine distributor based on banker's roll
    const sortedAllPlayers = [...allPlayers].sort((a, b) => a.originalIndex - b.originalIndex);
    const bankerActualIndex = sortedAllPlayers.findIndex(p => p.id === currentBanker.id);

    let distributorCalculatedIndex = 0;
    if (bankerActualIndex !== -1) {
        // Count clockwise from the banker based on the roll value
        distributorCalculatedIndex = (bankerActualIndex + totalRoll - 1) % sortedAllPlayers.length;
    } else {
        // Fallback if banker not found (shouldn't happen with proper flow)
        console.warn("Banker not found for distributor calculation, defaulting to first player based on roll.");
        distributorCalculatedIndex = (totalRoll - 1) % sortedAllPlayers.length;
    }

    const newDistributor = sortedAllPlayers[distributorCalculatedIndex];
    setCurrentDistributor(newDistributor);

    setIsLoading(false);
    setIsDistributorModalVisible(true); // Show the distributor announcement modal

  }, [currentBanker, bankerHasRolled, allPlayers, showMessage]);

  // Loading state UI
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F8B100" />
        <Text style={styles.loadingText}>Rolling dice...</Text>
      </View>
    );
  }

  // Error state if no players or banker
  if (allPlayers.length === 0 || !currentBanker) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Game data missing. Please start a new game from the Home screen.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.primaryButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Image
          source={require('../assets/images/mahjonglah!.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.headerButton} /> {/* Placeholder for alignment */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.gameSetupCard}>
          <Text style={styles.title}>🎲 Banker's Roll for Distribution!</Text>
          <Text style={styles.subtitle}>Round: {roundNumber} - {fengOrder[windCycleCount]}風</Text>

          {/* Display Current Banker */}
          {currentBanker && (
            <View style={[styles.playerCard, styles.bankerCardHighlight]}>
              <Image
                source={require('../assets/images/boy1.png')}
                style={styles.playerAvatar}
              />
              <View style={styles.playerInfo}>
                <Text style={styles.playerCardName}>{currentBanker.name}</Text>
                <Text style={styles.bankerLabelText}>Current Banker</Text>
              </View>

              {bankerHasRolled ? (
                <View style={styles.rollResultContainer}>
                  <Text style={styles.rollResultText}>Rolled: {bankerRollValue}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.rollButton,
                    bankerHasRolled && styles.disabledButton
                  ]}
                  onPress={handleBankerRoll}
                  disabled={bankerHasRolled}
                >
                  <Text style={styles.rollButtonText}>Roll!</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Message Box */}
          {message ? (
            <View style={[styles.messageBox, styles[`messageBox_${messageType}`]]}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

        </View>
      </ScrollView>

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

      {/* Distributor Announcement Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isDistributorModalVisible}
        onRequestClose={() => setIsDistributorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🤝 Tile Distributor Determined!</Text>

            {currentDistributor && (
              <View style={styles.modalPlayerInfo}>
                <Image source={require('../assets/images/boy1.png')} style={styles.modalAvatar} />
                <View style={styles.modalPlayerDetails}>
                  <Text style={styles.modalPlayerName}>{currentDistributor.name}</Text>
                  <Text style={styles.modalDistributorText}>
                    will distribute tiles.
                    Count <Text style={{fontWeight: 'bold'}}>{bankerRollValue}</Text> tiles from the right.
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setIsDistributorModalVisible(false);
                navigation.navigate('ChipCounting', {
                  players: allPlayers, // Pass all players with their current chip counts
                  banker: currentBanker, // The determined banker for the next round
                  distributor: currentDistributor, // The determined distributor for the next round
                  roundNumber: roundNumber, // Pass the current round number
                  gameWindDirection: windDirection, // Pass the updated wind direction
                  gameSeatWind: seatWind, // Pass the updated seat wind
                  bankerWinsCount: bankerWinsCount, // Pass the updated banker wins count
                  allPlayersOrdered: allPlayers, // Pass the consistent ordered list of all players
                  lastRoundBankerWon: initialLastRoundBankerWon, // Pass this back to ChipCounting for next round logic
                  windCycleCount: windCycleCount, // Pass current wind cycle
                  playersWhoWereBankerInCurrentWind: playersWhoWereBankerInCurrentWind, // Pass wind tracking
                  allPlayers: allPlayers // Also pass as allPlayers for consistency
                });
              }}
            >
              <Text style={styles.primaryButtonText}>Proceed to Chip Counting</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#004d00',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 10,
  },
  headerButton: {
    padding: 5,
  },
  headerIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerLogo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  scrollViewContent: {
    alignItems: 'center',
    paddingBottom: 100,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  gameSetupCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    padding: 25,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
  title: {
    color: '#004d00',
    fontSize: 24,
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    fontSize: 16,
    marginBottom: 25,
    textAlign: 'center',
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
  bankerCardHighlight: {
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
  playerInfo: {
    flex: 1,
  },
  playerCardName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  bankerLabelText: {
    fontSize: 12,
    color: '#F8B100',
    fontWeight: 'bold',
    marginTop: 2,
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
    alignItems: 'center',
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
  },
  messageBox_success: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
    borderWidth: 1,
  },
  messageBox_error: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
    borderWidth: 1,
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
  },
  navTextIcon: {
    fontSize: 24,
    color: '#666',
  },
  // Modal styles for Distributor Announcement
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
  modalDistributorText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 18,
  },
});