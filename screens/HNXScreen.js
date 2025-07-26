import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function HNXScreen() {
  const [startDate, setStartDate] = useState(new Date(2025, 6, 24));
  const [endDate, setEndDate] = useState(new Date(2025, 6, 25));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const onStartDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || startDate;
    setShowStartPicker(Platform.OS === 'ios');
    setStartDate(currentDate);
  };

  const onEndDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || endDate;
    setShowEndPicker(Platform.OS === 'ios');
    setEndDate(currentDate);
  };

  const handleTestConnection = () => {
    Alert.alert('HNX Test', 'HNX API testing will be implemented here');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>HNX Stock Comparison</Text>
        <Text style={styles.subtitle}>🚧 Under Development</Text>
      </View>

      {/* Date Pickers */}
      <View style={styles.datePickerContainer}>
        <View style={styles.datePickerSection}>
          <Text style={styles.dateLabel}>Start Date:</Text>
          <TouchableOpacity
            onPress={() => setShowStartPicker(true)}
            style={styles.dateButton}
          >
            <Text style={styles.dateButtonText}>
              {startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showStartPicker && (
            <DateTimePicker
              testID="startDateTimePicker"
              value={startDate}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={onStartDateChange}
            />
          )}
        </View>

        <View style={styles.datePickerSection}>
          <Text style={styles.dateLabel}>End Date:</Text>
          <TouchableOpacity
            onPress={() => setShowEndPicker(true)}
            style={styles.dateButton}
          >
            <Text style={styles.dateButtonText}>
              {endDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showEndPicker && (
            <DateTimePicker
              testID="endDateTimePicker"
              value={endDate}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={onEndDateChange}
            />
          )}
        </View>
      </View>

      {/* Placeholder buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleTestConnection}
        >
          <Text style={styles.buttonText}>🧪 Test HNX Connection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.disabledButton]}
          disabled={true}
        >
          <Text style={styles.disabledButtonText}>📊 Compare HNX Stocks (Coming Soon)</Text>
        </TouchableOpacity>
      </View>

      {/* Info section */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>HNX Features Coming Soon:</Text>
        <Text style={styles.infoItem}>• Complete HNX stock data</Text>
        <Text style={styles.infoItem}>• HTML parsing from HNX API</Text>
        <Text style={styles.infoItem}>• Stock comparison table</Text>
        <Text style={styles.infoItem}>• Zoom and pan functionality</Text>
        <Text style={styles.infoItem}>• Search and sorting</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF', // Light blue for HNX
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A', // Dark blue
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  datePickerSection: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3B82F6',
    minWidth: 140,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  disabledButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 15,
  },
  infoItem: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
    paddingLeft: 10,
  },
}); 