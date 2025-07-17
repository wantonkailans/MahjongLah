import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Platform,
    StatusBar,
    SafeAreaView,
    Image,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Modal,
    ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ChipCountingScreen({ route }) {
    const navigation = useNavigation();
    const {
        players: initialPlayers,
        banker, // The banker passed from DiceRollGameScreen
        distributor,
        roundNumber: initialRoundNumber,
        gameSessionId,
        allPlayers: initialAllPlayers, // All players in consistent order
        lastRoundBankerWon: initialLastRoundBankerWon, // Flag from DiceRollGameScreen (now always false for first roll)
        windCycleCount: initialWindCycleCount, // Current wind cycle from previous screen
        playersWhoWereBankerInCurrentWind: initialPlayersWhoWereBankerInCurrentWind // Players who were banker in current wind
    } = route.params || { 
        players: [], 
        banker: null, 
        distributor: null, 
        roundNumber: 1, 
        gameSessionId: null, 
        allPlayers: [], 
        lastRoundBankerWon: false,
        windCycleCount: 0,
        playersWhoWereBankerInCurrentWind: new Set()
    };

    // Players with updated chip counts for the current round
    const [players, setPlayers] = useState(() => {
        // Priority: use initialPlayers if available, then initialAllPlayers
        let playersToUse = initialPlayers || initialAllPlayers;
        
        if (playersToUse && playersToUse.length > 0) {
            return playersToUse.map(p => ({
                ...p,
                chips: p.chips !== undefined ? p.chips : 1000, // Preserve existing chips or default
                profileImage: p.profileImage || null,
                profileImageLoaded: p.profileImageLoaded || false
            }));
        } else {
            // Fallback players
            return [
                { id: 'player1', name: 'Audrey', chips: 1000, originalIndex: 0, profileImage: null, profileImageLoaded: false },
                { id: 'player2', name: 'Wanton', chips: 1000, originalIndex: 1, profileImage: null, profileImageLoaded: false },
                { id: 'player3', name: 'Aud', chips: 1000, originalIndex: 2, profileImage: null, profileImageLoaded: false },
                { id: 'player4', name: 'Audreyng', chips: 1000, originalIndex: 3, profileImage: null, profileImageLoaded: false },
            ];
        }
    });

    const [losingTileShooter, setLosingTileShooter] = useState('');
    const [winner, setWinner] = useState('');
    const [taiCount, setTaiCount] = useState('');
    const [isSelfDraw, setIsSelfDraw] = useState(false);

    // Total game rounds played
    const [roundCount, setRoundCount] = useState(initialRoundNumber || 1);

    // New state for players who have been banker in the current wind cycle
    const [playersWhoWereBankerInCurrentWind, setPlayersWhoWereBankerInCurrentWind] = useState(
        initialPlayersWhoWereBankerInCurrentWind instanceof Set 
            ? initialPlayersWhoWereBankerInCurrentWind 
            : new Set(initialPlayersWhoWereBankerInCurrentWind || [])
    );
    // New state for the current wind cycle (0: 东, 1: 南, 2: 西, 3: 北)
    const [windCycleCount, setWindCycleCount] = useState(initialWindCycleCount || 0);

    // Current wind displayed (derived from windCycleCount)
    const [currentFeng, setCurrentFeng] = useState('东');

    // Current banker (updated based on game logic)
    const [currentBanker, setCurrentBanker] = useState(() => {
        if (banker) {
            // Find the banker in the players array to get their profile image
            const bankerFromPlayers = players.find(p => p.id === banker.id);
            return bankerFromPlayers || banker;
        }
        return banker;
    });

    // Full list of players in their original order, used for clockwise rotation
    const [allPlayersInOrder, setAllPlayersInOrder] = useState(() => {
        // Priority: use initialAllPlayers if available, then initialPlayers
        let playersToUse = initialAllPlayers || initialPlayers;
        
        if (playersToUse && playersToUse.length > 0) {
            return playersToUse.map(p => ({
                ...p,
                chips: p.chips !== undefined ? p.chips : 1000, // Preserve existing chips
                profileImage: p.profileImage || null,
                profileImageLoaded: p.profileImageLoaded || false
            }));
        } else {
            // Fallback players
            return [
                { id: 'player1', name: 'Audrey', chips: 1000, originalIndex: 0, profileImage: null, profileImageLoaded: false },
                { id: 'player2', name: 'Wanton', chips: 1000, originalIndex: 1, profileImage: null, profileImageLoaded: false },
                { id: 'player3', name: 'Aud', chips: 1000, originalIndex: 2, profileImage: null, profileImageLoaded: false },
                { id: 'player4', name: 'Audreyng', chips: 1000, originalIndex: 3, profileImage: null, profileImageLoaded: false },
            ];
        }
    });

    // Fetch profile images
    useEffect(() => {
        const fetchProfileImages = async () => {
            console.log('🔄 Fetching profile images for ChipCountingScreen...');
            console.log('📋 Players to fetch:', players.map(p => ({ name: p.name, id: p.id })));
            
            const updatedPlayers = await Promise.all(
                players.map(async (player) => {
                    // Skip if already loaded
                    if (player.profileImageLoaded) {
                        return player;
                    }
                    
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
            
            setPlayers(updatedPlayers);
            
            // Update allPlayersInOrder
            const updatedAllPlayers = allPlayersInOrder.map(orderPlayer => {
                const updatedPlayer = updatedPlayers.find(p => p.id === orderPlayer.id);
                return updatedPlayer || orderPlayer;
            });
            setAllPlayersInOrder(updatedAllPlayers);
            
            // Update current banker if needed
            if (currentBanker) {
                const updatedBanker = updatedPlayers.find(p => p.id === currentBanker.id);
                if (updatedBanker) {
                    console.log(`🔄 Updating current banker ${currentBanker.name} with profile image:`, !!updatedBanker.profileImage);
                    setCurrentBanker(updatedBanker);
                }
            }
        };

        if (players.length > 0 && !players.every(p => p.profileImageLoaded)) {
            fetchProfileImages();
        }
    }, [players.length]);

    // Initialize current banker if exists and add to banker tracking
    useEffect(() => {
        if (banker && !playersWhoWereBankerInCurrentWind.has(banker.id)) {
            setPlayersWhoWereBankerInCurrentWind(prev => new Set(prev).add(banker.id));
        }
    }, [banker]);

    // Debug logging
    useEffect(() => {
        console.log('=== ChipCountingScreen Debug Info ===');
        console.log('Current banker:', currentBanker);
        console.log('All players in order:', allPlayersInOrder);
        console.log('Current players with chips:', players.map(p => ({ name: p.name, chips: p.chips })));
        console.log('Wind cycle count:', windCycleCount);
        console.log('Current feng:', currentFeng);
        console.log('Players who were banker in current wind:', Array.from(playersWhoWereBankerInCurrentWind));
        console.log('Route params players:', initialPlayers?.map(p => ({ name: p.name, chips: p.chips })));
        console.log('Route params allPlayers:', initialAllPlayers?.map(p => ({ name: p.name, chips: p.chips })));
        console.log('=====================================');
    }, [currentBanker, allPlayersInOrder, windCycleCount, currentFeng, playersWhoWereBankerInCurrentWind, players, initialPlayers, initialAllPlayers]);

    // State for final results modal
    const [showFinalResults, setShowFinalResults] = useState(false);

    // State for custom alert modal
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // Flag to indicate if the banker won the current round (to be passed to next screen)
    const [bankerWonThisRound, setBankerWonThisRound] = useState(false); // Reset for current round calculations

    // Feng (wind) rotation order
    const fengOrder = ['东', '南', '西', '北'];

    // Avatar component (same as other screens)
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

    // --- useEffect: Update currentFeng when windCycleCount changes ---
    useEffect(() => {
        setCurrentFeng(fengOrder[windCycleCount]);
        console.log(`[ChipCountingScreen] Wind Cycle Count: ${windCycleCount}, Current Feng: ${fengOrder[windCycleCount]}`);
    }, [windCycleCount]);

    // --- useEffect: Check for Wind Change (After every player has been banker in current wind) ---
    useEffect(() => {
        // This logic should only trigger if all players are known and the set is full
        if (allPlayersInOrder.length > 0 && playersWhoWereBankerInCurrentWind.size === allPlayersInOrder.length) {
            console.log("All players have been banker! Changing to next wind.");
            
            // Show alert about wind change
            const nextWindIndex = (windCycleCount + 1) % fengOrder.length;
            const nextWind = fengOrder[nextWindIndex];
            showAlert(`Wind is changing! Moving from ${currentFeng}風 to ${nextWind}風`);
            
            setWindCycleCount(nextWindIndex); // Move to next wind
            setPlayersWhoWereBankerInCurrentWind(new Set()); // Reset for the new wind cycle
        }
    }, [playersWhoWereBankerInCurrentWind, allPlayersInOrder, fengOrder.length, windCycleCount, currentFeng]);

    // Custom Alert Modal Component
    const CustomAlertModal = ({ message, onClose }) => (
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Congratulations!</Text>
                <Text style={styles.modalMessage}>{message}</Text>
                <TouchableOpacity
                    style={styles.modalButton}
                    onPress={onClose}
                >
                    <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Function to show custom alert
    const showAlert = (message) => {
        setAlertMessage(message);
        setShowAlertModal(true);
    };

    // Handle the "自摸" (Self-draw) button - now toggleable
    const handleSelfDraw = () => {
        if (isSelfDraw) {
            setIsSelfDraw(false);
            showAlert("自摸 Deselected. You can now enter who shot the losing tile.");
        } else {
            setIsSelfDraw(true);
            setLosingTileShooter(''); // Clear shooter input
            Keyboard.dismiss();
            showAlert("自摸 Mode Active. Self-draw means no 'shooter'. The other 3 players will pay the winner.");
        }
    };

    // Handle applying tai/points (台)
    const handleTaiApply = () => {
        Keyboard.dismiss();

        if (!winner || isNaN(parseInt(taiCount)) || taiCount === '' || parseInt(taiCount) < 0) {
            showAlert("Please enter a winner's username and a valid 'Tai' count (>= 0).");
            return;
        }

        const tai = parseInt(taiCount);
        const winningPlayer = players.find(p => p.name.toLowerCase() === winner.toLowerCase());

        if (!winningPlayer) {
            showAlert(`${winner} is not a recognized player. Please enter an existing username.`);
            return;
        }

        const basePointValue = 5; // Example base point value
        let totalPointsToPay = basePointValue * Math.pow(2, tai - 1);

        if (tai === 0) {
            totalPointsToPay = basePointValue;
            showAlert(`0 Tai Win: Assuming a minimum win of ${totalPointsToPay} chips.`);
        }

        let updatedPlayers = players.map(p => ({ ...p })); // Create a mutable copy

        if (isSelfDraw) {
            const playersToPay = updatedPlayers.filter(p => p.id !== winningPlayer.id);
            if (playersToPay.length > 0) {
                const amountPerPlayer = totalPointsToPay;
                playersToPay.forEach(p => {
                    const playerIndex = updatedPlayers.findIndex(up => up.id === p.id);
                    if (playerIndex !== -1) {
                        updatedPlayers[playerIndex].chips -= amountPerPlayer;
                    }
                });
                const winnerIndex = updatedPlayers.findIndex(p => p.id === winningPlayer.id);
                updatedPlayers[winnerIndex].chips += (amountPerPlayer * playersToPay.length);
            }
            showAlert(`自摸 Win! ${winningPlayer.name} self-drew and gained ${totalPointsToPay * playersToPay.length} chips (${tai} Tai).`);

        } else {
            if (!losingTileShooter) {
                showAlert("Please enter who shot the losing tile (放銃), or select '自摸' if it was a self-draw.");
                return;
            }

            const shooterPlayer = updatedPlayers.find(p => p.name.toLowerCase() === losingTileShooter.toLowerCase());

            if (!shooterPlayer) {
                showAlert(`${losingTileShooter} is not a recognized player.`);
                return;
            }

            if (shooterPlayer.id === winningPlayer.id) {
                showAlert("The winner cannot be the shooter of their own winning tile (unless it's self-draw). Please check your input.");
                return;
            }

            const winnerIndex = updatedPlayers.findIndex(p => p.id === winningPlayer.id);
            const shooterIndex = updatedPlayers.findIndex(p => p.id === shooterPlayer.id);

            if (winnerIndex !== -1 && shooterIndex !== -1) {
                updatedPlayers[winnerIndex].chips += totalPointsToPay;
                updatedPlayers[shooterIndex].chips -= totalPointsToPay;
            }
            showAlert(`放銃 Win! ${winningPlayer.name} won ${totalPointsToPay} chips (${tai} Tai) from ${shooterPlayer.name}.`);
        }

        setPlayers(updatedPlayers);

        // --- Banker Rotation Logic (UPDATED) ---
        let nextBanker;
        const isCurrentBankerWin = currentBanker && winningPlayer.id === currentBanker.id;
        setBankerWonThisRound(isCurrentBankerWin); // Set the flag for the next screen

        if (isCurrentBankerWin) {
            nextBanker = currentBanker; // Banker remains if they win (连庄)
            console.log("Banker won. Banker remains the same (连庄).");
        } else {
            // Banker rotates clockwise to the next player in the fixed player order
            if (currentBanker && allPlayersInOrder.length > 0) {
                const currentBankerIndex = allPlayersInOrder.findIndex(p => p.id === currentBanker.id);
                if (currentBankerIndex !== -1) {
                    const nextBankerIndex = (currentBankerIndex + 1) % allPlayersInOrder.length;
                    nextBanker = allPlayersInOrder[nextBankerIndex];
                    console.log(`New player won. Banker rotates clockwise from ${currentBanker.name} to ${nextBanker.name}.`);
                } else {
                    console.warn("Current banker not found in allPlayersInOrder. This should not happen with proper flow.");
                    nextBanker = winningPlayer; // Fallback, though ideally, allPlayersInOrder should be robust
                }
            } else {
                console.warn("No current banker or allPlayersInOrder. This indicates an issue in initial setup.");
                nextBanker = winningPlayer; // Fallback, but indicates a potential problem
            }
        }
        setCurrentBanker(nextBanker); // Update the banker state

        // Add the next banker to the set of players who have been banker in the current wind cycle
        // This set is used to determine when the wind changes.
        setPlayersWhoWereBankerInCurrentWind(prev => new Set(prev).add(nextBanker.id));

        // Always increment round count after a game round
        setRoundCount(prev => prev + 1);

        // Reset inputs after applying
        setLosingTileShooter('');
        setWinner('');
        setTaiCount('');
        setIsSelfDraw(false);
    };

    const handleEndGame = () => {
        setShowFinalResults(true);
    };

    const handleExitToHome = () => {
        setShowFinalResults(false);
        // In a real app, you might want to clear game state or save final results to DB here
        navigation.navigate('Home');
    };

    const handleContinueToNextRound = () => {
        // Update allPlayersInOrder with the current chip counts
        const updatedAllPlayersInOrder = allPlayersInOrder.map(orderPlayer => {
            const updatedPlayer = players.find(p => p.id === orderPlayer.id);
            return updatedPlayer ? { ...orderPlayer, chips: updatedPlayer.chips } : orderPlayer;
        });

        navigation.navigate('DiceRollGame', {
            players: players, // All players with their updated chip counts
            banker: currentBanker, // The player who is the banker for the next round
            roundNumber: roundCount, // The new round number
            gameSessionId: gameSessionId || `game_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Preserve or create ID
            allPlayersOrdered: updatedAllPlayersInOrder, // Pass the updated ordered list with current chips
            lastRoundBankerWon: bankerWonThisRound, // Pass the crucial flag to DiceRollGameScreen
            windCycleCount: windCycleCount, // Pass current wind cycle
            playersWhoWereBankerInCurrentWind: playersWhoWereBankerInCurrentWind, // Pass wind tracking
            allPlayers: players // Also pass as allPlayers for consistency
        });
    };

    return (
        <SafeAreaView style={styles.fullScreenContainer}>
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

            {/* Main Content Area */}
            <KeyboardAvoidingView
                style={{ flex: 1, width: '100%' }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.contentContainer}>
                    {/* Feng Indicator in top-right corner */}
                    <View style={styles.fengIndicator}>
                        <Text style={styles.fengText}>{currentFeng}</Text>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View>
                                <Text style={styles.title}>Current Chip Count:</Text>
                                <Text style={styles.roundInfoText}>Round: {roundCount} {currentFeng}風</Text>

                                <View style={styles.playerChipsContainer}>
                                    {players.map(player => (
                                        <View key={player.id}
                                            style={[
                                                styles.playerChipCard,
                                                currentBanker && player.id === currentBanker.id && styles.bankerChipCard
                                            ]}
                                        >
                                            <Avatar player={player} style={styles.playerChipAvatar} />
                                            <Text style={styles.playerChipName}>
                                                {player.name}
                                            </Text>
                                            <Text style={styles.playerChipCount}>x {player.chips}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </TouchableWithoutFeedback>

                        <Text style={styles.sectionTitle}>Enter who shot the losing tile:</Text>
                        <View style={styles.inputGroup}>
                            <TextInput
                                style={[styles.input, isSelfDraw && styles.disabledInput]}
                                placeholder="Username"
                                placeholderTextColor="#999"
                                value={losingTileShooter}
                                onChangeText={setLosingTileShooter}
                                autoCapitalize="none"
                                editable={!isSelfDraw}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.miniButton,
                                    isSelfDraw ? styles.selfDrawButtonActive : styles.selfDrawButton
                                ]}
                                onPress={handleSelfDraw}
                            >
                                <Text style={[
                                    styles.miniButtonText,
                                    isSelfDraw && styles.activeButtonText
                                ]}>自摸</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>Who won:</Text>
                        <View style={styles.inputGroup}>
                            <TextInput
                                style={styles.input}
                                placeholder="Username"
                                placeholderTextColor="#999"
                                value={winner}
                                onChangeText={setWinner}
                                autoCapitalize="none"
                            />
                            <TextInput
                                style={[styles.miniInput, { width: 60 }]}
                                placeholder="台"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                                value={taiCount}
                                onChangeText={setTaiCount}
                            />
                            <TouchableOpacity style={styles.miniButton} onPress={handleTaiApply}>
                                <Text style={styles.miniButtonText}>Apply</Text>
                            </TouchableOpacity>
                        </View>

                        {/* "Continue to Next Round" Button */}
                        <TouchableOpacity style={styles.continueButton} onPress={handleContinueToNextRound}>
                            <Text style={styles.continueButtonText}>Continue to Next Round</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.endGameButton} onPress={handleEndGame}>
                            <Text style={styles.endGameButtonText}>End Game</Text>
                        </TouchableOpacity>

                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

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

            {/* Final Results Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showFinalResults}
                onRequestClose={() => setShowFinalResults(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>🎉 Game Results</Text>

                        <Text style={styles.roundInfo}>
                            Game ended after {roundCount - 1} round{roundCount - 1 !== 1 ? 's' : ''}
                        </Text>
                        <Text style={styles.fengInfo}>
                            Final wind: {currentFeng}
                        </Text>

                        <View style={styles.finalScoresContainer}>
                            <Text style={styles.finalScoresTitle}>Final Chip Counts:</Text>

                            {players
                                .sort((a, b) => b.chips - a.chips) // Sort by chips (highest first)
                                .map((player, index) => (
                                    <View key={player.id} style={styles.finalScoreRow}>
                                        <View style={styles.rankContainer}>
                                            <Text style={styles.rankText}>#{index + 1}</Text>
                                        </View>
                                        <Avatar player={player} style={styles.finalScoreAvatar} />
                                        <Text style={styles.finalScoreName}>{player.name}</Text>
                                        <Text style={[
                                            styles.finalScoreChips,
                                            player.chips > 1000 ? styles.positiveChips :
                                            player.chips < 1000 ? styles.negativeChips : styles.neutralChips
                                        ]}>
                                            {player.chips} chips
                                        </Text>
                                    </View>
                                ))
                            }
                        </View>

                        <TouchableOpacity
                            style={styles.exitButton}
                            onPress={handleExitToHome}
                        >
                            <Text style={styles.exitButtonText}>Exit to Home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Custom Alert Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showAlertModal}
                onRequestClose={() => setShowAlertModal(false)}
            >
                <CustomAlertModal
                    message={alertMessage}
                    onClose={() => setShowAlertModal(false)}
                />
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: '#004d00',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15, // Adjusted padding
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50, // Adjusted padding
        paddingBottom: 10, // Adjusted padding
        backgroundColor: '#004d00', // Ensure header background is consistent
    },
    headerButton: { // Style for the back button container
        padding: 5,
    },
    headerIcon: { // Style for the back arrow icon
        fontSize: 24,
        color: '#fff',
    },
    headerLogo: {
        width: 120, // Adjusted width for logo
        height: 40,
        resizeMode: 'contain',
    },
    contentContainer: {
        backgroundColor: '#fff',
        borderRadius: 30,
        marginTop: 20,
        marginBottom: 20,
        marginHorizontal: 20,
        flex: 1,
        overflow: 'hidden',
        position: 'relative', // For feng indicator positioning
    },
    // Feng indicator styles
    fengIndicator: {
        position: 'absolute',
        top: 15,
        right: 20,
        backgroundColor: '#004d00',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    fengText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center',
        paddingBottom: 40,
        paddingTop: 80, // Extra padding to avoid overlap with feng indicator
    },
    title: {
        color: '#004d00',
        fontSize: 20,
        marginBottom: 15,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    roundInfoText: {
        color: '#004d00',
        fontSize: 16,
        marginBottom: 25,
        fontWeight: '600',
        textAlign: 'center',
    },
    playerChipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 30,
    },
    playerChipCard: {
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        padding: 10,
        margin: 5,
        width: '45%',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    bankerChipCard: { // New style for the banker's card
        backgroundColor: 'rgba(248, 177, 0, 0.2)', // Translucent amber
        borderColor: '#F8B100', // Solid amber border
        borderWidth: 2,
    },
    playerChipAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: '#004d00',
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    playerChipName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    playerChipCount: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#F8B100',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#004d00',
        marginTop: 20,
        marginBottom: 10,
        textAlign: 'center',
        width: '100%',
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 15,
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#f8f8f8',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        fontSize: 16,
        color: '#000',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginRight: 10,
    },
    disabledInput: {
        backgroundColor: '#e0e0e0',
        color: '#666',
    },
    miniInput: {
        backgroundColor: '#f8f8f8',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 10,
        fontSize: 16,
        color: '#000',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginRight: 10,
        textAlign: 'center',
    },
    miniButton: {
        backgroundColor: '#F8B100',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    miniButtonText: {
        color: '#000',
        fontSize: 15,
        fontWeight: 'bold',
    },
    selfDrawButton: {
        backgroundColor: '#6A5ACD', // Purple when not selected
    },
    selfDrawButtonActive: {
        backgroundColor: '#32CD32', // Green when selected
        borderWidth: 2,
        borderColor: '#228B22',
    },
    activeButtonText: {
        color: '#fff', // White text when active
    },
    continueButton: {
        backgroundColor: '#007bff', // Blue for continue
        paddingVertical: 15,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginTop: 30,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    endGameButton: {
        backgroundColor: '#dc3545',
        paddingVertical: 15,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginTop: 15, // Space between continue and end game
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    endGameButtonText: {
        color: '#fff',
        fontSize: 18,
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
    // Modal styles for final results
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 25,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
        width: '90%',
        maxWidth: 400,
        alignItems: 'center',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 24,
        color: '#004d00',
        marginBottom: 15,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    roundInfo: {
        fontSize: 16,
        color: '#666',
        marginBottom: 5,
        textAlign: 'center',
    },
    fengInfo: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    finalScoresContainer: {
        width: '100%',
        marginBottom: 20,
    },
    finalScoresTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#004d00',
        marginBottom: 15,
        textAlign: 'center',
    },
    finalScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    rankContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#004d00',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    rankText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    finalScoreAvatar: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        marginRight: 10,
        borderWidth: 2,
        borderColor: '#004d00',
    },
    finalScoreName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    finalScoreChips: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    positiveChips: {
        color: '#28a745', // Green for gains
    },
    negativeChips: {
        color: '#dc3545', // Red for losses
    },
    neutralChips: {
        color: '#6c757d', // Gray for neutral
    },
    exitButton: {
        backgroundColor: '#004d00',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    exitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Custom Alert Modal Styles (re-using some existing modal styles)
    modalMessage: {
        fontSize: 16,
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButton: {
        backgroundColor: '#004d00',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
        marginTop: 10,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});