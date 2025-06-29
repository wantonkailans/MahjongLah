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
    TouchableWithoutFeedback, // Still imported for specific use
    Keyboard
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function ChipCountingScreen({ route }) {
    const navigation = useNavigation();
    const { players: initialPlayers, banker, distributor } = route.params || { players: [], banker: null, distributor: null };

    const [players, setPlayers] = useState(
        initialPlayers.map(p => ({
            ...p,
            // Initialize everyone with a starting chip count (e.g., 1000)
            // or 0 if you start with no chips and only gain/lose from winning
            chips: 1000 // Starting chips for demonstration (change as needed)
        }))
    );

    const [losingTileShooter, setLosingTileShooter] = useState('');
    const [winner, setWinner] = useState('');
    const [taiCount, setTaiCount] = useState('');
    const [isSelfDraw, setIsSelfDraw] = useState(false); // New state for '自摸'

    useEffect(() => {
        if (banker && distributor) {
            console.log(`Banker: ${banker.name}, Distributor: ${distributor.name}`);
        }
    }, [banker, distributor]);

    // Handle the "自摸" (Self-draw) button
    const handleSelfDraw = () => {
        setIsSelfDraw(true); // Set self-draw mode
        setLosingTileShooter(''); // Clear shooter input
        Keyboard.dismiss(); // Dismiss keyboard
        Alert.alert(
            "自摸 Mode Active",
            "Self-draw means no 'shooter'. The other 3 players will pay the winner."
        );
    };

    // Handle applying tai/points (台)
    const handleTaiApply = () => {
        Keyboard.dismiss(); // Dismiss keyboard

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

        // --- Simplified Mahjong Scoring Logic (Hong Kong/Cantonese style example) ---
        // Base payment per Tai - common to use powers of 2 for points
        // Example: 1 Tai = $X, 2 Tai = $2X, 3 Tai = $4X, etc.
        const basePointValue = 5; // Base amount for 1 Tai (e.g., $5)
        let totalPointsToPay = basePointValue * Math.pow(2, tai - 1); // Exponential for tai >= 1. tai 0 would be special.

        if (tai === 0) { // Handle 0 Tai case, usually a minimum win amount
            // For simplicity, let's say 0 Tai still gets basePointValue
            totalPointsToPay = basePointValue;
            Alert.alert("0 Tai Win", `Assuming a minimum win of ${totalPointsToPay} chips for 0 Tai. Adjust logic for specific 0-Tai rules.`);
        }


        let updatedPlayers = players.map(p => ({ ...p })); // Create a mutable copy

        if (isSelfDraw) {
            // Self-draw (自摸): All other players pay equally
            const playersToPay = updatedPlayers.filter(p => p.id !== winningPlayer.id);
            if (playersToPay.length > 0) {
                const amountPerPlayer = totalPointsToPay; // Each player pays the full amount to winner
                playersToPay.forEach(p => {
                    const playerIndex = updatedPlayers.findIndex(up => up.id === p.id);
                    if (playerIndex !== -1) {
                        updatedPlayers[playerIndex].chips -= amountPerPlayer;
                    }
                });
                const winnerIndex = updatedPlayers.findIndex(p => p.id === winningPlayer.id);
                updatedPlayers[winnerIndex].chips += (amountPerPlayer * playersToPay.length); // Winner gets from all others
            }
            Alert.alert("自摸 Win!", `${winningPlayer.name} self-drew and gained ${totalPointsToPay * playersToPay.length} chips (${tai} Tai).`);

        } else {
            // Not self-draw: Check for shooter
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

            // Shooter (放銃): Shooter pays the entire amount to the winner
            const winnerIndex = updatedPlayers.findIndex(p => p.id === winningPlayer.id);
            const shooterIndex = updatedPlayers.findIndex(p => p.id === shooterPlayer.id);

            if (winnerIndex !== -1 && shooterIndex !== -1) {
                updatedPlayers[winnerIndex].chips += totalPointsToPay;
                updatedPlayers[shooterIndex].chips -= totalPointsToPay;
            }
            Alert.alert("放銃 Win!", `${winningPlayer.name} won ${totalPointsToPay} chips (${tai} Tai) from ${shooterPlayer.name}.`);
        }

        setPlayers(updatedPlayers);

        // Reset inputs after applying
        setLosingTileShooter('');
        setWinner('');
        setTaiCount('');
        setIsSelfDraw(false); // Reset self-draw mode
    };

    const handleProceedToNextRound = () => {
        Alert.alert(
            "Next Round",
            "Proceeding to the next round. Chip counts will carry over. Ready for the next hand?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "OK", onPress: () => {
                    // Reset input fields
                    setLosingTileShooter('');
                    setWinner('');
                    setTaiCount('');
                    setIsSelfDraw(false);
                    // No need to reset player chips here, they carry over
                }}
            ]
        );
    };

    const handleEndGame = () => {
        Alert.alert(
            "End Game",
            "Are you sure you want to end the game? Final scores will be tallied.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Yes, End Game", onPress: () => {
                    // You might navigate to a final results screen, or back to home
                    navigation.navigate('StartGame'); // Example: go back to the start
                }}
            ]
        );
    };

    return (
        <SafeAreaView style={styles.fullScreenContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.navButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>End game</Text>
                <View style={styles.navButtonPlaceholder} />
            </View>

            {/* Main Content Area */}
            <KeyboardAvoidingView
                style={{ flex: 1, width: '100%' }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* The TouchableWithoutFeedback should only wrap elements that are *not* TextInputs directly. */}
                {/* We wrap the player cards and title here, allowing TextInputs outside of its direct touch capture. */}
                <View style={styles.contentContainer}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            {/* A dummy View is often necessary inside TouchableWithoutFeedback when wrapping multiple components */}
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

                        {/* Input fields and buttons are placed OUTSIDE the TouchableWithoutFeedback's direct children */}
                        <Text style={styles.sectionTitle}>Enter who shot the losing tile:</Text>
                        <View style={styles.inputGroup}>
                            <TextInput
                                style={[styles.input, isSelfDraw && styles.disabledInput]}
                                placeholder="Username"
                                placeholderTextColor="#999"
                                value={losingTileShooter}
                                onChangeText={setLosingTileShooter}
                                autoCapitalize="none"
                                editable={!isSelfDraw} // Disable if self-draw is active
                            />
                            <TouchableOpacity
                                style={[styles.miniButton, styles.selfDrawButton]} // Apply custom style
                                onPress={handleSelfDraw}
                            >
                                <Text style={styles.miniButtonText}>自摸</Text>
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

                        <TouchableOpacity style={styles.proceedButton} onPress={handleProceedToNextRound}>
                            <Text style={styles.proceedButtonText}>Proceed to next round</Text>
                        </TouchableOpacity>

                        <Text style={styles.orText}>OR</Text>

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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: '#004d00', // Dark green background
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
        overflow: 'hidden',
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center',
        paddingBottom: 40,
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
        color: '#F8B100', // Gold color for chips
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
        backgroundColor: '#e0e0e0', // Grey out when disabled
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
        backgroundColor: '#F8B100', // Default gold background
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    miniButtonText: {
        color: '#000', // Default black text
        fontSize: 15,
        fontWeight: 'bold',
    },
    selfDrawButton: {
        backgroundColor: '#6A5ACD', // A distinct color for '自摸', e.g., SlateBlue
    },
    proceedButton: {
        backgroundColor: '#F8B100',
        paddingVertical: 15,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginTop: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    orText: {
        fontSize: 14,
        color: '#666',
        marginVertical: 15,
        fontWeight: 'bold',
    },
    proceedButtonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    endGameButton: {
        backgroundColor: '#dc3545',
        paddingVertical: 15,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
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
});