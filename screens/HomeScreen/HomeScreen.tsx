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
  ActivityIndicator,
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

interface TopPlayer {
  id: string;
  displayName: string;
  totalScore: number;
  rank: number;
  profileImage?: string | null;
  profileImageLoaded?: boolean;
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [username, setUsername] = useState('Loading...');
  const [greeting, setGreeting] = useState('Hello');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);

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

  // Load top 3 players for leaderboard preview
  useEffect(() => {
    const fetchTop3 = async () => {
      try {
        console.log('🔄 Loading top 3 players for home screen...');
        
        const leaderboardQuery = query(
          collection(db, 'leaderboard'),
          orderBy('totalScore', 'desc'),
          limit(3)
        );
        const snapshot = await getDocs(leaderboardQuery);
        const players: TopPlayer[] = snapshot.docs.map((doc, index) => ({
          id: doc.id,
          displayName: doc.data().displayName || 'Anonymous',
          totalScore: doc.data().totalScore || 0,
          rank: index + 1,
          profileImage: null,
          profileImageLoaded: false,
        }));

        console.log('📋 Initial top 3 players loaded:', players.length, 'players');

        // Fetch profile images for top 3 players
        const updatedPlayers = await Promise.all(
          players.map(async (player) => {
            try {
              console.log(`\n🔍 Fetching profile for ${player.displayName} (ID: ${player.id})`);
              
              const userDocRef = doc(db, 'users', player.id);
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log(`📋 ${player.displayName}: User data found`);
                console.log(`📋 ${player.displayName}: Profile image exists:`, !!userData.profileImage);
                
                let profileImage = userData.profileImage;
                
                if (profileImage) {
                  console.log(`📋 ${player.displayName}: Profile image length:`, profileImage.length);
                  console.log(`📋 ${player.displayName}: Profile image starts with:`, profileImage.substring(0, 30));
                  
                  if (!profileImage.startsWith('data:')) {
                    profileImage = `data:image/jpeg;base64,${profileImage}`;
                    console.log(`✅ ${player.displayName}: Added data URI prefix`);
                  }
                  
                  console.log(`✅ ${player.displayName}: Profile image ready`);
                  return { ...player, profileImage, profileImageLoaded: true };
                } else {
                  console.log(`❌ ${player.displayName}: No profile image in user data`);
                  return { ...player, profileImage: null, profileImageLoaded: true };
                }
              } else {
                console.log(`❌ ${player.displayName}: No user document found`);
                return { ...player, profileImage: null, profileImageLoaded: true };
              }
            } catch (error) {
              console.error(`❌ ${player.displayName}: Error fetching profile:`, error);
              return { ...player, profileImage: null, profileImageLoaded: true };
            }
          })
        );

        console.log('🎯 Profile images fetched for top 3 players');
        console.log('📊 Results:', updatedPlayers.map(p => ({ 
          name: p.displayName, 
          hasProfileImage: !!p.profileImage,
          profileImageLoaded: p.profileImageLoaded 
        })));

        setTopPlayers(updatedPlayers);
      } catch (error) {
        console.error('Error fetching top players:', error);
        // Fallback to dummy data if leaderboard fails
        setTopPlayers([
          { id: '1', displayName: 'Elynn Lee', totalScore: 1500, rank: 1, profileImage: null, profileImageLoaded: true },
          { id: '2', displayName: 'James Tan', totalScore: 1200, rank: 2, profileImage: null, profileImageLoaded: true },
          { id: '3', displayName: 'Elliot Chew', totalScore: 1100, rank: 3, profileImage: null, profileImageLoaded: true },
        ]);
      }
    };

    fetchTop3();
  }, []);

  // Avatar component similar to DiceRollGameScreen
  const Avatar = ({ player, style }: { player: TopPlayer; style: any }) => {
    console.log(`🖼️ Avatar render for ${player.displayName}:`, {
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
            console.log(`✅ Avatar loaded successfully for ${player.displayName}`);
          }}
          onError={(error) => {
            console.error(`❌ Avatar load error for ${player.displayName}:`, error.nativeEvent);
          }}
        />
      );
    }

    console.log(`🔄 Using default avatar for ${player.displayName}`);
    return (
      <Image
        source={require('../../assets/images/boy1.png')}
        style={style}
      />
    );
  };

  // Handler functions
  const handleStartNewGame = () => {
    console.log('Start New Game pressed');
    navigation.navigate('StartGame');
  };

  const handleProfilePress = () => {
    console.log('Profile pressed');
    navigation.navigate('Profile');
  };

  const handleSearchPress = () => {
    console.log('Search pressed');
    navigation.navigate('Search');
  };

  const handleLeaderboardPress = () => {
    console.log('Leaderboard pressed');
    navigation.navigate('Leaderboard');
  };

  // FIXED: Changed to navigate to Messaging instead of Search
  const handleKakiFinderPress = () => {
    console.log('Mahjong Kaki Finder pressed - navigating to Messaging');
    navigation.navigate('Messaging');
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
        <TouchableOpacity style={styles.headerButton} onPress={handleProfilePress}>
          {profileImage ? (
            <Image 
              source={{ uri: profileImage }} 
              style={styles.headerProfileAvatar}
              onError={(error) => {
                console.warn('Error loading header profile image:', error);
                setProfileImage(null);
              }}
            />
          ) : (
            <Image 
              source={require('../../assets/images/boy1.png')} 
              style={styles.headerProfileAvatar} 
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollViewContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Top Row - Two Cards Side by Side */}
        <View style={styles.topRowContainer}>
          {/* Welcome Card */}
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

          {topPlayers.map((player) => (
            <View key={player.id} style={styles.leaderboardItem}>
              <View style={styles.playerInfo}>
                <Avatar player={player} style={styles.playerAvatar} />
                <Text style={styles.playerName}>{player.displayName}</Text>
              </View>
              <Text style={styles.playerScore}>{player.totalScore} pts</Text>
            </View>
          ))}

          <TouchableOpacity
            style={styles.leaderboardButton}
            onPress={handleLeaderboardPress}
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
          <Image 
            source={require('../../assets/images/robot.png')} 
            style={styles.aiImage} 
            resizeMode="contain" 
          />
          <View style={styles.aiTextContainer}>
            <Text style={styles.aiTitle}>Need a hand?</Text>
            <Text style={styles.aiDescription}>
              Our AI can suggest your next move to maximize your chances of winning!
            </Text>
          </View>
        </TouchableOpacity>

        {/* Friend Finder Section - FIXED: Now navigates to Messaging */}
        <TouchableOpacity
          onPress={handleKakiFinderPress}
          activeOpacity={0.8}
          style={styles.friendSection}
        >
          <View style={styles.friendIconContainer}>
            <Text style={styles.friendIcon}>👥</Text>
          </View>
          <View style={styles.friendTextContainer}>
            <Text style={styles.friendTitle}>Need a friend to play with?</Text>
            <Text style={styles.friendDescription}>
              Send messages to your friends and find new players to play with!
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => console.log('Home pressed')}>
          <View style={styles.navIconContainer}>
            <Text style={styles.navTextIcon}>🏠</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={handleSearchPress}>
          <View style={styles.navIconContainer}>
            <Text style={styles.navTextIcon}>🔍</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={handleProfilePress}>
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
    padding: 5 
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    borderWidth: 2,
    borderColor: '#004d00',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#F8B100',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 15,
    alignItems: 'center',
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  leaderboardButtonText: {
    color: '#000',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  friendIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f9f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  friendIcon: {
    fontSize: 30,
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