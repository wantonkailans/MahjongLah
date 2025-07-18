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
  SafeAreaView,
  Modal
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
  addDoc,
  serverTimestamp,
  setDoc
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
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [activeRequestTab, setActiveRequestTab] = useState('received'); // 'received' or 'sent'
  const searchTimeout = useRef(null);

  // Load current user and their friends
  useEffect(() => {
    const loadCurrentUser = async () => {
      if (auth.currentUser) {
        setCurrentUser(auth.currentUser);
        await loadUserFriends();
        await loadFriendRequests();
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

  // Load friend requests
  const loadFriendRequests = async () => {
    try {
      if (!auth.currentUser) return;
      
      // Load sent requests
      const sentQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      const sentSnapshot = await getDocs(sentQuery);
      const sentRequestsData = sentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSentRequests(sentRequestsData);

      // Load received requests
      const receivedQuery = query(
        collection(db, 'friendRequests'),
        where('recipientId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      const receivedSnapshot = await getDocs(receivedQuery);
      const receivedRequestsData = [];
      
      for (const docSnap of receivedSnapshot.docs) {
        const requestData = docSnap.data();
        
        // Get sender information
        const senderDoc = await getDoc(doc(db, 'users', requestData.senderId));
        if (senderDoc.exists()) {
          const senderData = senderDoc.data();
          let profileImage = senderData.profileImage;
          
          if (profileImage && !profileImage.startsWith('data:')) {
            profileImage = `data:image/jpeg;base64,${profileImage}`;
          }
          
          receivedRequestsData.push({
            id: docSnap.id,
            ...requestData,
            senderInfo: {
              id: requestData.senderId,
              displayName: senderData.displayName || senderData.username || 'Anonymous',
              username: senderData.username || 'user',
              profileImage: profileImage,
              profileImageLoaded: true
            }
          });
        }
      }
      
      setReceivedRequests(receivedRequestsData);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  // Load initial data when component mounts
  useEffect(() => {
    loadPopularPlayers();
    loadRecentPlayers();
  }, []);

  // Avatar component following DiceRollGameScreen pattern
  const Avatar = ({ player, style }) => {
    // Handle undefined/null player
    if (!player) {
      return (
        <Image
          source={require('../assets/images/boy1.png')}
          style={style}
        />
      );
    }

    console.log(`🖼️ Avatar render for ${player.displayName || player.name || 'Unknown'}:`, {
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
            console.log(`✅ Avatar loaded successfully for ${player.displayName || player.name || 'Unknown'}`);
          }}
          onError={(error) => {
            console.error(`❌ Avatar load error for ${player.displayName || player.name || 'Unknown'}:`, error.nativeEvent);
          }}
        />
      );
    }

    console.log(`🔄 Using default avatar for ${player.displayName || player.name || 'Unknown'}`);
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

  // Send friend request
  const sendFriendRequest = async (recipientId, recipientName, recipientUsername) => {
    try {
      if (!auth.currentUser) {
        Alert.alert('Error', 'Please login to send friend requests');
        return;
      }

      if (userFriends.includes(recipientId)) {
        Alert.alert('Info', `You are already friends with ${recipientName || recipientUsername}`);
        return;
      }

      if (recipientId === auth.currentUser.uid) {
        Alert.alert('Error', 'You cannot send a friend request to yourself');
        return;
      }

      // Check if request already exists
      const existingRequestQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', auth.currentUser.uid),
        where('recipientId', '==', recipientId),
        where('status', '==', 'pending')
      );
      const existingSnapshot = await getDocs(existingRequestQuery);
      
      if (!existingSnapshot.empty) {
        Alert.alert('Info', 'Friend request already sent');
        return;
      }

      const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const currentUserData = currentUserDoc.data();

      // Create friend request document
      const friendRequestData = {
        senderId: auth.currentUser.uid,
        senderName: currentUserData.displayName || currentUserData.username || 'Anonymous',
        senderUsername: currentUserData.username || 'user',
        recipientId: recipientId,
        recipientName: recipientName || recipientUsername,
        recipientUsername: recipientUsername || 'user',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'friendRequests'), friendRequestData);

      // Update local state
      setSentRequests([...sentRequests, { ...friendRequestData, id: 'temp_' + Date.now() }]);

      Alert.alert('Success', `Friend request sent to ${recipientName || recipientUsername}!`);
      
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (requestId, senderId, senderName, senderUsername) => {
    try {
      if (!auth.currentUser) {
        Alert.alert('Error', 'Please login to accept friend requests');
        return;
      }

      const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const currentUserData = currentUserDoc.data();

      const senderDoc = await getDoc(doc(db, 'users', senderId));
      const senderData = senderDoc.data();

      if (!senderDoc.exists()) {
        Alert.alert('Error', 'User not found');
        return;
      }

      // Create friendship document
      const friendshipId = [auth.currentUser.uid, senderId].sort().join('_');
      const friendshipData = {
        users: [auth.currentUser.uid, senderId],
        user1: {
          id: auth.currentUser.uid,
          displayName: currentUserData.displayName || currentUserData.username || 'Anonymous',
          username: currentUserData.username || 'No username',
          avatar: currentUserData.avatar || null
        },
        user2: {
          id: senderId,
          displayName: senderData.displayName || senderData.username || 'Anonymous',
          username: senderData.username || 'No username',
          avatar: senderData.avatar || null
        },
        createdAt: serverTimestamp(),
        status: 'active'
      };

      const batch = writeBatch(db);
      
      // Add friendship document
      batch.set(doc(db, 'friendships', friendshipId), friendshipData);
      
      // Update both users' friends arrays
      batch.update(doc(db, 'users', auth.currentUser.uid), {
        friends: arrayUnion(senderId)
      });
      batch.update(doc(db, 'users', senderId), {
        friends: arrayUnion(auth.currentUser.uid)
      });

      // Update friend request status
      batch.update(doc(db, 'friendRequests', requestId), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });

      await batch.commit();

      // Update local state
      setUserFriends([...userFriends, senderId]);
      setReceivedRequests(receivedRequests.filter(req => req.id !== requestId));

      Alert.alert('Success', `You are now friends with ${senderName}!`);
      
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    }
  };

  // Decline friend request
  const declineFriendRequest = async (requestId, senderName) => {
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'declined',
        updatedAt: serverTimestamp()
      });

      // Update local state
      setReceivedRequests(receivedRequests.filter(req => req.id !== requestId));

      Alert.alert('Success', `Friend request from ${senderName} declined`);
      
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request. Please try again.');
    }
  };

  // Cancel sent friend request
  const cancelFriendRequest = async (requestId, recipientName) => {
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });

      // Update local state
      setSentRequests(sentRequests.filter(req => req.id !== requestId));

      Alert.alert('Success', `Friend request to ${recipientName} cancelled`);
      
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      Alert.alert('Error', 'Failed to cancel friend request. Please try again.');
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

  // Enhanced player selection with custom modal
  const handlePlayerSelect = (player) => {
    if (!player || !player.id) {
      console.error('Invalid player data:', player);
      return;
    }
    
    setSelectedPlayer(player);
    setShowPlayerModal(true);
  };

  // Handle send message (only for friends)
  const handleSendMessage = (player) => {
    if (!userFriends.includes(player.id)) {
      Alert.alert('Error', 'You can only send messages to friends');
      return;
    }
    
    navigation.navigate('Chat', {
      friendId: player.id,
      friendName: player.displayName,
      friendUsername: player.username
    });
  };

  // Handle add/remove friend button press
  const handleAddFriend = (player) => {
    const isFriend = userFriends.includes(player.id);
    const hasSentRequest = sentRequests.some(req => req.recipientId === player.id);
    
    if (isFriend) {
      removeFriend(player.id, player.displayName, player.username);
    } else if (hasSentRequest) {
      Alert.alert('Info', 'Friend request already sent');
    } else {
      sendFriendRequest(player.id, player.displayName, player.username);
    }
  };

  // Get button status for player
  const getButtonStatus = (player) => {
    if (userFriends.includes(player.id)) {
      return { text: '✓', color: '#28a745', type: 'friend' };
    } else if (sentRequests.some(req => req.recipientId === player.id)) {
      return { text: '⏳', color: '#ffc107', type: 'pending' };
    } else {
      return { text: '+', color: '#004d00', type: 'add' };
    }
  };

  // Render player item with enhanced UI and Avatar component
  const renderPlayerItem = (player, showStats = false) => {
    const buttonStatus = getButtonStatus(player);
    
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
        </View>
        
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: buttonStatus.color }]} 
          onPress={() => handleAddFriend(player)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>
            {buttonStatus.text}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Render friend requests modal
  const renderFriendRequestsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showRequestsModal}
      onRequestClose={() => setShowRequestsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.requestsModalContent}>
          <Text style={styles.modalTitle}>Friend Requests</Text>
          
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeRequestTab === 'received' && styles.activeTab]}
              onPress={() => setActiveRequestTab('received')}
            >
              <Text style={[styles.tabText, activeRequestTab === 'received' && styles.activeTabText]}>
                Received ({receivedRequests.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeRequestTab === 'sent' && styles.activeTab]}
              onPress={() => setActiveRequestTab('sent')}
            >
              <Text style={[styles.tabText, activeRequestTab === 'sent' && styles.activeTabText]}>
                Sent ({sentRequests.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.requestsList}>
            {activeRequestTab === 'received' ? (
              receivedRequests.length === 0 ? (
                <View style={styles.emptyRequestsContainer}>
                  <Text style={styles.emptyRequestsText}>No friend requests</Text>
                </View>
              ) : (
                receivedRequests.map(request => (
                  <View key={request.id} style={styles.requestItem}>
                    <Avatar player={request.senderInfo} style={styles.requestAvatar} />
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.senderInfo.displayName}</Text>
                      <Text style={styles.requestUsername}>@{request.senderInfo.username}</Text>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => acceptFriendRequest(request.id, request.senderId, request.senderInfo.displayName, request.senderInfo.username)}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineButton}
                        onPress={() => declineFriendRequest(request.id, request.senderInfo.displayName)}
                      >
                        <Text style={styles.declineButtonText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )
            ) : (
              sentRequests.length === 0 ? (
                <View style={styles.emptyRequestsContainer}>
                  <Text style={styles.emptyRequestsText}>No pending requests</Text>
                </View>
              ) : (
                sentRequests.map(request => (
                  <View key={request.id} style={styles.requestItem}>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.recipientName}</Text>
                      <Text style={styles.requestUsername}>@{request.recipientUsername}</Text>
                      <Text style={styles.requestStatus}>Pending...</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => cancelFriendRequest(request.id, request.recipientName)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )
            )}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowRequestsModal(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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

      {/* Custom Player Profile Modal */}
      {selectedPlayer && showPlayerModal && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showPlayerModal}
          onRequestClose={() => {
            setShowPlayerModal(false);
            setSelectedPlayer(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.playerModalContent}>
              <View style={styles.playerModalHeader}>
                <Avatar player={selectedPlayer} style={styles.modalPlayerAvatar} />
                <View style={styles.modalPlayerInfo}>
                  <Text style={styles.modalPlayerName}>
                    {selectedPlayer.displayName || selectedPlayer.name || 'Unknown User'}
                  </Text>
                  <Text style={styles.modalPlayerUsername}>
                    @{selectedPlayer.username || 'unknown'}
                  </Text>
                  <Text style={styles.modalPlayerPoints}>
                    {selectedPlayer.totalPoints || 0} points
                  </Text>
                </View>
              </View>
              
              <View style={styles.modalButtonContainer}>
                {userFriends.includes(selectedPlayer.id) && (
                  <TouchableOpacity
                    style={styles.modalSendMessageButton}
                    onPress={() => {
                      setShowPlayerModal(false);
                      setSelectedPlayer(null);
                      handleSendMessage(selectedPlayer);
                    }}
                  >
                    <Text style={styles.modalSendMessageButtonText}>Send Message</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[
                    styles.modalAddFriendButton,
                    userFriends.includes(selectedPlayer.id) && styles.modalRemoveFriendButton
                  ]}
                  onPress={() => {
                    setShowPlayerModal(false);
                    const playerToProcess = { ...selectedPlayer };
                    setSelectedPlayer(null);
                    handleAddFriend(playerToProcess);
                  }}
                >
                  <Text style={[
                    styles.modalAddFriendButtonText,
                    userFriends.includes(selectedPlayer.id) && styles.modalRemoveFriendButtonText
                  ]}>
                    {userFriends.includes(selectedPlayer.id) ? 'Remove Friend' : 
                     sentRequests.some(req => req.recipientId === selectedPlayer.id) ? 'Request Sent' : 'Send Friend Request'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowPlayerModal(false);
                  setSelectedPlayer(null);
                }}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Friend Requests Modal */}
      {renderFriendRequestsModal()}

      {/* Floating Requests Button */}
      {receivedRequests.length > 0 && (
        <TouchableOpacity
          style={styles.floatingRequestsButton}
          onPress={() => setShowRequestsModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.floatingRequestsIcon}>👥</Text>
          <View style={styles.requestsBadge}>
            <Text style={styles.requestsBadgeText}>{receivedRequests.length}</Text>
          </View>
        </TouchableOpacity>
      )}

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
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  requestsTextButton: {
    paddingHorizontal: 5,
    paddingVertical: 5,
    marginRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  // Floating Requests Button
  floatingRequestsButton: {
    position: 'absolute',
    bottom: 110, // Above the navigation bar
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8B100',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1000,
  },
  floatingRequestsIcon: {
    fontSize: 24,
    color: '#000',
  },
  requestsBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  requestsBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerLogo: {
    width: 100,
    height: 35,
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
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
  // Custom Player Profile Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  playerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  modalPlayerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 3,
    borderColor: '#004d00',
  },
  modalPlayerInfo: {
    flex: 1,
  },
  modalPlayerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#004d00',
    marginBottom: 4,
  },
  modalPlayerUsername: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  modalPlayerPoints: {
    fontSize: 16,
    color: '#F8B100',
    fontWeight: '600',
  },
  modalButtonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  modalSendMessageButton: {
    backgroundColor: '#004d00',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSendMessageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalAddFriendButton: {
    backgroundColor: '#F8B100',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalAddFriendButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalRemoveFriendButton: {
    backgroundColor: '#dc3545',
  },
  modalRemoveFriendButtonText: {
    color: '#fff',
  },
  modalCloseButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalCloseButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  // Friend Requests Modal Styles
  requestsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#004d00',
    marginBottom: 20,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#F8B100',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#004d00',
    fontWeight: '600',
  },
  requestsList: {
    maxHeight: 400,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requestAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#004d00',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  requestUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  requestStatus: {
    fontSize: 12,
    color: '#ffc107',
    marginTop: 2,
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  declineButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyRequestsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyRequestsText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
});