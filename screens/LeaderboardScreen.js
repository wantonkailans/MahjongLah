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
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';

export default function LeaderboardScreen() {
  const navigation = useNavigation();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('winRate'); // 'winRate', 'gamesPlayed', 'totalWins'

  useEffect(() => {
    loadLeaderboard();
  }, [selectedTab]);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      let orderField = 'winRate';
      
      switch (selectedTab) {
        case 'gamesPlayed':
          orderField = 'gamesPlayed';
          break;
        case 'totalWins':
          orderField = 'totalWins';
          break;
        default:
          orderField = 'winRate';
      }

      const leaderboardQuery = query(
        collection(db, 'users'),
        orderBy(orderField, 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(leaderboardQuery);
      const players = [];
      
      querySnapshot.forEach((doc, index) => {
        const userData = doc.data();
        players.push({
          id: doc.id,
          rank: index + 1,
          displayName: userData.displayName || userData.username || 'Anonymous',
          email: userData.email || 'No email',
          avatar: userData.avatar || require('../assets/images/boy1.png'),
          gamesPlayed: userData.gamesPlayed || 0,
          winRate: userData.winRate || 0,
          totalWins: userData.totalWins || 0,
          totalPoints: userData.totalPoints || 0,
          lastActive: userData.lastActive || null
        });
      });

      setLeaderboardData(players);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getRankStyle = (rank) => {
    if (rank <= 3) {
      return [styles.rankNumber, styles.topThreeRank];
    }
    return styles.rankNumber;
  };

  const getStatValue = (player) => {
    switch (selectedTab) {
      case 'gamesPlayed':
        return `${player.gamesPlayed} games`;
      case 'totalWins':
        return `${player.totalWins} wins`;
      default:
        return `${(player.winRate * 100).toFixed(1)}%`;
    }
  };

  const renderPlayerRow = (player) => (
    <TouchableOpacity key={player.id} style={styles.playerRow}>
      <View style={styles.rankContainer}>
        <Text style={getRankStyle(player.rank)}>
          {getRankIcon(player.rank)}
        </Text>
      </View>
      
      <Image 
        source={typeof player.avatar === 'string' ? { uri: player.avatar } : player.avatar}
        style={styles.playerAvatar} 
      />
      
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{player.displayName}</Text>
        <Text style={styles.playerEmail}>{player.email}</Text>
        <Text style={styles.playerStats}>
          Games: {player.gamesPlayed} | Wins: {player.totalWins}
        </Text>
      </View>
      
      <View style={styles.statContainer}>
        <Text style={styles.statValue}>{getStatValue(player)}</Text>
        <Text style={styles.statLabel}>
          {selectedTab === 'winRate' ? 'Win Rate' : 
           selectedTab === 'gamesPlayed' ? 'Games' : 'Total Wins'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.appHeader}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => console.log('Share leaderboard')}>
          <Text style={styles.headerIcon}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* NUS Community Header */}
      <View style={styles.communityHeader}>
        <View style={styles.communityTitleContainer}>
          <Text style={styles.communityTitle}>NUS Community Rankings</Text>
          <Image 
            source={require('../assets/images/nus.png')} 
            style={styles.nusLogo} 
          />
        </View>
        <Text style={styles.communitySubtitle}>
          {leaderboardData.length} active players
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'winRate' && styles.activeTab]}
          onPress={() => setSelectedTab('winRate')}
        >
          <Text style={[styles.tabText, selectedTab === 'winRate' && styles.activeTabText]}>
            Win Rate
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'gamesPlayed' && styles.activeTab]}
          onPress={() => setSelectedTab('gamesPlayed')}
        >
          <Text style={[styles.tabText, selectedTab === 'gamesPlayed' && styles.activeTabText]}>
            Games Played
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'totalWins' && styles.activeTab]}
          onPress={() => setSelectedTab('totalWins')}
        >
          <Text style={[styles.tabText, selectedTab === 'totalWins' && styles.activeTabText]}>
            Total Wins
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leaderboard List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004d00" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#004d00']}
              tintColor="#004d00"
            />
          }
        >
          <View style={styles.leaderboardCard}>
            {leaderboardData.map(player => renderPlayerRow(player))}
          </View>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <View style={styles.navIconContainer}>
            <Text style={styles.navTextIcon}>🏠</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Search')}>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  communityHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  communityTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  communityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  nusLogo: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  communitySubtitle: {
    fontSize: 14,
    color: '#cccccc',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 5,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#004d00',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
  },
  leaderboardCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 15,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  topThreeRank: {
    fontSize: 20,
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
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  playerStats: {
    fontSize: 11,
    color: '#888',
  },
  statContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004d00',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 20,
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