import React, { useState, useEffect } from 'react';
import { View, Image, Text, ScrollView, Alert, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';  

export default function MahjongAnalyzer() {
  const navigation = useNavigation();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('Checking...');
  ;


  const BACKEND_URL = 'https://mahjonglah-backend.onrender.com';

  useEffect(() => {
    console.log('MahjongAnalyzer component mounted');
    checkServerConnection();
  }, []);

  const checkServerConnection = async () => {
    try {
      const response = await fetch(BACKEND_URL, { method: 'GET' });
      if (response.ok) {
        setServerStatus('Connected');
        console.log('Server connected');
      } else {
        setServerStatus('Server error');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setServerStatus('Connection failed');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera roll permissions are required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
        setAnalysis(null);
        console.log('Image selected:', result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage,
        type: 'image/jpeg',
        name: 'mahjong_hand.jpg',
      } as any);

      console.log('Sending FormData with image URI:', selectedImage);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);

        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Analysis result:', result);

      setAnalysis(result);

      if (result.tiles && result.tiles.length > 0) {
        Alert.alert('Analysis Complete!', `Found ${result.tiles.length} tiles`);
      } else {
        Alert.alert('No Tiles Found', 'No mahjong tiles were detected in the image.');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);

      let errorMessage = 'Failed to analyze image';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Network error. Check your connection and server status.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      Alert.alert('Analysis Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const testUpload = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage,
        type: 'image/jpeg',
        name: 'test_image.jpg',
      } as any);

      console.log('Testing upload...');

      const response = await fetch(`${BACKEND_URL}/test-upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();
      console.log('Test upload result:', result);
      
      Alert.alert('Test Upload Result', JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Test upload error:', error);
      Alert.alert('Test Upload Error', error.message);
    }
  };

  const formatAnalysisResult = (analysis: any) => {
    if (!analysis) return '';
    let result = '';

    if (analysis.tiles && analysis.tiles.length > 0) {
      result += `Detected Tiles (${analysis.tiles.length}):\n`;
      result += analysis.tiles.map((tile: string) => `• ${tile}`).join('\n') + '\n\n';
    }

    if (analysis.suggestion) {
      result += 'AI Suggestion:\n' + analysis.suggestion;
    }

    return result || 'No analysis available';
  };

  const getStatusColor = () => {
    if (serverStatus === 'Connected') return '#4CAF50';
    if (serverStatus === 'Checking...') return '#FF9800';
    return '#F44336';
  };

  const getStatusIcon = () => {
    if (serverStatus === 'Connected') return '✓';
    if (serverStatus === 'Checking...') return '⏳';
    return '✗';
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

    {/* Back Button */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
      </View>
   
    {/*Header Card */}
        <View style={styles.headerCard}>
          <Text style={styles.title}>🀄 Mahjong Hand Analyzer</Text>
          <Text style={styles.subtitle}>Analyze your tiles with AI assistance</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
              </View>
              <Text style={styles.statusText}>Server Status: {serverStatus}</Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={checkServerConnection}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.cardTitle}>📷 Select Your Hand</Text>
          <Text style={styles.cardDescription}>
            Choose an image of your mahjong tiles to analyze
          </Text>
          <TouchableOpacity style={styles.selectButton} onPress={pickImage}>
            <Text style={styles.selectButtonText}>Select Image</Text>
          </TouchableOpacity>
        </View>

        {selectedImage && (
          <View style={styles.imageCard}>
            <Text style={styles.cardTitle}>🖼️ Selected Image</Text>
            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.image} />
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={analyzeImage}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? '🔄 Analyzing...' : '🎯 Analyze Hand'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.secondaryButton, loading && styles.disabledButton]}
                onPress={testUpload}
                disabled={loading}
              >
                <Text style={styles.buttonText}>🧪 Test Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#004d00" />
            <Text style={styles.loadingTitle}>Analyzing your hand...</Text>
            <Text style={styles.loadingSubtext}>This may take up to 60 seconds</Text>
          </View>
        )}

        {analysis && (
          <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>📊 Analysis Results</Text>
            <View style={styles.resultContainer}>
              <ScrollView style={styles.resultScrollView} nestedScrollEnabled={true}>
                <Text style={styles.resultText}>{formatAnalysisResult(analysis)}</Text>
              </ScrollView>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#004d00' },
  scrollContent: { paddingVertical: 20, paddingHorizontal: 16 },
  headerCard: { backgroundColor: 'white', borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center', elevation: 5 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#004d00', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center' },
  statusCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 5 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLeft: { flexDirection: 'row', alignItems: 'center' },
  statusIndicator: { width: 24, height: 24, borderRadius: 12, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  statusIcon: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  statusText: { fontSize: 16, color: '#333', fontWeight: '500' },
  refreshButton: { backgroundColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  refreshButtonText: { fontSize: 14, color: '#004d00', fontWeight: '500' },
  actionCard: { backgroundColor: 'white', borderRadius: 16, padding: 24, marginBottom: 16, elevation: 5 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#004d00', marginBottom: 8 },
  cardDescription: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },
  selectButton: { backgroundColor: '#004d00', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center' },
  selectButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  imageCard: { backgroundColor: 'white', borderRadius: 16, padding: 24, marginBottom: 16, elevation: 5 },
  imageContainer: { alignItems: 'center', marginBottom: 20 },
  image: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'contain', backgroundColor: '#f8f8f8' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  primaryButton: { backgroundColor: '#004d00', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', flex: 1 },
  secondaryButton: { backgroundColor: '#FF6B35', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', flex: 1 },
  disabledButton: { backgroundColor: '#ccc', opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  loadingCard: { backgroundColor: 'white', borderRadius: 16, padding: 32, marginBottom: 16, alignItems: 'center', elevation: 5 },
  loadingTitle: { fontSize: 18, fontWeight: '600', color: '#004d00', marginTop: 16, marginBottom: 8 },
  loadingSubtext: { fontSize: 14, color: '#666', textAlign: 'center' },
  resultCard: { backgroundColor: 'white', borderRadius: 16, padding: 24, marginBottom: 16, elevation: 5 },
  resultContainer: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 16, maxHeight: 300 },
  resultScrollView: { maxHeight: 280 },
  resultText: { fontSize: 14, color: '#333', lineHeight: 20 },
  backButtonContainer: { paddingHorizontal: 12, paddingBottom: 8,},

});
