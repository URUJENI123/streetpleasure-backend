import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import useStore from '../store/useStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Splash() {
  const { setToken, setAppReady } = useStore();

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) setToken(token);
      } catch (e) {
        console.error(e);
      } finally {
        setAppReady(true);
      }
    };
    checkToken();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Street pleasure</Text>
      <Text style={styles.subtitle}>Verified. Safe. Local.</Text>
      <ActivityIndicator size="large" color="#FF5A5F" style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 16, color: '#aaa', marginTop: 10 },
});
