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
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function DetermineBankerScreen({ route }) {
  const navigation = useNavigation();

  // Players passed from StartGameScreen
  const { players: initialPlayersFromRoute } = route.params || {};

  // All players in a consistent order, ensuring 'id' and 'name' are available
  const [allPlayers, setAllPlayers] = useState(() => {
    if (initialPlayersFromRoute && initialPlayersFromRoute.length > 0) {
      return initialPlayersFromRoute.map((player, index) => ({
        id: player.id || player.uid || `player_${index}`,
        name: player.name || player.displayName || player.username || `Player ${index + 1}`,
        chips: player.chips !== undefined ? player.chips : 1000,
        originalIndex: player.originalIndex !== undefined ? player.originalIndex : index,
        profileImage: null,
        profileImageLoaded: false
      }));
    } else {
      // Fallback for initial load if no players are passed (e.g., direct navigation during development)
      return [
        { id: 'player1', name: 'Audrey', chips: 1000, originalIndex: 0, profileImage: null, profileImageLoaded: false },
        { id: 'player2', name: 'Wanton', chips: 1000, originalIndex: 1, profileImage: null, profileImageLoaded: false },
        { id: 'player3', name: 'Aud', chips: 1000, originalIndex: 2, profileImage: null, profileImageLoaded: false },
        { id: 'player4', name: 'Audreyng', chips: 1000, originalIndex: 3, profileImage: null, profileImageLoaded: false },
      ];
    }
  });

  // State for the banker determination dice rolling phase
  const [activePlayers, setActivePlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playerRolls, setPlayerRolls] = useState({}); // Stores { playerId: { value, playerName } }
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [isLoading, setIsLoading] = useState(false);
  const [determinedBanker, setDeterminedBanker] = useState(null);

  // Modal state for banker announcement
  const [isBankerAnnouncementModalVisible, setIsBankerAnnouncementModalVisible] = useState(false);

  // Fetch profile images
  useEffect(() => {
    const fetchProfileImages = async () => {
      console.log('🔄 Fetching profile images for DetermineBankerScreen...');
      console.log('📋 Players to fetch:', allPlayers.map(p => ({ name: p.name, id: p.id })));
      
      const updatedPlayers = await Promise.all(
        allPlayers.map(async (player) => {
          try {
            console.log(`\n🔍 Fetching profile for ${player.name} (ID: ${player.id})`);
            
            const userDocRef = doc(db, 'users', player.id);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log(`📋 ${player.name}: User data found`);
              console.log(`📋 ${player.name}: Profile image exists:`, !!userData.profileImage);
              
              let profileImage = userData.profileImage;
              
              if (profileImage) {
                console.log(`📋 ${player.name}: Profile image length:`, profileImage.length);
                console.log(`📋 ${player.name}: Profile image starts with:`, profileImage.substring(0, 30));
                
                if (!profileImage.startsWith('data:')) {
                  profileImage = `data:image/jpeg;base64,${profileImage}`;
                  console.log(`✅ ${player.name}: Added data URI prefix`);
                }
                
                console.log(`✅ ${player.name}: Profile image ready`);
                return { ...player, profileImage, profileImageLoaded: true };
              } else {
                console.log(`❌ ${player.name}: No profile image in user data`);
                return { ...player, profileImage: null, profileImageLoaded: true };
              }
            } else {
              console.log(`❌ ${player.name}: No user document found`);
              return { ...player, profileImage: null, profileImageLoaded: true };
            }
          } catch (error) {
            console.error(`❌ ${player.name}: Error fetching profile:`, error);
            return { ...player, profileImage: null, profileImageLoaded: true };
          }
        })
      );

      console.log('🎯 Profile images fetched, updating state...');
      console.log('📊 Results:', updatedPlayers.map(p => ({ 
        name: p.name, 
        hasProfileImage: !!p.profileImage,
        profileImageLoaded: p.profileImageLoaded 
      })));
      
      setAllPlayers(updatedPlayers);
      setActivePlayers([...updatedPlayers]);
      
      // Update determined banker if needed
      if (determinedBanker) {
        const updatedBanker = updatedPlayers.find(p => p.id === determinedBanker.id);
        if (updatedBanker) {
          console.log(`🔄 Updating determined banker ${determinedBanker.name} with profile image:`, !!updatedBanker.profileImage);
          setDeterminedBanker(updatedBanker);
        }
      }
    };

    if (allPlayers.length > 0) {
      fetchProfileImages();
    }
  }, [allPlayers.length]);

  // --- useEffect: Initial Setup for Dice Roll ---
  useEffect(() => {
    if (allPlayers.length > 0 && allPlayers[0].profileImageLoaded) {
      setMessage(`${allPlayers[0].name}'s turn to roll to determine the Banker!`);
    } else if (allPlayers.length > 0) {
      setMessage('Loading player profiles...');
    } else {
      setMessage('No players found. Please go back to Start Game screen.');
    }
  }, [allPlayers]);

  // Avatar component (same as DiceRollGameScreen)
  const Avatar = ({ player, style }) => {
    console.log(`🖼️ Avatar render for ${player.name}:`, {
      profileImageLoaded: player.profileImageLoaded,
      hasProfileImage: !!player.profileImage,
      profileImagePreview: player.profileImage ? player.profileImage.substring(0, 50) + '...' : 'null'
    });

    if (!player.profileImageLoaded) {
      return (
        <View style={[style, styles.avatarPlaceholder]}>
          <ActivityIndicator size="small" color="#004d00" />
        </View>
      );
    }

    if (player.profileImage) {
      return (
        <Image
          source={{ uri: player.profileImage }}
          style={style}
          onLoad={() => {
            console.log(`✅ Avatar loaded successfully for ${player.name}`);
          }}
          onError={(error) => {
            console.error(`❌ Avatar load error for ${player.name}:`, error.nativeEvent);
          }}
        />
      );
    }

    console.log(`🔄 Using default avatar for ${player.name}`);
    return (
      <Image
        source={require('../assets/images/boy1.png')}
        style={style}
      />
    );
  };

  // Utility function to set message
  const showMessage = useCallback((msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
  }, []);

  // Function to roll a single die (1-6)
  const rollDie = () => Math.floor(Math.random() * 6) + 1;

  // Checks if a player has already rolled in the current dice phase
  const hasPlayerRolled = useCallback((playerId) => {
    return playerRolls[playerId] !== undefined;
  }, [playerRolls]);

  // Gets the roll value for a specific player
  const getPlayerRoll = useCallback((playerId) => {
    const rollData = playerRolls[playerId];
    return rollData ? rollData.value : null;
  }, [playerRolls]);

  // Finds the next player who hasn't rolled yet in the current activePlayers list
  const findNextPlayerToRoll = useCallback((currentIdx, updatedRolls = null) => {
    const rollsToUse = updatedRolls || playerRolls;
    for (let i = 1; i <= activePlayers.length; i++) {
      const checkIdx = (currentIdx + i) % activePlayers.length;
      const playerId = activePlayers[checkIdx].id;
      if (rollsToUse[playerId] === undefined) {
        return checkIdx;
      }
    }
    return -1; // All active players have rolled
  }, [activePlayers, playerRolls]);

  // Handle player roll for banker determination
  const handlePlayerRoll = useCallback((playerId) => {
    const playerIndex = activePlayers.findIndex(p => p.id === playerId);

    if (playerIndex === -1 || playerIndex !== currentPlayerIndex || hasPlayerRolled(playerId)) {
      showMessage("It's not your turn or you've already rolled!", 'error');
      return;
    }

    setIsLoading(true);
    const die1 = rollDie();
    const die2 = rollDie();
    const totalRoll = die1 + die2;

    const newPlayerRolls = {
      ...playerRolls,
      [playerId]: {
        playerId: playerId,
        value: totalRoll,
        die1: die1,
        die2: die2,
        playerName: activePlayers[playerIndex].name
      }
    };
    setPlayerRolls(newPlayerRolls);

    const allActivePlayersRolled = activePlayers.every(player =>
      newPlayerRolls[player.id] !== undefined
    );

    if (allActivePlayersRolled) {
      const currentHighestRolls = activePlayers.map(player => ({
        player: player,
        roll: newPlayerRolls[player.id]?.value || 0
      }));

      const globalHighestRollInThisPhase = Math.max(0, ...currentHighestRolls.map(p => p.roll));

      const winnersOfDiceRoll = currentHighestRolls.filter(p => p.roll === globalHighestRollInThisPhase && globalHighestRollInThisPhase > 0);

      if (winnersOfDiceRoll.length > 1) {
        // Tie detected, these players must roll again
        const tiedPlayers = winnersOfDiceRoll.map(w => w.player);
        setActivePlayers(tiedPlayers.sort((a, b) => a.originalIndex - b.originalIndex));
        setCurrentPlayerIndex(0);
        setPlayerRolls({}); // Reset rolls for tied players
        showMessage(`TIE at ${globalHighestRollInThisPhase}! ${tiedPlayers.map(p => p.name).join(', ')} must roll again!`, 'info');
        setIsLoading(false);
      } else if (winnersOfDiceRoll.length === 1) {
        // Single winner of the dice roll is found - this is the initial banker
        const winnerOfDiceRoll = winnersOfDiceRoll[0];
        setDeterminedBanker(winnerOfDiceRoll.player);
        showMessage(`${winnerOfDiceRoll.player.name} is the Banker!`, 'success');
        setIsLoading(false);
        setIsBankerAnnouncementModalVisible(true); // Show the Mahjong table modal
      } else {
        showMessage('No winner determined from dice roll. Something went wrong!', 'error');
        setIsLoading(false);
      }
    } else {
      // Not all players have rolled, move to the next player's turn
      const nextPlayerIndex = findNextPlayerToRoll(playerIndex, newPlayerRolls);
      if (nextPlayerIndex !== -1) {
        setCurrentPlayerIndex(nextPlayerIndex);
      } else {
        // Fallback if somehow no next player found but not all rolled (shouldn't happen)
        showMessage('Waiting for all players to roll...', 'info');
      }
      setIsLoading(false);
    }
  }, [activePlayers, currentPlayerIndex, hasPlayerRolled, showMessage, playerRolls, findNextPlayerToRoll]);

  // Loading state UI
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F8B100" />
        <Text style={styles.loadingText}>Determining Banker...</Text>
      </View>
    );
  }

  // Error state if no players
  if (allPlayers.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No player data found. Please go back and try again.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const playersRolledCount = activePlayers.filter(p => playerRolls[p.id] !== undefined).length;

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
          <Text style={styles.title}>👑 Determine the Banker!</Text>
          <Text style={styles.subtitle}>Highest roll will be the starting Banker.</Text>

          {/* Player Cards for Banker Determination */}
          {activePlayers.map((player, index) => {
            const isCurrentPlayer = index === currentPlayerIndex;
            const hasRolled = hasPlayerRolled(player.id);
            const canRoll = isCurrentPlayer && !hasRolled;
            const totalRollValue = getPlayerRoll(player.id);

            return (
              <View
                key={player.id}
                style={[
                  styles.playerCard,
                  canRoll && styles.currentPlayerCard,
                ]}
              >
                <Avatar player={player} style={styles.playerAvatar} />
                <View style={styles.playerInfo}>
                  <Text style={styles.playerCardName}>{player.name}</Text>
                </View>

                {hasRolled ? (
                  <View style={styles.rollResultContainer}>
                    <Text style={styles.rollResultText}>Rolled: {totalRollValue}</Text>
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

          {/* Message Box */}
          {message ? (
            <View style={[styles.messageBox, styles[`messageBox_${messageType}`]]}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Players rolled: {playersRolledCount}/{activePlayers.length}
            </Text>
          </View>
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

      {/* Banker Announcement & Mahjong Table Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isBankerAnnouncementModalVisible}
        onRequestClose={() => setIsBankerAnnouncementModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎉 Your Mahjong Table!</Text>

            {determinedBanker && (
              <View style={styles.bankerInfoBox}>
                <Avatar player={determinedBanker} style={styles.modalAvatar} />
                <View style={styles.bankerDetails}>
                  <Text style={styles.modalPlayerName}>{determinedBanker.name}</Text>
                  <Text style={styles.bankerRoleText}>is the Banker!</Text>
                </View>
                <Text style={styles.crownIcon}>👑</Text>
              </View>
            )}

            <Text style={styles.playersAtTableTitle}>Players at the Table:</Text>
            <View style={styles.mahjongTableLayout}>
              {allPlayers.map((player, index) => (
                <View key={player.id} style={styles.tablePlayerCard}>
                  <Avatar player={player} style={styles.tablePlayerAvatar} />
                  <Text style={styles.tablePlayerName}>{player.name}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setIsBankerAnnouncementModalVisible(false);
                navigation.navigate('DiceRollGame', {
                  players: allPlayers, // Pass all players with profile images
                  banker: determinedBanker, // The determined initial banker
                  distributor: null, // Distributor will be determined on next screen
                  roundNumber: 1, // Starting round
                  gameWindDirection: 1, // Default East (东)
                  gameSeatWind: 1, // Default East 1 (东1)
                  bankerWinsCount: 0, // Initial banker wins count
                  lastRoundBankerWon: false, // No previous round to have won
                  allPlayersOrdered: allPlayers // Consistent order for rotation logic
                });
              }}
            >
              <Text style={styles.primaryButtonText}>Proceed to Dice Roll</Text>
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
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  playerInfo: {
    flex: 1,
  },
  playerCardName: {
    fontSize: 16,
    color: '#333',
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
  // Modal styles for Banker Announcement / Mahjong Table
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
  bankerInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbe6',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F8B100',
    width: '100%',
    marginBottom: 20,
    position: 'relative', // For crown positioning
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#004d00',
  },
  bankerDetails: {
    flex: 1,
  },
  modalPlayerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#004d00',
    marginBottom: 4,
  },
  bankerRoleText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  crownIcon: {
    position: 'absolute',
    top: -10,
    right: 10,
    fontSize: 30,
  },
  playersAtTableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#004d00',
    marginBottom: 15,
    textAlign: 'center',
    width: '100%',
  },
  mahjongTableLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
  },
  tablePlayerCard: {
    alignItems: 'center',
    margin: 8,
    width: '40%', // Adjust as needed for spacing
  },
  tablePlayerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#004d00',
  },
  tablePlayerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
