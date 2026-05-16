import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

export default function HomeFeed({ navigation }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      // Hardcoded Kigali coordinates for testing
      const response = await api.get('/activities?lat=-1.9441&lon=30.0619');
      setActivities(response.data.activities || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchActivities();
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Nearby Activities</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#FF5A5F" style={{ marginTop: 50 }} />
      ) : activities.length === 0 ? (
        <Text style={styles.emptyText}>No activities found nearby. Be the first to create one!</Text>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => navigation.navigate('ActivityDetail', { id: item.id })}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.details}>{new Date(item.scheduled_at).toLocaleString()}</Text>
              <Text style={styles.details}>{item.participant_count || 0}/{item.max_participants} joined • {item.activity_type}</Text>
            </TouchableOpacity>
          )}
          refreshing={loading}
          onRefresh={fetchActivities}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', paddingTop: 50, paddingHorizontal: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 50, fontSize: 16 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  title: { fontSize: 18, fontWeight: 'bold' },
  details: { color: '#666', marginTop: 5 },
});
