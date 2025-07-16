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
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Removed useFocusEffect
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email);
        
        try {
          console.log('Fetching user data for UID:', currentUser.uid);
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User data from Firestore:', userData);
            
            // Use the username field from your Firestore structure
            const displayName = userData.username || userData.displayName || 'User';
            setUsername(displayName);
            setTempUsername(displayName);
            setProfileImage(userData.profileImage || null);
            
            console.log('Profile image loaded:', userData.profileImage ? 'Yes' : 'No');
          } else {
            console.log('No user document found in Firestore');
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

  // Removed useFocusEffect as we are no longer getting data back from a custom CropScreen

  const handleImagePicker = async (option) => {
    console.log('=== IMAGE PICKER START ===');
    console.log('Option selected:', option);
    
    setImagePickerVisible(false); // Close the modal
    
    try {
      let result;
      
      if (option === 'camera') {
        console.log('Requesting camera permissions...');
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        console.log('Camera permission status:', status);
        
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
        
        console.log('Launching camera...');
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true, // <--- REVERTED TO TRUE: Expo's built-in editor
          aspect: [1, 1], // Square aspect ratio for profile pictures
          quality: 0.5, // Reduce quality for smaller file size
          base64: false,
        });
        
      } else {
        console.log('Requesting media library permissions...');
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('Media library permission status:', status);
        
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Media library permission is required to select photos.');
          return;
        }
        
        console.log('Launching image library...');
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true, // <--- REVERTED TO TRUE: Expo's built-in editor
          aspect: [1, 1], // Square aspect ratio for profile pictures
          quality: 0.5, // Reduce quality for smaller file size
          base64: false,
        });
      }
      
      console.log('Image picker result:', result);
      console.log('Result canceled:', result.canceled);
      console.log('Result assets:', result.assets);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        console.log('Image selected successfully:', selectedImage.uri);
        console.log('Image width:', selectedImage.width);
        console.log('Image height:', selectedImage.height);
        
        // Start upload immediately after selection (Expo's cropping is done internally here)
        await uploadImage(selectedImage.uri); // <--- Pass URI directly for upload
      } else {
        console.log('Image selection canceled or failed');
        if (result.canceled) {
          console.log('User canceled the image selection');
        }
      }
      
    } catch (error) {
      console.error('Error in handleImagePicker:', error);
      Alert.alert('Error', 'Failed to open image picker: ' + error.message);
    }
  };

  // Modified uploadImage to handle URI from ImagePicker (converts to base64 here)
  const uploadImage = async (imageUri) => { // Expects a URI
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setUploadingImage(true);
    
    try {
      console.log('=== BASE64 IMAGE UPLOAD START ===');
      console.log('User ID:', user.uid);
      console.log('Image URI:', imageUri);
      
      // Step 1: Fetch the image as a blob
      console.log('Step 1: Fetching image blob...');
      const response = await fetch(imageUri);
      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'bytes');
      console.log('Blob type:', blob.type);
      
      // Step 2: Check file size (Firestore has 1MB document limit)
      const maxSize = 500000; // 500KB limit for safety
      if (blob.size > maxSize) {
        Alert.alert(
          'Image Too Large', 
          `Image size is ${Math.round(blob.size / 1000)}KB. Please choose an image smaller than ${Math.round(maxSize / 1000)}KB or reduce the quality.`
        );
        return;
      }
      
      // Step 3: Convert blob to base64
      console.log('Step 2: Converting to base64...');
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64String = await base64Promise;
      
      console.log('Base64 conversion complete');
      console.log('Base64 length:', base64String.length);
      
      // Step 4: Save base64 to Firestore
      console.log('Step 3: Saving to Firestore...');
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        profileImage: base64String,
        lastLogin: new Date().toISOString(),
      });
      
      console.log('Step 4: Firestore update successful!');
      console.log('Profile image saved as base64 string');
      
      // Step 5: Update local state
      setProfileImage(base64String);
      
      // Step 6: Show success confirmation
      setShowUploadSuccess(true);
      setTimeout(() => {
        setShowUploadSuccess(false);
      }, 3000);
      
      console.log('=== BASE64 IMAGE UPLOAD COMPLETE ===');
      
      // Show success message
      Alert.alert(
        'Success!', 
        'Profile picture updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('User acknowledged upload success');
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('=== BASE64 IMAGE UPLOAD ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to upload image';
      if (error.message.includes('Maximum document size')) {
        errorMessage = 'Image is too large. Please choose a smaller image.';
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = `Upload failed: ${error.message}`;
      }
      
      Alert.alert('Upload Error', errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      console.log('Updating profile for user:', user.uid);
      console.log('New username:', tempUsername);
      
      // Update both username and displayName to match your Firestore structure
      await updateDoc(doc(db, 'users', user.uid), {
        username: tempUsername,
        displayName: tempUsername,
        lastLogin: new Date().toISOString(), // Update last login timestamp
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
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Image
          source={require('../assets/images/mahjonglah!.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
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
        style={styles.scrollView}
      >
        {/* Profile Picture Section */}
        <View style={styles.profilePictureContainer}>
          <Text style={styles.profileSectionTitle}>Profile Picture</Text>
          <TouchableOpacity 
            style={styles.profilePictureWrapper}
            onPress={() => !uploadingImage && setImagePickerVisible(true)}
            disabled={uploadingImage}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePicture} />
            ) : (
              <View style={styles.defaultProfilePicture}>
                <Text style={styles.defaultProfileText}>📷</Text>
              </View>
            )}
            
            {/* Loading overlay */}
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
            
            {/* Camera icon */}
            {!uploadingImage && (
              <View style={styles.cameraIcon}>
                <Text style={styles.cameraIconText}>📸</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <Text style={styles.profilePictureHint}>
            {uploadingImage ? 'Uploading...' : 'Tap to change profile picture'}
          </Text>
        </View>

        {/* Success Message */}
        {showUploadSuccess && (
          <View style={styles.successMessage}>
            <Text style={styles.successText}>✅ Profile picture updated successfully!</Text>
          </View>
        )}

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

      {/* Bottom Navigation Bar */}
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
            <Text style={styles.modalSubtitle}>Choose a square image for best results</Text>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => handleImagePicker('camera')}
            >
              <Text style={styles.modalButtonText}>📷 Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => handleImagePicker('gallery')}
            >
              <Text style={styles.modalButtonText}>🖼️ Choose from Gallery</Text>
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
    </SafeAreaView>
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
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 10,
    backgroundColor: '#004d00',
  },
  backButton: {
    padding: 5,
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerLogo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 0,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  profileSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#004d00',
    marginBottom: 15,
    textAlign: 'center',
  },
  profilePictureWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#004d00',
  },
  defaultProfilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#004d00',
  },
  defaultProfileText: {
    fontSize: 40,
    color: '#666',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
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
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 15,
  },
  successMessage: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  successText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    marginBottom: 5,
    color: '#000',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
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