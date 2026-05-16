import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function VerifyId({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Identity Verification</Text>
      <Text style={styles.desc}>Please upload your National ID or Passport to access all features.</Text>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Take Photo of ID</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.buttonSecondary} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonTextSecondary}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  desc: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  button: { backgroundColor: '#FF5A5F', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonSecondary: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonTextSecondary: { color: '#333', fontSize: 16, fontWeight: 'bold' },
});
