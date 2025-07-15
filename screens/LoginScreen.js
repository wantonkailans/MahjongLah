import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const validateInputs = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return false;
    }
    
    return true;
  };

  const handleLogin = async () => {
    console.log('Login started...');
    
    if (!validateInputs()) {
      console.log('Validation failed');
      return;
    }
    
    setLoading(true);

    try {
      console.log('Signing in user...');
      
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('User signed in:', user.uid);

      // Update last login time
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          lastLogin: new Date().toISOString(),
        });
        console.log('Last login updated');
      } catch (updateError) {
        console.log('Could not update last login:', updateError);
        // Don't block login for this error
      }

      console.log('Navigating to Home...');
      
      // Navigate to home screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please check your email or sign up.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image source={require('../assets/images/mahjonglah!.png')} style={styles.logo} />

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Please login to continue.</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <TextInput
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          autoCapitalize="none"
        />

        <TouchableOpacity 
          style={[styles.blackButton, loading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.greenButton} onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#004d00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 20,
    width: '90%',
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 2,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 22,
    color: '#000',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#000',
  },
  blackButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  greenButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
