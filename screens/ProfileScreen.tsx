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
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { uploadBytes, ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email);
        
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(userData.displayName || userData.username || 'User');
            setTempUsername(userData.displayName || userData.username || 'User');
            setProfileImage(userData.profileImage || null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        navigation.navigate('Login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigation]);

  const handleImagePicker = async (option) => {
    setImagePickerVisible(false);
    
    let result;
    if (option === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media library permission is required to select photos.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri) => {
    if (!user) return;

    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const imageRef = ref(storage, `profile_images/${user.uid}`);
      await uploadBytes(imageRef, blob);
      
      const downloadURL = await getDownloadURL(imageRef);
      
      // Update Firestore with new profile image URL
      await updateDoc(doc(db, 'users', user.uid), {
        profileImage: downloadURL,
      });
      
      setProfileImage(downloadURL);
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: tempUsername,
        username: tempUsername,
      });
      
      setUsername(tempUsername);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              navigation.navigate('Login');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => {
            if (isEditing) {
              handleSaveProfile();
            } else {
              setIsEditing(true);
            }
          }}
        >
          <Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Picture Section */}
        <View style={styles.profilePictureContainer}>
          <TouchableOpacity 
            style={styles.profilePictureWrapper}
            onPress={() => setImagePickerVisible(true)}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePicture} />
            ) : (
              <View style={styles.defaultProfilePicture}>
                <Text style={styles.defaultProfileText}>📷</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Text style={styles.cameraIconText}>📸</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.profilePictureHint}>Tap to change profile picture</Text>
        </View>

        {/* User Information */}
        <View style={styles.infoContainer}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Username</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={tempUsername}
                onChangeText={setTempUsername}
                placeholder="Enter username"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.infoValue}>{username}</Text>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{email}</Text>
            <Text style={styles.infoNote}>Email cannot be changed</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {user?.metadata?.creationTime ? 
                new Date(user.metadata.creationTime).toLocaleDateString() : 
                'N/A'
              }
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        visible={imagePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setImagePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Profile Picture</Text>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => handleImagePicker('camera')}
            >
              <Text style={styles.modalButtonText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => handleImagePicker('gallery')}
            >
              <Text style={styles.modalButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setImagePickerVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#004d00',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#004d00',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  editButton: {
    backgroundColor: '#F8B100',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePictureWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  defaultProfilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  defaultProfileText: {
    fontSize: 40,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#F8B100',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraIconText: {
    fontSize: 16,
  },
  profilePictureHint: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  infoContainer: {
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 18,
    color: '#000',
    fontWeight: 'bold',
  },
  infoNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  textInput: {
    fontSize: 18,
    color: '#000',
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#004d00',
    paddingBottom: 5,
  },
  actionButtons: {
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
  },
  modalButton: {
    backgroundColor: '#004d00',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
  },
});