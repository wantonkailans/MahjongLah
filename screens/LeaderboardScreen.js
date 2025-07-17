import React, { useEffect, useState } from 'react';
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
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  limit,
} from 'firebase/firestore';

const db = getFirestore();

export default function LeaderboardScreen() {
  const navigation = useNavigation();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      // Changed from 'users' to 'leaderboard' to match your utility function
      const leaderboardQuery = query(
        collection(db, 'leaderboard'),
        orderBy('totalScore', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(leaderboardQuery);
      const players = querySnapshot.docs.map((doc, index) => {
        const userData = doc.data();
        return {
          id: doc.id,
          rank: index + 1,
          displayName: userData.displayName || 'Anonymous',
          email: userData.email || 'No email',
          avatar: userData.avatar || require('../assets/images/boy1.png'),
          totalScore: userData.totalScore || 0,
        };
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
    if (rank <= 3) return [styles.rankNumber, styles.topThreeRank];
    return styles.rankNumber;
  };

  const renderPlayerRow = (player) => (
    <TouchableOpacity key={player.id} style={styles.playerRow}>
      <View style={styles.rankContainer}>
        <Text style={getRankStyle(player.rank)}>{getRankIcon(player.rank)}</Text>
      </View>

      <Image
        source={
          typeof player.avatar === 'string'
            ? { uri: player.avatar }
            : player.avatar
        }
        style={styles.playerAvatar}
      />

      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{player.displayName}</Text>
        <Text style={styles.playerEmail}>{player.email}</Text>
      </View>

      <View style={styles.statContainer}>
        <Text style={styles.statValue}>{player.totalScore} pts</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.appHeader}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Leaderboard Info */}
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
            {leaderboardData.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No players yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Be the first to play and appear on the leaderboard!
                </Text>
              </View>
            ) : (
              leaderboardData.map(renderPlayerRow)
            )}
          </View>
          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
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
  },
  statContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004d00',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 20,
  },
});