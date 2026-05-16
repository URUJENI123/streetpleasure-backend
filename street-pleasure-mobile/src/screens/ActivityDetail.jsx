import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ActivityDetail({ route, navigation }) {
  const { id } = route.params || { id: 'unknown' };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={{ color: '#FF5A5F' }}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Activity Detail: {id}</Text>
      <Text style={styles.desc}>This is a placeholder for activity details, map view, and participant list.</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Chat', { roomId: `activity_${id}` })}>
        <Text style={styles.buttonText}>Join Activity & Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 50 },
  backButton: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  desc: { fontSize: 16, color: '#666', marginBottom: 30 },
  button: { backgroundColor: '#FF5A5F', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
