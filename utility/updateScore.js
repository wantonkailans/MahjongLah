import { 
  getFirestore, 
  doc, 
  updateDoc, 
  setDoc, 
  getDoc, 
  increment,
  addDoc,
  collection,
  serverTimestamp 
} from 'firebase/firestore';

const db = getFirestore();

/**
 * Records a game result and updates player scores
 * @param {string} userId - The user's ID
 * @param {string} gameType - The type of game (e.g., 'standard', 'tournament', etc.)
 * @param {number} finalChips - Final chips earned in the game
 * @param {number} finalPosition - Player's final position in the game
 * @param {number} pointsEarned - Points earned from this game
 * @param {string} displayName - Player's display name
 * @param {string} finalWind - Final wind direction (if applicable)
 * @param {Array} allPlayers - Array of all players in the game (optional)
 */
export const recordGameResult = async (
  userId, 
  gameType, 
  finalChips, 
  finalPosition, 
  pointsEarned, 
  displayName,
  finalWind = null,
  allPlayers = []
) => {
  try {
    // 1. Create game record in games collection
    const gameData = {
      uid: userId,
      gameType: gameType,
      finalChips: finalChips,
      finalPosition: finalPosition,
      pointsEarned: pointsEarned,
      timestamp: serverTimestamp(),
      players: allPlayers.length > 0 ? allPlayers : [
        {
          displayName: displayName,
          finalChips: finalChips,
          finalPosition: finalPosition,
          pointsEarned: pointsEarned,
          uid: userId
        }
      ]
    };

    // Add finalWind if provided
    if (finalWind) {
      gameData.finalWind = finalWind;
    }

    const gameRef = await addDoc(collection(db, 'games'), gameData);
    console.log('Game record created with ID:', gameRef.id);

    // 2. Update users collection with game statistics
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Update game-specific stats
      const gameStats = userData[gameType] || { wins: 0, losses: 0, gamesPlayed: 0 };
      const won = finalPosition === 1; // Assuming position 1 is winning
      
      await updateDoc(userRef, {
        [`${gameType}.wins`]: won ? gameStats.wins + 1 : gameStats.wins,
        [`${gameType}.losses`]: won ? gameStats.losses : gameStats.losses + 1,
        [`${gameType}.gamesPlayed`]: gameStats.gamesPlayed + 1,
        totalScore: increment(pointsEarned),
        lastPlayed: serverTimestamp(),
      });
    }

    // 3. Update leaderboard collection
    const leaderboardRef = doc(db, 'leaderboard', userId);

    await setDoc(leaderboardRef, {
      displayName,
      totalScore: increment(pointsEarned),
      lastPlayed: serverTimestamp()
    }, { merge: true });


    console.log('Game result recorded successfully');
    return { success: true, gameId: gameRef.id };
    
  } catch (error) {
    console.error('Error recording game result:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get player's game history from games collection
 * @param {string} userId - The user's ID
 * @param {number} limit - Number of recent games to fetch
 */
export const getPlayerGameHistory = async (userId, limit = 10) => {
  try {
    const { query, collection, where, orderBy, getDocs, limit: firestoreLimit } = await import('firebase/firestore');
    
    const gamesQuery = query(
      collection(db, 'games'),
      where('uid', '==', userId),
      orderBy('timestamp', 'desc'),
      firestoreLimit(limit)
    );
    
    const querySnapshot = await getDocs(gamesQuery);
    const games = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, games };
  } catch (error) {
    console.error('Error fetching game history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Calculate player statistics from games collection
 * @param {string} userId - The user's ID
 */
export const calculatePlayerStats = async (userId) => {
  try {
    const { query, collection, where, getDocs } = await import('firebase/firestore');
    
    const gamesQuery = query(
      collection(db, 'games'),
      where('uid', '==', userId)
    );
    
    const querySnapshot = await getDocs(gamesQuery);
    const games = querySnapshot.docs.map(doc => doc.data());
    
    const stats = {
      totalGames: games.length,
      totalWins: games.filter(game => game.finalPosition === 1).length,
      totalPoints: games.reduce((sum, game) => sum + (game.pointsEarned || 0), 0),
      totalChips: games.reduce((sum, game) => sum + (game.finalChips || 0), 0),
      averagePosition: games.length > 0 ? games.reduce((sum, game) => sum + game.finalPosition, 0) / games.length : 0,
      gameTypes: {}
    };
    
    // Calculate stats by game type
    games.forEach(game => {
      const gameType = game.gameType || 'standard';
      if (!stats.gameTypes[gameType]) {
        stats.gameTypes[gameType] = {
          games: 0,
          wins: 0,
          totalPoints: 0,
          averagePosition: 0
        };
      }
      
      stats.gameTypes[gameType].games++;
      if (game.finalPosition === 1) stats.gameTypes[gameType].wins++;
      stats.gameTypes[gameType].totalPoints += game.pointsEarned || 0;
    });
    
    // Calculate average positions for each game type
    Object.keys(stats.gameTypes).forEach(gameType => {
      const typeGames = games.filter(game => game.gameType === gameType);
      stats.gameTypes[gameType].averagePosition = typeGames.length > 0 
        ? typeGames.reduce((sum, game) => sum + game.finalPosition, 0) / typeGames.length 
        : 0;
    });
    
    return { success: true, stats };
  } catch (error) {
    console.error('Error calculating player stats:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sync user data from users collection to leaderboard collection
 * Call this when user updates their profile
 */
export const syncUserToLeaderboard = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const leaderboardRef = doc(db, 'leaderboard', userId);
      
      await setDoc(leaderboardRef, {
        displayName: userData.displayName || 'Anonymous',
        email: userData.email || '',
        avatar: userData.avatar || '',
        totalScore: userData.totalScore || 0,
        lastPlayed: userData.lastPlayed || serverTimestamp(),
      }, { merge: true });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error syncing user to leaderboard:', error);
    return { success: false, error: error.message };
  }
};