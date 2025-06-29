import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    Platform,
    StatusBar,
    SafeAreaView,
    Image,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function ChipCountingScreen({ route }) {
    const navigation = useNavigation();
    const { players: initialPlayers, banker, distributor } = route.params || { players: [], banker: null, distributor: null };

    const [players, setPlayers] = useState(
        initialPlayers.map(p => ({
            ...p,
            chips: 1000 // Starting chips
        }))
    );

    const [losingTileShooter, setLosingTileShooter] = useState('');
    const [winner, setWinner] = useState('');
    const [taiCount, setTaiCount] = useState('');
    const [isSelfDraw, setIsSelfDraw] = useState(false);
    
    // New state for feng (wind) rotation
    const [currentFeng, setCurrentFeng] = useState('东'); // Start with East
    const [roundCount, setRoundCount] = useState(0);
    
    // New state for final results modal
    const [showFinalResults, setShowFinalResults] = useState(false);

    // Feng rotation order
    const fengOrder = ['东', '南', '西', '北'];

    useEffect(() => {
        if (banker && distributor) {
            console.log(`Banker: ${banker.name}, Distributor: ${distributor.name}`);
        }
    }, [banker, distributor]);

    // Update feng based on round count
    useEffect(() => {
        const fengIndex = Math.floor(roundCount / 4) % 4;
        setCurrentFeng(fengOrder[fengIndex]);
    }, [roundCount]);

    // Handle the "自摸" (Self-draw) button - now toggleable
    const handleSelfDraw = () => {
        if (isSelfDraw) {
            // If already selected, deselect it
            setIsSelfDraw(false);
            Alert.alert(
                "自摸 Deselected",
                "You can now enter who shot the losing tile."
            );
        } else {
            // Select self-draw mode
            setIsSelfDraw(true);
            setLosingTileShooter(''); // Clear shooter input
            Keyboard.dismiss();
            Alert.alert(
                "自摸 Mode Active",
                "Self-draw means no 'shooter'. The other 3 players will pay the winner."
            );
        }
    };

    // Handle applying tai/points (台)
    const handleTaiApply = () => {
        Keyboard.dismiss();

        if (!winner || isNaN(parseInt(taiCount)) || taiCount === '' || parseInt(taiCount) < 0) {
            Alert.alert("Input Required", "Please enter a winner's username and a valid 'Tai' count (>= 0).");
            return;
        }

        const tai = parseInt(taiCount);
        const winningPlayer = players.find(p => p.name.toLowerCase() === winner.toLowerCase());

        if (!winningPlayer) {
            Alert.alert("Invalid Winner", `${winner} is not a recognized player. Please enter an existing username.`);
            return;
        }

        const basePointValue = 5;
        let totalPointsToPay = basePointValue * Math.pow(2, tai - 1);

        if (tai === 0) {
            totalPointsToPay = basePointValue;
            Alert.alert("0 Tai Win", `Assuming a minimum win of ${totalPointsToPay} chips for 0 Tai.`);
        }

        let updatedPlayers = players.map(p => ({ ...p }));

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
            Alert.alert("自摸 Win!", `${winningPlayer.name} self-drew and gained ${totalPointsToPay * playersToPay.length} chips (${tai} Tai).`);

        } else {
            if (!losingTileShooter) {
                Alert.alert("Input Required", "Please enter who shot the losing tile (放銃), or select '自摸' if it was a self-draw.");
                return;
            }

            const shooterPlayer = updatedPlayers.find(p => p.name.toLowerCase() === losingTileShooter.toLowerCase());

            if (!shooterPlayer) {
                Alert.alert("Invalid Shooter", `${losingTileShooter} is not a recognized player.`);
                return;
            }

            if (shooterPlayer.id === winningPlayer.id) {
                Alert.alert("Invalid Input", "The winner cannot be the shooter of their own winning tile (unless it's self-draw). Please check your input.");
                return;
            }

            const winnerIndex = updatedPlayers.findIndex(p => p.id === winningPlayer.id);
            const shooterIndex = updatedPlayers.findIndex(p => p.id === shooterPlayer.id);

            if (winnerIndex !== -1 && shooterIndex !== -1) {
                updatedPlayers[winnerIndex].chips += totalPointsToPay;
                updatedPlayers[shooterIndex].chips -= totalPointsToPay;
            }
            Alert.alert("放銃 Win!", `${winningPlayer.name} won ${totalPointsToPay} chips (${tai} Tai) from ${shooterPlayer.name}.`);
        }

        setPlayers(updatedPlayers);

        // Increment round count to update feng
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
        navigation.navigate('Home');
    };

    return (
        <SafeAreaView style={styles.fullScreenContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.navButtonText}>← Back</Text>
                </TouchableOpacity>
                <Image
                    source={require('../assets/images/mahjonglah!.png')}
                    style={styles.headerLogo}
                    resizeMode="contain"
                />
                <View style={styles.navButtonPlaceholder} />
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

                                <View style={styles.playerChipsContainer}>
                                    {players.map(player => (
                                        <View key={player.id} style={styles.playerChipCard}>
                                            <Image
                                                source={require('../assets/images/boy1.png')}
                                                style={styles.playerChipAvatar}
                                            />
                                            <Text style={styles.playerChipName}>{player.name}</Text>
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
                            Game ended after {roundCount} round{roundCount !== 1 ? 's' : ''}
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
                                        <Image
                                            source={require('../assets/images/boy1.png')}
                                            style={styles.finalScoreAvatar}
                                        />
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
    headerLogo: {
        width: 120,
        height: 40,
        resizeMode: 'contain',
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
        marginBottom: 25,
        fontWeight: 'bold',
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
    playerChipAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: '#004d00',
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
    endGameButton: {
        backgroundColor: '#dc3545',
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
});