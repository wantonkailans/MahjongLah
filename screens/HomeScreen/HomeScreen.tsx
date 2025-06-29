import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function HomeScreen() { 
  const navigation = useNavigation();
  const [username, setUsername] = useState('Loading...');
  const [greeting, setGreeting] = useState('Hello');

  // Get current user's username from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(userData.displayName || userData.username || 'User');
          } else {
            setUsername('User');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUsername('User');
        }
      } else {
        setUsername('Guest');
      }
    });

    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 17) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }

    return () => unsubscribe();
  }, []);
  
  const handleStartNewGame = () => {
    console.log('Start New Game pressed');
    navigation.navigate('StartGame');
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.appHeader}>
        <TouchableOpacity style={styles.headerButton} onPress={() => console.log('Menu pressed')}>
          <Text style={styles.headerIcon}>☰</Text> 
        </TouchableOpacity>
        <Image 
          source={require('../../assets/images/mahjonglah!.png')}
          style={styles.headerAppLogo} 
        />
        <TouchableOpacity style={styles.headerButton} onPress={() => console.log('Profile pressed')}>
          <Image 
            source={require('../../assets/images/boy1.png')} 
            style={styles.headerProfileAvatar} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Row - Two Cards Side by Side */}
        <View style={styles.topRowContainer}>
          {/* Welcome Card with Username */}
          <View style={styles.welcomeCardSmall}>
            <Text style={styles.greetingTextSmall}>{greeting}</Text>
            <Text style={styles.usernameTextSmall}>{username}!</Text>
            <Text style={styles.welcomeSubtextSmall}>Ready for a game?</Text>
            <View style={styles.welcomeIconSmall}>
              <Text style={styles.welcomeEmojiSmall}>👋</Text>
            </View>
          </View>

          {/* Start New Game Card */}
          <TouchableOpacity style={styles.gameCardSmall} onPress={handleStartNewGame}>
            <Image 
              source={require('../../assets/images/tiles(home).png')} 
              style={styles.cardIconSmall} 
            />
            <Text style={styles.cardTitleSmall}>Start New Game</Text>
          </TouchableOpacity>
        </View>

        {/* NUS Community Leaderboard Card */}
        <View style={styles.card}>
          <View style={styles.leaderboardHeader}>
            <Text style={styles.cardTitle}>NUS Community Leaderboard</Text>
            <Image 
              source={require('../../assets/images/nus.png')} 
              style={styles.leaderboardLogo} 
            />
          </View>
          
          <View style={styles.leaderboardEntry}>
            <Image 
              source={require('../../assets/images/boy1.png')} 
              style={styles.avatar} 
            />
            <View>
              <Text style={styles.leaderboardName}>Elynn Lee</Text>
              <Text style={styles.leaderboardEmail}>email@fakedomain.net</Text>
            </View>
          </View>
          <View style={styles.leaderboardEntry}>
            <Image 
              source={require('../../assets/images/boy1.png')} 
              style={styles.avatar} 
            />
            <View>
              <Text style={styles.leaderboardName}>James Tan</Text>
              <Text style={styles.leaderboardEmail}>email@fakedomain.net</Text>
            </View>
          </View>
          <View style={styles.leaderboardEntry}>
            <Image 
              source={require('../../assets/images/boy1.png')} 
              style={styles.avatar} 
            />
            <View>
              <Text style={styles.leaderboardName}>Elliot Chew</Text>
              <Text style={styles.leaderboardEmail}>email@fakedomain.net</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.kakiButton} onPress={() => console.log('Find Kaki pressed')}>
            <Text style={styles.kakiButtonText}>Find your Mahjong Kaki today!</Text>
          </TouchableOpacity>
        </View>

        {/* Need a hand? Card */}
        <View style={styles.aiHelpCard}>
          <Image 
            source={require('../../assets/images/robot.png')} 
            style={styles.aiRobotIcon} 
          />
          <View style={styles.aiHelpTextContainer}>
            <Text style={styles.aiHelpTitle}>Need a hand?</Text>
            <Text style={styles.aiHelpSubtitle}>Our AI can suggest your next move to maximize your chances of winning!</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => console.log('Home pressed')}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#004d00',
  },
  appHeader: {
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
  headerAppLogo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  headerProfileAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    resizeMode: 'contain',
  },
  scrollViewContent: {
    alignItems: 'center',
    paddingBottom: 100,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  welcomeCardSmall: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '48%',
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    position: 'relative',
  },
  greetingTextSmall: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  usernameTextSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#004d00',
    marginBottom: 3,
  },
  welcomeSubtextSmall: {
    fontSize: 11,
    color: '#888',
  },
  welcomeIconSmall: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f9f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeEmojiSmall: {
    fontSize: 16,
  },
  gameCardSmall: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '48%',
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardIconSmall: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  cardTitleSmall: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardMainIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  leaderboardLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  leaderboardEmail: {
    fontSize: 13,
    color: '#666',
  },
  kakiButton: {
    backgroundColor: '#F8B100',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginTop: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  kakiButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  aiHelpCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  aiRobotIcon: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginRight: 15,
  },
  aiHelpTextContainer: {
    flex: 1,
  },
  aiHelpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  aiHelpSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
});