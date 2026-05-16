import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import useStore from '../store/useStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function Profile() {
  const { logout } = useStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/users/me');
        setProfile(response.data.user);
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    logout();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#FF5A5F" />
      ) : profile ? (
        <>
          <Text style={styles.info}>Phone: {profile.phone_number}</Text>
          <Text style={styles.info}>Role: {profile.role || 'Unverified'}</Text>
          <Text style={styles.info}>Name: {profile.full_name || 'Anonymous'}</Text>
          <Text style={styles.info}>Rating: ⭐ {profile.rating_avg || 'N/A'}</Text>
        </>
      ) : (
        <Text style={styles.info}>Profile data not found.</Text>
      )}

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 50 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  info: { fontSize: 16, marginBottom: 10 },
  button: { backgroundColor: '#FF5A5F', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
