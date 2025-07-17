import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../../firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [username, setUsername] = useState('Loading...');
  const [greeting, setGreeting] = useState('Hello');
  const [profileImage, setProfileImage] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(userData.displayName || userData.username || 'User');

            let profileImageData = userData.profileImage;
            if (profileImageData && !profileImageData.startsWith('data:')) {
              profileImageData = `data:image/jpeg;base64,${profileImageData}`;
            }
            setProfileImage(profileImageData || null);
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

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTop3 = async () => {
      const leaderboardQuery = query(
        collection(db, 'leaderboard'),
        orderBy('totalScore', 'desc'),
        limit(3)
      );
      const snapshot = await getDocs(leaderboardQuery);
      const players = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        displayName: doc.data().displayName || 'Anonymous',
        totalScore: doc.data().totalScore || 0,
        rank: index + 1,
      }));
      setTopPlayers(players);
    };

    fetchTop3();
  }, []);

  const handleStartNewGame = () => navigation.navigate('StartGame');
  const handleProfilePress = () => navigation.navigate('Profile');

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => console.log('Menu pressed')}>
          <Text style={styles.headerIcon}>☰</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/images/mahjonglah!.png')} style={styles.headerAppLogo} />
        <TouchableOpacity onPress={handleProfilePress}>
          <Image
            source={profileImage ? { uri: profileImage } : require('../../assets/images/boy1.png')}
            style={styles.headerProfileAvatar}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
        {/* Top Row */}
        <View style={styles.topRowContainer}>
          <View style={styles.welcomeCardSmall}>
            <Text style={styles.greetingTextSmall}>{greeting}</Text>
            <Text style={styles.usernameTextSmall}>{username}!</Text>
            <Text style={styles.welcomeSubtextSmall}>Ready for a game?</Text>
            <View style={styles.welcomeIconSmall}>
              <Text style={styles.welcomeEmojiSmall}>👋</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.gameCardSmall} onPress={handleStartNewGame}>
            <Image source={require('../../assets/images/tiles(home).png')} style={styles.cardIconSmall} />
            <Text style={styles.cardTitleSmall}>Start New Game</Text>
          </TouchableOpacity>
        </View>

        {/* NUS Community Leaderboard Card */}
        <View style={styles.card}>
          <View style={styles.leaderboardHeader}>
            <Text style={styles.cardTitle}>NUS Community Leaderboard</Text>
            <Image source={require('../../assets/images/nus.png')} style={styles.leaderboardLogo} />
          </View>

          {topPlayers.map((player) => (
            <View key={player.id} style={styles.leaderboardItem}>
              <View style={styles.playerInfo}>
                <Image
                  source={require('../../assets/images/boy1.png')}
                  style={styles.playerAvatar}
                />
                <Text style={styles.playerName}>{player.displayName}</Text>
              </View>
              <Text style={styles.playerScore}>{player.totalScore} pts</Text>
            </View>
          ))}

          <TouchableOpacity
            onPress={() => navigation.navigate('Leaderboard')}
            style={styles.leaderboardButton}
          >
            <Text style={styles.leaderboardButtonText}>View Full Leaderboard</Text>
          </TouchableOpacity>
        </View>

        {/* AI Assistant Section */}
        <TouchableOpacity
          onPress={() => navigation.navigate('MahjongAnalyzer')}
          activeOpacity={0.8}
          style={styles.aiSection}
        >
          <Image source={require('../../assets/images/robot.png')} style={styles.aiImage} resizeMode="contain" />
          <View style={styles.aiTextContainer}>
            <Text style={styles.aiTitle}>Need a hand?</Text>
            <Text style={styles.aiDescription}>
              Our AI can suggest your next move to maximize your chances of winning!
            </Text>
          </View>
        </TouchableOpacity>

        {/* Need a Friend Section */}
        <TouchableOpacity
          onPress={() => navigation.navigate('FriendFinder')}
          activeOpacity={0.8}
          style={styles.friendSection}
        >
          <View style={styles.friendIconContainer}>
            <Text style={styles.friendIcon}>👥</Text>
          </View>
          <View style={styles.friendTextContainer}>
            <Text style={styles.friendTitle}>Need a friend to play with?</Text>
            <Text style={styles.friendDescription}>
              Use our Mahjong Kaki Finder to find more friends!
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity onPress={() => console.log('Home pressed')}>
          <Text style={styles.navTextIcon}>🏠</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => console.log('Search pressed')}>
          <Text style={styles.navTextIcon}>🔍</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleProfilePress}>
          <Text style={styles.navTextIcon}>👤</Text>
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
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  leaderboardLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  playerScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004d00',
  },
  leaderboardButton: {
    backgroundColor: '#f9a825',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 15,
    alignItems: 'center',
    width: '100%',
  },
  leaderboardButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  aiSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    marginBottom: 15,
  },
  aiImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginRight: 15,
  },
  aiTextContainer: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  aiDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  friendSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },
  friendIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  friendIcon: {
    fontSize: 24,
  },
  friendTextContainer: {
    flex: 1,
  },
  friendTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  friendDescription: {
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
  },
  navTextIcon: {
    fontSize: 24,
    color: '#666',
  },
});