import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../services/api';

export default function Destinations() {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDestinations = async () => {
    try {
      const response = await api.get('/destinations');
      setDestinations(response.data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load destinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Adventure Destinations</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#FF5A5F" style={{ marginTop: 50 }} />
      ) : destinations.length === 0 ? (
        <Text style={styles.emptyText}>No destinations available.</Text>
      ) : (
        <FlatList
          data={destinations}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.desc}>{item.description || 'No description available'}</Text>
            </TouchableOpacity>
          )}
          refreshing={loading}
          onRefresh={fetchDestinations}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', paddingTop: 50, paddingHorizontal: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 50, fontSize: 16 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15 },
  title: { fontSize: 18, fontWeight: 'bold' },
  desc: { color: '#666', marginTop: 5 },
});
