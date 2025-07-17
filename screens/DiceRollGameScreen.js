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

export default function DiceRollGameScreen({ route }) {
  const navigation = useNavigation();

  // Extract initial game state from navigation params
  const {
    players: initialPlayersFromRoute,
    banker: initialBankerFromRoute,
    roundNumber: initialRoundNumber = 1,
    gameWindDirection: initialGameWindDirection = 1,
    gameSeatWind: initialGameSeatWind = 1,
    bankerWinsCount: initialBankerWinsCount = 0,
    lastRoundBankerWon: initialLastRoundBankerWon = false,
    allPlayersOrdered: allPlayersOrderedFromRoute,
    windCycleCount: initialWindCycleCount = 0,
    playersWhoWereBankerInCurrentWind: initialPlayersWhoWereBankerInCurrentWind = new Set()
  } = route.params || {};

  // All players in a consistent order
  const [allPlayers, setAllPlayers] = useState(() => {
    let playersToUse = allPlayersOrderedFromRoute || initialPlayersFromRoute;
    
    if (playersToUse && playersToUse.length > 0) {
      return playersToUse.map((player, index) => ({
        id: player.id || player.uid || `player_${index}`,
        name: player.name || player.displayName || player.username || `Player ${index + 1}`,
        chips: player.chips !== undefined ? player.chips : 1000,
        originalIndex: player.originalIndex !== undefined ? player.originalIndex : index,
        profileImage: null,
        profileImageLoaded: false
      }));
    } else {
      return [];
    }
  });

  // Game state
  const [bankerRollValue, setBankerRollValue] = useState(0);
  const [bankerHasRolled, setBankerHasRolled] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [isLoading, setIsLoading] = useState(false);

  // Mahjong specific states
  const [currentBanker, setCurrentBanker] = useState(initialBankerFromRoute || null);
  const [currentDistributor, setCurrentDistributor] = useState(null);
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

  // Fetch profile images
  useEffect(() => {
    const fetchProfileImages = async () => {
      console.log('🔄 Fetching profile images for DiceRollGameScreen...');
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
      
      // Update banker if needed
      if (currentBanker) {
        const updatedBanker = updatedPlayers.find(p => p.id === currentBanker.id);
        if (updatedBanker) {
          console.log(`🔄 Updating banker ${currentBanker.name} with profile image:`, !!updatedBanker.profileImage);
          setCurrentBanker(updatedBanker);
        }
      }
      
      // Update distributor if needed
      if (currentDistributor) {
        const updatedDistributor = updatedPlayers.find(p => p.id === currentDistributor.id);
        if (updatedDistributor) {
          console.log(`🔄 Updating distributor ${currentDistributor.name} with profile image:`, !!updatedDistributor.profileImage);
          setCurrentDistributor(updatedDistributor);
        }
      }
    };

    if (allPlayers.length > 0) {
      fetchProfileImages();
    }
  }, [allPlayers.length]);

  // Initial message setup
  useEffect(() => {
    if (currentBanker) {
      setMessage(`${currentBanker.name}'s turn to roll for tile distribution!`);
      setBankerHasRolled(false);
      setBankerRollValue(0);
    } else {
      setMessage('No banker assigned. Please start a new game.');
    }
  }, [currentBanker?.name, roundNumber]);

  // Avatar component
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

  // Handle banker's dice roll
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

    // Determine distributor
    const sortedAllPlayers = [...allPlayers].sort((a, b) => a.originalIndex - b.originalIndex);
    const bankerActualIndex = sortedAllPlayers.findIndex(p => p.id === currentBanker.id);

    let distributorCalculatedIndex = 0;
    if (bankerActualIndex !== -1) {
        distributorCalculatedIndex = (bankerActualIndex + totalRoll - 1) % sortedAllPlayers.length;
    } else {
        distributorCalculatedIndex = (totalRoll - 1) % sortedAllPlayers.length;
    }

    const newDistributor = sortedAllPlayers[distributorCalculatedIndex];
    setCurrentDistributor(newDistributor);

    setIsLoading(false);
    setIsDistributorModalVisible(true);
  }, [currentBanker, bankerHasRolled, allPlayers, showMessage]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F8B100" />
        <Text style={styles.loadingText}>Rolling dice...</Text>
      </View>
    );
  }

  // Error state
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
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.gameSetupCard}>
          <Text style={styles.title}>🎲 Banker's Roll for Distribution!</Text>
          <Text style={styles.subtitle}>Round: {roundNumber} - {fengOrder[windCycleCount]}風</Text>

          {/* Display Current Banker */}
          {currentBanker && (
            <View style={[styles.playerCard, styles.bankerCardHighlight]}>
              <Avatar player={currentBanker} style={styles.playerAvatar} />
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
                  style={[styles.rollButton, bankerHasRolled && styles.disabledButton]}
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

      {/* Bottom Navigation */}
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

      {/* Distributor Modal */}
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
                <Avatar player={currentDistributor} style={styles.modalAvatar} />
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
                  players: allPlayers,
                  banker: currentBanker,
                  distributor: currentDistributor,
                  roundNumber: roundNumber,
                  gameWindDirection: windDirection,
                  gameSeatWind: seatWind,
                  bankerWinsCount: bankerWinsCount,
                  allPlayersOrdered: allPlayers,
                  lastRoundBankerWon: initialLastRoundBankerWon,
                  windCycleCount: windCycleCount,
                  playersWhoWereBankerInCurrentWind: playersWhoWereBankerInCurrentWind,
                  allPlayers: allPlayers
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