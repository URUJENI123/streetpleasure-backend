import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function PoliceReport({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={{ color: '#FF5A5F' }}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.header}>Police Report Packet</Text>
      <Text style={styles.desc}>This incident has been recorded and verified.</Text>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Download PDF</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 50 },
  backButton: { marginBottom: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  desc: { fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: '#333', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
