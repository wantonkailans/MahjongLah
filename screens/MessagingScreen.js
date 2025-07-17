import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  serverTimestamp,
  onSnapshot,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';

export default function MessagingScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' or 'compose'
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);

  // Load friends list
  useEffect(() => {
    loadFriends();
  }, []);

  // Load messages when component mounts
  useEffect(() => {
    if (activeTab === 'inbox') {
      loadMessages();
    }
  }, [activeTab]);

  // Avatar component
  const Avatar = ({ user, style }) => {
    if (user.profileImage) {
      return (
        <Image
          source={{ uri: user.profileImage }}
          style={style}
          onError={() => console.log('Avatar load error')}
        />
      );
    }
    return (
      <Image
        source={require('../assets/images/boy1.png')}
        style={style}
      />
    );
  };

  // Load user's friends
  const loadFriends = async () => {
    try {
      if (!auth.currentUser) return;
      
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const friendIds = userData.friends || [];
        
        if (friendIds.length > 0) {
          const friendsData = [];
          for (const friendId of friendIds) {
            const friendDoc = await getDoc(doc(db, 'users', friendId));
            if (friendDoc.exists()) {
              const friendData = friendDoc.data();
              let profileImage = friendData.profileImage;
              
              if (profileImage && !profileImage.startsWith('data:')) {
                profileImage = `data:image/jpeg;base64,${profileImage}`;
              }
              
              friendsData.push({
                id: friendId,
                displayName: friendData.displayName || friendData.username || 'Anonymous',
                username: friendData.username || 'user',
                profileImage: profileImage,
                isOnline: friendData.isOnline || false
              });
            }
          }
          setFriends(friendsData);
        }
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  // Load messages from inbox
  const loadMessages = async () => {
    try {
      if (!auth.currentUser) return;
      
      setIsLoading(true);
      
      // Query messages where current user is recipient
      const messagesQuery = query(
        collection(db, 'messages'),
        where('recipientId', '==', auth.currentUser.uid),
        orderBy('timestamp', 'desc')
      );
      
      const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
        const messagesData = [];
        
        for (const docSnapshot of snapshot.docs) {
          const messageData = docSnapshot.data();
          
          // Get sender information
          const senderDoc = await getDoc(doc(db, 'users', messageData.senderId));
          let senderInfo = {
            displayName: 'Unknown User',
            username: 'unknown',
            profileImage: null
          };
          
          if (senderDoc.exists()) {
            const senderData = senderDoc.data();
            let profileImage = senderData.profileImage;
            
            if (profileImage && !profileImage.startsWith('data:')) {
              profileImage = `data:image/jpeg;base64,${profileImage}`;
            }
            
            senderInfo = {
              displayName: senderData.displayName || senderData.username || 'Anonymous',
              username: senderData.username || 'user',
              profileImage: profileImage
            };
          }
          
          messagesData.push({
            id: docSnapshot.id,
            ...messageData,
            senderInfo: senderInfo,
            timestamp: messageData.timestamp?.toDate() || new Date()
          });
        }
        
        setMessages(messagesData);
        setIsLoading(false);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error loading messages:', error);
      setIsLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!messageText.trim() || !selectedFriend) {
      Alert.alert('Error', 'Please select a friend and enter a message');
      return;
    }
    
    try {
      setIsSending(true);
      
      const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const currentUserData = currentUserDoc.data();
      
      const messageData = {
        senderId: auth.currentUser.uid,
        senderName: currentUserData.displayName || currentUserData.username || 'Anonymous',
        senderUsername: currentUserData.username || 'user',
        recipientId: selectedFriend.id,
        recipientName: selectedFriend.displayName,
        message: messageText.trim(),
        timestamp: serverTimestamp(),
        read: false,
        type: 'friend_message'
      };
      
      await addDoc(collection(db, 'messages'), messageData);
      
      setMessageText('');
      setSelectedFriend(null);
      setShowFriendModal(false);
      
      Alert.alert('Success', `Message sent to ${selectedFriend.displayName}!`);
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Mark message as read
  const markAsRead = async (messageId) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInHours = (now - messageTime) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return messageTime.toLocaleDateString();
    }
  };

  // Render friend selection modal
  const renderFriendModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showFriendModal}
      onRequestClose={() => setShowFriendModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Friend</Text>
          
          <ScrollView style={styles.friendsList}>
            {friends.map(friend => (
              <TouchableOpacity
                key={friend.id}
                style={styles.friendItem}
                onPress={() => {
                  setSelectedFriend(friend);
                  setShowFriendModal(false);
                }}
              >
                <Avatar user={friend} style={styles.friendAvatar} />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friend.displayName}</Text>
                  <Text style={styles.friendUsername}>@{friend.username}</Text>
                </View>
                {friend.isOnline && <View style={styles.onlineIndicator} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFriendModal(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Render inbox tab
  const renderInbox = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Your Messages</Text>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F8B100" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📬</Text>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>Messages from friends will appear here</Text>
        </View>
      ) : (
        <ScrollView style={styles.messagesList}>
          {messages.map(message => (
            <TouchableOpacity
              key={message.id}
              style={[styles.messageItem, !message.read && styles.unreadMessage]}
              onPress={() => markAsRead(message.id)}
            >
              <Avatar user={message.senderInfo} style={styles.messageAvatar} />
              <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageSender}>{message.senderInfo.displayName}</Text>
                  <Text style={styles.messageTime}>{formatTimestamp(message.timestamp)}</Text>
                </View>
                <Text style={styles.messageText}>{message.message}</Text>
                {!message.read && <View style={styles.unreadDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  // Render compose tab
  const renderCompose = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Send Message</Text>
      
      {friends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>No friends yet</Text>
          <Text style={styles.emptySubtext}>Add friends to send messages</Text>
          <TouchableOpacity
            style={styles.addFriendsButton}
            onPress={() => navigation.navigate('SearchScreen')}
          >
            <Text style={styles.addFriendsButtonText}>Find Friends</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.composeContainer}>
          <TouchableOpacity
            style={styles.selectFriendButton}
            onPress={() => setShowFriendModal(true)}
          >
            <Text style={styles.selectFriendButtonText}>
              {selectedFriend ? `To: ${selectedFriend.displayName}` : 'Select Friend'}
            </Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.messageInput}
            placeholder="Type your message here..."
            placeholderTextColor="#999"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          
          <TouchableOpacity
            style={[styles.sendButton, (!selectedFriend || !messageText.trim()) && styles.disabledButton]}
            onPress={sendMessage}
            disabled={!selectedFriend || !messageText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send Message</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <Image
          source={require('../assets/images/mahjonglah!.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inbox' && styles.activeTab]}
          onPress={() => setActiveTab('inbox')}
        >
          <Text style={[styles.tabText, activeTab === 'inbox' && styles.activeTabText]}>
            Inbox
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'compose' && styles.activeTab]}
          onPress={() => setActiveTab('compose')}
        >
          <Text style={[styles.tabText, activeTab === 'compose' && styles.activeTabText]}>
            Compose
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'inbox' ? renderInbox() : renderCompose()}

      {/* Friend Selection Modal */}
      {renderFriendModal()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <View style={styles.navIconContainer}>
            <Text style={styles.navTextIcon}>🏠</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('SearchScreen')}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 10,
    backgroundColor: '#004d00',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerLogo: {
    width: 80,
    height: 30,
    resizeMode: 'contain',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#006600',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#F8B100',
  },
  tabText: {
    fontSize: 16,
    color: '#ccc',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
    marginBottom: 20,
  },
  addFriendsButton: {
    backgroundColor: '#F8B100',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  addFriendsButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messagesList: {
    flex: 1,
  },
  messageItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadMessage: {
    borderLeftWidth: 4,
    borderLeftColor: '#F8B100',
  },
  messageAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#004d00',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  messageSender: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
  },
  messageText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F8B100',
  },
  composeContainer: {
    flex: 1,
  },
  selectFriendButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectFriendButtonText: {
    fontSize: 16,
    color: '#333',
  },
  messageInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
    height: 120,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sendButton: {
    backgroundColor: '#F8B100',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  sendButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  friendsList: {
    maxHeight: 400,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#004d00',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#28a745',
  },
  closeButton: {
    backgroundColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
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