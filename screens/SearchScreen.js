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
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function SearchScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentPlayers, setRecentPlayers] = useState([]);
  const [popularPlayers, setPopularPlayers] = useState([]);

  // Load initial data when component mounts
  useEffect(() => {
    loadPopularPlayers();
    loadRecentPlayers();
  }, []);

  // Load popular/featured players
  const loadPopularPlayers = async () => {
    try {
      const playersQuery = query(
        collection(db, 'users'),
        orderBy('gamesPlayed', 'desc'),
        limit(5)
      );
      const querySnapshot = await getDocs(playersQuery);
      const players = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        players.push({
          id: doc.id,
          displayName: userData.displayName || userData.username || 'Anonymous',
          email: userData.email || 'No email',
          avatar: userData.avatar || require('../assets/images/boy1.png'),
          gamesPlayed: userData.gamesPlayed || 0,
          winRate: userData.winRate || 0
        });
      });
      setPopularPlayers(players);
    } catch (error) {
      console.error('Error loading popular players:', error);
    }
  };

  // Load recent players (you might want to implement this based on your app's logic)
  const loadRecentPlayers = async () => {
    // This could be based on recent games, friends, etc.
    // For now, we'll use a similar query but with different ordering
    try {
      const playersQuery = query(
        collection(db, 'users'),
        orderBy('lastActive', 'desc'),
        limit(3)
      );
      const querySnapshot = await getDocs(playersQuery);
      const players = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        players.push({
          id: doc.id,
          displayName: userData.displayName || userData.username || 'Anonymous',
          email: userData.email || 'No email',
          avatar: userData.avatar || require('../assets/images/boy1.png'),
          lastActive: userData.lastActive
        });
      });
      setRecentPlayers(players);
    } catch (error) {
      console.error('Error loading recent players:', error);
    }
  };

  // Search for players by username
  const searchPlayers = async (searchText) => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Search by display name
      const displayNameQuery = query(
        collection(db, 'users'),
        where('displayName', '>=', searchText),
        where('displayName', '<=', searchText + '\uf8ff'),
        limit(10)
      );

      // Search by username
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '>=', searchText),
        where('username', '<=', searchText + '\uf8ff'),
        limit(10)
      );

      const [displayNameSnapshot, usernameSnapshot] = await Promise.all([
        getDocs(displayNameQuery),
        getDocs(usernameQuery)
      ]);

      const results = new Map(); // Use Map to avoid duplicates

      // Process display name results
      displayNameSnapshot.forEach((doc) => {
        const userData = doc.data();
        results.set(doc.id, {
          id: doc.id,
          displayName: userData.displayName || userData.username || 'Anonymous',
          email: userData.email || 'No email',
          avatar: userData.avatar || require('../assets/images/boy1.png'),
          gamesPlayed: userData.gamesPlayed || 0,
          winRate: userData.winRate || 0
        });
      });

      // Process username results
      usernameSnapshot.forEach((doc) => {
        const userData = doc.data();
        results.set(doc.id, {
          id: doc.id,
          displayName: userData.displayName || userData.username || 'Anonymous',
          email: userData.email || 'No email',
          avatar: userData.avatar || require('../assets/images/boy1.png'),
          gamesPlayed: userData.gamesPlayed || 0,
          winRate: userData.winRate || 0
        });
      });

      setSearchResults(Array.from(results.values()));
    } catch (error) {
      console.error('Error searching players:', error);
      Alert.alert('Error', 'Failed to search players. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    // Debounce search to avoid too many queries
    const timeoutId = setTimeout(() => {
      searchPlayers(text);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Handle player selection
  const handlePlayerSelect = (player) => {
    Alert.alert(
      'Player Selected',
      `You selected ${player.displayName}. What would you like to do?`,
      [
        { text: 'View Profile', onPress: () => console.log('View profile:', player.id) },
        { text: 'Invite to Game', onPress: () => console.log('Invite to game:', player.id) },
        { text: 'Add Friend', onPress: () => console.log('Add friend:', player.id) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Render player item
  const renderPlayerItem = (player, showStats = false) => (
    <TouchableOpacity 
      key={player.id} 
      style={styles.playerItem} 
      onPress={() => handlePlayerSelect(player)}
    >
      <Image 
        source={typeof player.avatar === 'string' ? { uri: player.avatar } : player.avatar}
        style={styles.playerAvatar} 
      />
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{player.displayName}</Text>
        <Text style={styles.playerEmail}>{player.email}</Text>
        {showStats && (
          <Text style={styles.playerStats}>
            Games: {player.gamesPlayed} | Win Rate: {(player.winRate * 100).toFixed(1)}%
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => handlePlayerSelect(player)}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.appHeader}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Players</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => console.log('Filter pressed')}>
          <Text style={styles.headerIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username or name..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
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
      >
        {/* Search Results */}
        {searchQuery.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Search Results {isLoading && <ActivityIndicator size="small" color="#004d00" />}
            </Text>
            {searchResults.length > 0 ? (
              <View style={styles.card}>
                {searchResults.map(player => renderPlayerItem(player, true))}
              </View>
            ) : !isLoading && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No players found</Text>
                <Text style={styles.noResultsSubtext}>Try a different search term</Text>
              </View>
            )}
          </View>
        )}

        {/* Recent Players - Show only when not searching */}
        {searchQuery.length === 0 && recentPlayers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Players</Text>
            <View style={styles.card}>
              {recentPlayers.map(player => renderPlayerItem(player))}
            </View>
          </View>
        )}

        {/* Popular Players - Show only when not searching */}
        {searchQuery.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Players</Text>
            <View style={styles.card}>
              {popularPlayers.map(player => renderPlayerItem(player, true))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        {searchQuery.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity style={styles.quickActionButton}>
                <Text style={styles.quickActionIcon}>👥</Text>
                <Text style={styles.quickActionText}>Browse All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionButton}>
                <Text style={styles.quickActionIcon}>⭐</Text>
                <Text style={styles.quickActionText}>Favorites</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionButton}>
                <Text style={styles.quickActionIcon}>🎯</Text>
                <Text style={styles.quickActionText}>Random Match</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <View style={styles.navIconContainer}>
            <Text style={styles.navTextIcon}>🏠</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <View style={styles.navIconContainer}>
            <Text style={[styles.navTextIcon, styles.activeNavIcon]}>🔍</Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 10,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  clearButton: {
    padding: 5,
  },
  clearIcon: {
    fontSize: 20,
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  playerAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 15,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  playerEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  playerStats: {
    fontSize: 12,
    color: '#888',
  },
  addButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#004d00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
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
  activeNavItem: {
    backgroundColor: '#f0f9f0',
    borderRadius: 20,
    paddingHorizontal: 20,
  },
  navIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTextIcon: {
    fontSize: 24,
    color: '#666',
  },
  activeNavIcon: {
    color: '#004d00',
  },
});