import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../services/api';

export default function CreatePost({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePostActivity = async () => {
    if (!title || !description || !address) {
      return Alert.alert('Error', 'Please fill out all fields.');
    }

    setLoading(true);
    try {
      // Set to one hour from now for testing
      const scheduledDate = new Date();
      scheduledDate.setHours(scheduledDate.getHours() + 1);

      await api.post('/activities', {
        title,
        description,
        activity_type: 'other', // hardcoded for now
        lat: -1.9441, // Kigali coords
        lon: 30.0619,
        address_text: address,
        scheduled_at: scheduledDate.toISOString(),
        max_participants: 6,
      });

      Alert.alert('Success', 'Activity created successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
      setTitle('');
      setDescription('');
      setAddress('');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create activity. Make sure your account is fully verified.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Create an Activity</Text>
        
        <TextInput 
          style={styles.input} 
          placeholder="Activity Title (e.g. Hike to Mount Kigali)" 
          value={title}
          onChangeText={setTitle}
        />
        
        <TextInput 
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
          placeholder="Description" 
          multiline 
          numberOfLines={4} 
          value={description}
          onChangeText={setDescription}
        />
        
        <TextInput 
          style={styles.input} 
          placeholder="Address/Location Text" 
          value={address}
          onChangeText={setAddress}
        />
        
        <TouchableOpacity style={styles.button} onPress={handlePostActivity} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Post Activity</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 20, paddingTop: 50 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#FF5A5F', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
