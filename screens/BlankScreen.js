import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BlankScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>HNX Development Screen</Text>
      <Text style={styles.subtext}>🚧 HNX features will be implemented here step by step</Text>
      <Text style={styles.note}>For now, use HOSE tab for full functionality</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F8FF', // Light blue for HNX theme
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A', // Dark blue for HNX theme
    marginBottom: 10,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  note: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 