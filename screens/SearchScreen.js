import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Platform, 
  StatusBar, 
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  writeBatch,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

export default function SearchScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentPlayers, setRecentPlayers] = useState([]);
  const [popularPlayers, setPopularPlayers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userFriends, setUserFriends] = useState([]);
  const searchTimeout = useRef(null);

  // Load current user and their friends
  useEffect(() => {
    const loadCurrentUser = async () => {
      if (auth.currentUser) {
        setCurrentUser(auth.currentUser);
        await loadUserFriends();
      }
    };
    loadCurrentUser();
  }, []);

  // Load user's friends list
  const loadUserFriends = async () => {
    try {
      if (!auth.currentUser) return;
      
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserFriends(userData.friends || []);
      }
    } catch (error) {
      console.error('Error loading user friends:', error);
    }
  };

  // Load initial data when component mounts
  useEffect(() => {
    loadPopularPlayers();
    loadRecentPlayers();
  }, []);

  // Avatar component following DiceRollGameScreen pattern
  const Avatar = ({ player, style }) => {
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
        source={require('../assets/images/boy1.png')}
        style={style}
      />
    );
  };

  // Enhanced function to fetch and process player data with profile images
  const fetchPlayerWithProfileImage = async (userData, docId) => {
    try {
      console.log(`🔍 Fetching profile for ${userData.displayName || userData.username} (ID: ${docId})`);
      
      let profileImage = userData.profileImage;
      let profileImageLoaded = false;
      
      if (profileImage) {
        console.log(`📋 ${userData.displayName || userData.username}: Profile image length:`, profileImage.length);
        console.log(`📋 ${userData.displayName || userData.username}: Profile image starts with:`, profileImage.substring(0, 30));
        
        if (!profileImage.startsWith('data:')) {
          profileImage = `data:image/jpeg;base64,${profileImage}`;
          console.log(`✅ ${userData.displayName || userData.username}: Added data URI prefix`);
        }
        
        console.log(`✅ ${userData.displayName || userData.username}: Profile image ready`);
        profileImageLoaded = true;
      } else {
        console.log(`❌ ${userData.displayName || userData.username}: No profile image in user data`);
        profileImage = null;
        profileImageLoaded = true;
      }

      return {
        id: docId,
        displayName: userData.displayName || userData.username || 'Anonymous',
        username: userData.username || 'No username',
        email: userData.email || 'No email',
        avatar: profileImage || require('../assets/images/boy1.png'),
        profileImage: profileImage,
        profileImageLoaded: profileImageLoaded,
        gamesPlayed: userData.gamesPlayed || 0,
        winRate: userData.winRate || 0,
        totalPoints: userData.totalPoints || 0,
        currentPoints: userData.currentPoints || 0,
        isOnline: userData.isOnline || false,
        lastActive: userData.lastActive
      };
    } catch (error) {
      console.error(`❌ Error processing ${userData.displayName || userData.username}:`, error);
      return {
        id: docId,
        displayName: userData.displayName || userData.username || 'Anonymous',
        username: userData.username || 'No username',
        email: userData.email || 'No email',
        avatar: require('../assets/images/boy1.png'),
        profileImage: null,
        profileImageLoaded: true,
        gamesPlayed: userData.gamesPlayed || 0,
        winRate: userData.winRate || 0,
        totalPoints: userData.totalPoints || 0,
        currentPoints: userData.currentPoints || 0,
        isOnline: userData.isOnline || false,
        lastActive: userData.lastActive
      };
    }
  };

  // Load popular/featured players with profile images
  const loadPopularPlayers = async () => {
    try {
      console.log('🔄 Loading popular players with profile images...');
      const playersQuery = query(
        collection(db, 'users'),
        orderBy('totalPoints', 'desc'),
        limit(5)
      );
      const querySnapshot = await getDocs(playersQuery);
      const players = [];
      
      for (const doc of querySnapshot.docs) {
        const userData = doc.data();
        if (doc.id !== auth.currentUser?.uid) {
          const playerWithImage = await fetchPlayerWithProfileImage(userData, doc.id);
          players.push(playerWithImage);
        }
      }
      
      console.log('📊 Popular players loaded:', players.map(p => ({ 
        name: p.displayName, 
        hasProfileImage: !!p.profileImage 
      })));
      setPopularPlayers(players);
    } catch (error) {
      console.error('Error loading popular players:', error);
    }
  };

  // Load recent players with profile images
  const loadRecentPlayers = async () => {
    try {
      console.log('🔄 Loading recent players with profile images...');
      const playersQuery = query(
        collection(db, 'users'),
        orderBy('lastActive', 'desc'),
        limit(3)
      );
      const querySnapshot = await getDocs(playersQuery);
      const players = [];
      
      for (const doc of querySnapshot.docs) {
        const userData = doc.data();
        if (doc.id !== auth.currentUser?.uid) {
          const playerWithImage = await fetchPlayerWithProfileImage(userData, doc.id);
          players.push(playerWithImage);
        }
      }
      
      console.log('📊 Recent players loaded:', players.map(p => ({ 
        name: p.displayName, 
        hasProfileImage: !!p.profileImage 
      })));
      setRecentPlayers(players);
    } catch (error) {
      console.error('Error loading recent players:', error);
    }
  };

  // Simple search function that avoids TextEncoder issues with profile images
  const searchPlayers = async (searchText) => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchText.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 Starting search with profile images for:', searchText);
      const results = new Map();

      // Method 1: Try exact username match first
      try {
        const exactUsernameQuery = query(
          collection(db, 'users'),
          where('username', '==', searchText),
          limit(5)
        );
        const exactSnapshot = await getDocs(exactUsernameQuery);
        
        for (const doc of exactSnapshot.docs) {
          const userData = doc.data();
          if (doc.id !== auth.currentUser?.uid) {
            const playerWithImage = await fetchPlayerWithProfileImage(userData, doc.id);
            results.set(doc.id, playerWithImage);
          }
        }
      } catch (error) {
        console.log('Exact username search failed:', error);
      }

      // Method 2: Try email match
      try {
        const emailQuery = query(
          collection(db, 'users'),
          where('email', '==', searchText),
          limit(3)
        );
        const emailSnapshot = await getDocs(emailQuery);
        
        for (const doc of emailSnapshot.docs) {
          const userData = doc.data();
          if (doc.id !== auth.currentUser?.uid) {
            const playerWithImage = await fetchPlayerWithProfileImage(userData, doc.id);
            results.set(doc.id, playerWithImage);
          }
        }
      } catch (error) {
        console.log('Email search failed:', error);
      }

      // Method 3: If no exact matches, get all users and filter client-side
      if (results.size === 0) {
        try {
          const allUsersQuery = query(
            collection(db, 'users'),
            limit(50)
          );
          const allSnapshot = await getDocs(allUsersQuery);
          const searchLower = searchText.toLowerCase();
          
          for (const doc of allSnapshot.docs) {
            const userData = doc.data();
            if (doc.id !== auth.currentUser?.uid) {
              const displayName = (userData.displayName || '').toLowerCase();
              const username = (userData.username || '').toLowerCase();
              const email = (userData.email || '').toLowerCase();
              
              if (displayName.includes(searchLower) || 
                  username.includes(searchLower) || 
                  email.includes(searchLower)) {
                
                const playerWithImage = await fetchPlayerWithProfileImage(userData, doc.id);
                results.set(doc.id, playerWithImage);
              }
            }
          }
        } catch (error) {
          console.log('Client-side search failed:', error);
        }
      }

      // Sort results by relevance
      const sortedResults = Array.from(results.values()).sort((a, b) => {
        const aExactUsername = a.username.toLowerCase() === searchText.toLowerCase();
        const bExactUsername = b.username.toLowerCase() === searchText.toLowerCase();
        
        if (aExactUsername && !bExactUsername) return -1;
        if (!aExactUsername && bExactUsername) return 1;
        
        return (b.totalPoints || 0) - (a.totalPoints || 0);
      });

      console.log('🎯 Search results with profile images:', sortedResults.map(p => ({ 
        name: p.displayName, 
        hasProfileImage: !!p.profileImage 
      })));
      setSearchResults(sortedResults.slice(0, 10));
      
    } catch (error) {
      console.error('Search failed completely:', error);
      Alert.alert('Search Error', 'Unable to search at this time. Please try again.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input change with improved debouncing
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      searchPlayers(text);
    }, 300);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
  };

  // Function to send friend notification to both users
  const sendFriendNotifications = async (friendId, friendName, friendUsername, currentUserName, currentUserUsername) => {
    try {
      const timestamp = new Date().toISOString();
      
      // Only send notification to the friend (person being added)
      // Remove the current user notification to avoid permission issues
      const friendNotificationId = `friend_${auth.currentUser.uid}_${friendId}_${Date.now()}`;
      await setDoc(doc(db, 'notifications', friendNotificationId), {
        id: friendNotificationId,
        type: 'friend_added',
        recipientId: friendId,
        senderId: auth.currentUser.uid,
        senderName: currentUserName,
        senderUsername: currentUserUsername,
        title: 'New Friend Added!',
        message: `${currentUserName} (@${currentUserUsername}) added you as a friend!`,
        timestamp: serverTimestamp(),
        read: false,
        createdAt: timestamp
      });
      
      console.log(`📧 Friend notification sent to ${friendName}`);
    } catch (error) {
      console.error('Error sending friend notifications:', error);
      // Don't throw error - friendship still works without notifications
    }
  };

  // Enhanced add friend function with notifications
  const addFriend = async (friendId, friendName, friendUsername) => {
    try {
      if (!auth.currentUser) {
        Alert.alert('Error', 'Please login to add friends');
        return;
      }

      if (userFriends.includes(friendId)) {
        Alert.alert('Info', `You are already friends with ${friendName || friendUsername}`);
        return;
      }

      if (friendId === auth.currentUser.uid) {
        Alert.alert('Error', 'You cannot add yourself as a friend');
        return;
      }

      const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const currentUserData = currentUserDoc.data();

      const friendDoc = await getDoc(doc(db, 'users', friendId));
      const friendData = friendDoc.data();

      if (!friendDoc.exists()) {
        Alert.alert('Error', 'User not found');
        return;
      }

      // Create friendship document in friendships collection
      const friendshipId = [auth.currentUser.uid, friendId].sort().join('_');
      const friendshipData = {
        users: [auth.currentUser.uid, friendId],
        user1: {
          id: auth.currentUser.uid,
          displayName: currentUserData.displayName || currentUserData.username || 'Anonymous',
          username: currentUserData.username || 'No username',
          avatar: currentUserData.avatar || null
        },
        user2: {
          id: friendId,
          displayName: friendData.displayName || friendData.username || 'Anonymous',
          username: friendData.username || 'No username',
          avatar: friendData.avatar || null
        },
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      const batch = writeBatch(db);
      
      // Add friendship document
      batch.set(doc(db, 'friendships', friendshipId), friendshipData);
      
      // Update current user's friends array
      batch.update(doc(db, 'users', auth.currentUser.uid), {
        friends: arrayUnion(friendId)
      });

      // Update friend's friends array
      batch.update(doc(db, 'users', friendId), {
        friends: arrayUnion(auth.currentUser.uid)
      });

      await batch.commit();

      // Send notifications to both users
      await sendFriendNotifications(
        friendId, 
        friendData.displayName || friendData.username || 'Anonymous',
        friendData.username || 'user',
        currentUserData.displayName || currentUserData.username || 'Anonymous',
        currentUserData.username || 'user'
      );

      setUserFriends([...userFriends, friendId]);
      Alert.alert('Success', `You are now friends with ${friendName || friendUsername}!`);
      
    } catch (error) {
      console.error('Error adding friend:', error);
      Alert.alert('Error', 'Failed to add friend. Please try again.');
    }
  };

  // Enhanced remove friend with confirmation
  const removeFriend = async (friendId, friendName, friendUsername) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName || friendUsername} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (!auth.currentUser) {
                Alert.alert('Error', 'Please login to remove friends');
                return;
              }

              const friendshipId = [auth.currentUser.uid, friendId].sort().join('_');
              const batch = writeBatch(db);
              
              // Remove friendship document
              batch.delete(doc(db, 'friendships', friendshipId));
              
              // Remove friend from current user's friends list
              batch.update(doc(db, 'users', auth.currentUser.uid), {
                friends: arrayRemove(friendId)
              });

              // Remove current user from friend's friends list
              batch.update(doc(db, 'users', friendId), {
                friends: arrayRemove(auth.currentUser.uid)
              });

              await batch.commit();

              setUserFriends(userFriends.filter(id => id !== friendId));
              Alert.alert('Success', `You are no longer friends with ${friendName || friendUsername}`);
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Enhanced player selection with more options
  const handlePlayerSelect = (player) => {
    const isFriend = userFriends.includes(player.id);
    
    Alert.alert(
      'Player Profile',
      `${player.displayName}\n@${player.username}\nPoints: ${player.totalPoints || 0}\nGames: ${player.gamesPlayed || 0}\nWin Rate: ${((player.winRate || 0) * 100).toFixed(1)}%${player.isOnline ? '\n🟢 Online' : '\n⚫ Offline'}`,
      [
        { text: 'View Profile', onPress: () => handleViewProfile(player) },
        { text: 'Invite to Game', onPress: () => handleInviteToGame(player) },
        { 
          text: isFriend ? 'Remove Friend' : 'Add Friend', 
          onPress: () => handleAddFriend(player)
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Handle view profile
  const handleViewProfile = (player) => {
    console.log('View profile:', player.id);
  };

  // Handle invite to game
  const handleInviteToGame = (player) => {
    console.log('Invite to game:', player.id);
  };

  // Handle add/remove friend button press
  const handleAddFriend = (player) => {
    const isFriend = userFriends.includes(player.id);
    
    if (isFriend) {
      removeFriend(player.id, player.displayName, player.username);
    } else {
      addFriend(player.id, player.displayName, player.username);
    }
  };

  // Render player item with enhanced UI and Avatar component
  const renderPlayerItem = (player, showStats = false) => {
    const isFriend = userFriends.includes(player.id);
    
    return (
      <TouchableOpacity 
        key={player.id} 
        style={styles.playerItem} 
        onPress={() => handlePlayerSelect(player)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Avatar player={player} style={styles.playerAvatar} />
          {player.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{player.displayName}</Text>
          <Text style={styles.playerUsername}>@{player.username}</Text>
          <Text style={styles.playerPoints}>Points: {player.totalPoints || 0}</Text>
          {showStats && (
            <Text style={styles.playerStats}>
              Games: {player.gamesPlayed || 0} | Win Rate: {((player.winRate || 0) * 100).toFixed(1)}%
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.addButton, isFriend && styles.friendButton]} 
          onPress={() => handleAddFriend(player)}
          activeOpacity={0.8}
        >
          <Text style={[styles.addButtonText, isFriend && styles.friendButtonText]}>
            {isFriend ? '✓' : '+'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Left: Back button, Middle: Title, Right: Logo */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Text style={styles.headerIcon}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Find Players</Text>
        </View>
        <View style={styles.headerRight}>
          <Image
            source={require('../assets/images/mahjonglah!.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username, name, or email..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => searchPlayers(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={clearSearch}
              activeOpacity={0.7}
            >
              <Text style={styles.clearIcon}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Results */}
        {searchQuery.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Search Results</Text>
              {isLoading && <ActivityIndicator size="small" color="#fff" />}
            </View>
            
            {searchResults.length > 0 ? (
              <View style={styles.card}>
                {searchResults.map(player => renderPlayerItem(player, true))}
              </View>
            ) : !isLoading && searchQuery.length >= 2 && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsIcon}>🔍</Text>
                <Text style={styles.noResultsText}>No players found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try searching with a different username or name
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recent Players */}
        {searchQuery.length === 0 && recentPlayers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Players</Text>
            <View style={styles.card}>
              {recentPlayers.map(player => renderPlayerItem(player))}
            </View>
          </View>
        )}

        {/* Popular Players */}
        {searchQuery.length === 0 && popularPlayers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Players</Text>
            <View style={styles.card}>
              {popularPlayers.map(player => renderPlayerItem(player, true))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {searchQuery.length === 0 && recentPlayers.length === 0 && popularPlayers.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No players found</Text>
            <Text style={styles.emptySubtext}>Check back later for more players</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation - Updated to match DiceRollGameScreen positioning */}
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
  container: {
    flex: 1,
    backgroundColor: '#004d00',
  },
  // Updated header to match DiceRollGameScreen
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 10,
    backgroundColor: '#004d00',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 15,
  },
  headerButton: {
    padding: 5,
    minWidth: 40,
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    backgroundColor: '#004d00',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#006600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
    borderRadius: 15,
  },
  clearIcon: {
    fontSize: 20,
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: { 
    paddingBottom: 100,
    paddingHorizontal: 20, 
    paddingTop: 10 
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  playerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#004d00',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#28a745',
    borderWidth: 2,
    borderColor: '#fff',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  playerUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  playerPoints: {
    fontSize: 14,
    color: '#004d00',
    fontWeight: '600',
    marginTop: 2,
  },
  playerStats: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#004d00',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  friendButton: {
    backgroundColor: '#28a745',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  friendButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  noResultsText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 5,
    fontWeight: '600',
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 5,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  // Updated bottom navigation to match DiceRollGameScreen
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