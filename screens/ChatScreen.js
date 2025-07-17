import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  KeyboardAvoidingView
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

export default function ChatScreen({ route }) {
  const navigation = useNavigation();
  const { friendId, friendName, friendUsername } = route.params;
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [friendInfo, setFriendInfo] = useState(null);
  const scrollViewRef = useRef(null);

  // Load friend info and chat messages
  useEffect(() => {
    loadFriendInfo();
    loadChatMessages();
  }, [friendId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Avatar component
  const Avatar = ({ user, style }) => {
    if (user?.profileImage) {
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

  // Load friend information
  const loadFriendInfo = async () => {
    try {
      const friendDoc = await getDoc(doc(db, 'users', friendId));
      if (friendDoc.exists()) {
        const friendData = friendDoc.data();
        let profileImage = friendData.profileImage;
        
        if (profileImage && !profileImage.startsWith('data:')) {
          profileImage = `data:image/jpeg;base64,${profileImage}`;
        }
        
        setFriendInfo({
          id: friendId,
          displayName: friendData.displayName || friendData.username || friendName,
          username: friendData.username || friendUsername,
          profileImage: profileImage,
          isOnline: friendData.isOnline || false
        });
      }
    } catch (error) {
      console.error('Error loading friend info:', error);
    }
  };

  // Load chat messages between current user and friend
  const loadChatMessages = async () => {
    try {
      if (!auth.currentUser) return;
      
      setIsLoading(true);
      
      // Query messages where current user is recipient (same as MessagingScreen)
      const receivedMessagesQuery = query(
        collection(db, 'messages'),
        where('recipientId', '==', auth.currentUser.uid)
      );
      
      // Query messages where current user is sender
      const sentMessagesQuery = query(
        collection(db, 'messages'),
        where('senderId', '==', auth.currentUser.uid)
      );
      
      const unsubscribe1 = onSnapshot(receivedMessagesQuery, 
        (snapshot) => {
          updateMessages(snapshot, 'received');
        },
        (error) => {
          console.error('Error loading received messages:', error);
          setIsLoading(false);
        }
      );
      
      const unsubscribe2 = onSnapshot(sentMessagesQuery, 
        (snapshot) => {
          updateMessages(snapshot, 'sent');
        },
        (error) => {
          console.error('Error loading sent messages:', error);
          setIsLoading(false);
        }
      );
      
      return () => {
        unsubscribe1();
        unsubscribe2();
      };
    } catch (error) {
      console.error('Error setting up chat listener:', error);
      setIsLoading(false);
    }
  };
  
  // Helper function to update messages from both queries
  const updateMessages = (snapshot, type) => {
    try {
      const newMessages = [];
      
      snapshot.docs.forEach((doc) => {
        const messageData = doc.data();
        
        // Only include messages between current user and the specific friend
        if (
          (messageData.senderId === auth.currentUser.uid && messageData.recipientId === friendId) ||
          (messageData.senderId === friendId && messageData.recipientId === auth.currentUser.uid)
        ) {
          newMessages.push({
            id: doc.id,
            ...messageData,
            timestamp: messageData.timestamp?.toDate() || new Date(),
            queryType: type
          });
        }
      });
      
      setMessages(prevMessages => {
        // Remove old messages of this type and add new ones
        const filteredMessages = prevMessages.filter(msg => msg.queryType !== type);
        const combinedMessages = [...filteredMessages, ...newMessages];
        
        // Sort by timestamp (oldest first for chat)
        return combinedMessages.sort((a, b) => a.timestamp - b.timestamp);
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error updating messages:', error);
      setIsLoading(false);
    }
  };

  // Send a new message
  const sendMessage = async () => {
    if (!messageText.trim()) return;
    
    try {
      setIsSending(true);
      
      const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const currentUserData = currentUserDoc.data();
      
      const messageData = {
        senderId: auth.currentUser.uid,
        senderName: currentUserData.displayName || currentUserData.username || 'Anonymous',
        senderUsername: currentUserData.username || 'user',
        recipientId: friendId,
        recipientName: friendInfo?.displayName || friendName,
        recipientUsername: friendInfo?.username || friendUsername,
        message: messageText.trim(),
        timestamp: serverTimestamp(),
        read: false,
        type: 'friend_message'
      };
      
      // Only add to messages collection
      await addDoc(collection(db, 'messages'), messageData);
      
      setMessageText('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      const unreadMessages = messages.filter(msg => 
        msg.recipientId === auth.currentUser.uid && !msg.read
      );
      
      for (const message of unreadMessages) {
        try {
          await updateDoc(doc(db, 'messages', message.id), {
            read: true
          });
        } catch (error) {
          console.log('Could not mark message as read:', error);
          // Continue with other messages even if one fails
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Mark messages as read when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      markMessagesAsRead();
    });
    
    return unsubscribe;
  }, [navigation, messages]);

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInHours = (now - messageTime) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return messageTime.toLocaleDateString();
    }
  };

  // Render individual message
  const renderMessage = (message) => {
    const isMyMessage = message.senderId === auth.currentUser.uid;
    
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer
        ]}
      >
        {!isMyMessage && (
          <Avatar user={friendInfo} style={styles.messageAvatar} />
        )}
        
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.theirMessageText
            ]}
          >
            {message.message}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.theirMessageTime
            ]}
          >
            {formatTimestamp(message.timestamp)}
          </Text>
        </View>
        
        {isMyMessage && (
          <Avatar user={{ profileImage: null }} style={styles.messageAvatar} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Avatar user={friendInfo} style={styles.headerAvatar} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>
              {friendInfo?.displayName || friendName}
            </Text>
            <Text style={styles.headerUsername}>
              @{friendInfo?.username || friendUsername}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerButton} />
      </View>

      {/* Messages Area */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F8B100" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>
                  Start the conversation with {friendInfo?.displayName || friendName}!
                </Text>
              </View>
            ) : (
              messages.map(renderMessage)
            )}
          </ScrollView>
        )}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxHeight={100}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, (!messageText.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!messageText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 10,
    backgroundColor: '#004d00',
    borderBottomWidth: 1,
    borderBottomColor: '#006600',
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
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerUsername: {
    fontSize: 14,
    color: '#ccc',
  },
  chatContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    marginTop: 10,
    fontSize: 16,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
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
    color: '#666',
    marginBottom: 5,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 5,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 18,
    marginHorizontal: 5,
  },
  myMessageBubble: {
    backgroundColor: '#F8B100',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  myMessageText: {
    color: '#000',
  },
  theirMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  myMessageTime: {
    color: '#000',
    textAlign: 'right',
  },
  theirMessageTime: {
    color: '#666',
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#F8B100',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  sendButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});