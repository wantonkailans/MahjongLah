import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; // <--- ADD THIS IMPORT

const HomeScreen = () => {
  const navigation = useNavigation(); // <--- ADD THIS LINE to get the navigation object

  // --- ADD THIS FUNCTION ---
  const handleStartNewGame = () => {
    // Navigate to the 'StartGame' screen, as defined in App.js
    navigation.navigate('StartGame'); //
  };
  // --- END ADDED FUNCTION ---

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon}>
            <Text style={{ fontSize: 28, color: 'white' }}>☰</Text>
          </TouchableOpacity>
          <Image
            source={require('../../assets/images/mahjonglah!.png')} // logo here
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <TouchableOpacity style={styles.headerIcon}>
            <Image
              source={require('../../assets/images/boy1.png')} // boy image in assets/images
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>

        {/* Game Cards */}
        <View style={styles.gameCardsContainer}>
          {/* Modify this TouchableOpacity to call the navigation function */}
          <TouchableOpacity style={styles.gameCard} onPress={handleStartNewGame}> {/* <--- ADD onPress handler here */}
            <Image
              source={require('../../assets/images/tiles(home).png')} // tiles image in assets/images
              style={styles.gameCardImage}
              resizeMode="contain"
            />
            <Text style={styles.gameCardTitle}>Start New Game</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gameCard}>
            <Image
              source={require('../../assets/images/13.png')} // image in assets/images
              style={styles.gameCardImage}
              resizeMode="contain"
            />
            <Text style={styles.gameCardTitle}>Continue Existing Game</Text>
          </TouchableOpacity>
        </View>

        {/* Leaderboard Section */}
        <View style={styles.leaderboardSection}>
          <View style={styles.leaderboardHeader}>
            <Text style={styles.leaderboardTitle}>NUS Community Leaderboard</Text>
            <Image
              source={require('../../assets/images/nus.png')} // nus logo in assets/images
              style={styles.nusLogo}
              resizeMode="contain"
            />
          </View>
          {/* Leaderboard Items */}
          <View style={styles.leaderboardItem}>
            <Image source={require('../../assets/images/boy1.png')} style={styles.leaderboardProfile} /> {/* boy image in assets/images */}
            <View>
              <Text style={styles.leaderboardName}>Elynn Lee</Text>
              <Text style={styles.leaderboardEmail}>email@fakedomain.net</Text>
            </View>
          </View>
          <View style={styles.leaderboardItem}>
            <Image source={require('../../assets/images/boy1.png')} style={styles.leaderboardProfile} /> {/* bot image to assets/images */}
            <View>
              <Text style={styles.leaderboardName}>James Tan</Text>
              <Text style={styles.leaderboardEmail}>email@fakedomain.net</Text>
            </View>
          </View>
          <View style={styles.leaderboardItem}>
            <Image source={require('../../assets/images/boy1.png')} style={styles.leaderboardProfile} /> {/* boy image in assets/images */}
            <View>
              <Text style={styles.leaderboardName}>Elliot Chew</Text>
              <Text style={styles.leaderboardEmail}>email@fakedomain.net</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.findKakiButton}>
            <Text style={styles.findKakiButtonText}>Find your Mahjong Kaki today!</Text>
          </TouchableOpacity>
        </View>

        {/* AI Section */}
        <View style={styles.aiSection}>
          <Image
            source={require('../../assets/images/robot.png')} // robot image in assets/images
            style={styles.aiImage}
            resizeMode="contain"
          />
          <View style={styles.aiTextContainer}>
            <Text style={styles.aiTitle}>Need a hand?</Text>
            <Text style={styles.aiDescription}>Our AI can suggest your next move to maximize your chances of winning!</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#386641', // dark green background
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#386641', // match container background
  },
  headerIcon: {
    padding: 5,
  },
  headerLogo: {
    width: 150,
    height: 50,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'lightgray', // fallback color
  },
  gameCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    marginBottom: 20,
  },
  gameCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '46%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gameCardImage: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  gameCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  aiTextContainer: {
    flex: 1,
  },
  leaderboardSection: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  nusLogo: {
    width: 40,
    height: 40,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  leaderboardProfile: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: '#e0e0e0', // Fallback color
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  leaderboardEmail: {
    fontSize: 14,
    color: '#666',
  },
  findKakiButton: {
    backgroundColor: '#F8B100', // Yellowish color
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  findKakiButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiSection: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  aiImage: {
    width: 70,
    height: 70,
    marginRight: 15,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  aiDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default HomeScreen;