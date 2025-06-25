import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebase';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(FIREBASE_AUTH, email, password);
      navigation.navigate('Home');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image source={require('../assets/images/mahjonglah!.png')} style={styles.logo} />

        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Please login to continue</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity style={styles.blackButton} onPress={handleLogin}>
          <Text style={styles.buttonText}>Sign In</Text>
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
    width: 150,
    height: 50,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 22,
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
  },
  blackButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
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
  },
});

