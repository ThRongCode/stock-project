import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform, ActivityIndicator, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { testHNXListDataAPI, fetchHNXStockData, formatDateForHNX } from '../services/hnxService';
import { calculatePercentageChange } from '../services/stockService';

export default function HNXScreen() {
  const [startDate, setStartDate] = useState(new Date(2025, 6, 24));
  const [endDate, setEndDate] = useState(new Date(2025, 6, 25));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState([]);
  const [apiTestResult, setApiTestResult] = useState(null);

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

  const handleTestAPI = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing HNX ListData API with start date:', startDate);
      const result = await testHNXListDataAPI(startDate);
      
      setApiTestResult(result);
      
      if (result.success) {
        Alert.alert(
          'HNX ListData API Test Success! 🎉', 
          `${result.message}\n\nDate: ${result.date}\nHTML Length: ${result.htmlLength} chars\n\nCheck console for full HTML response.`
        );
      } else {
        Alert.alert('HNX API Test Failed ❌', result.error);
      }
    } catch (error) {
      Alert.alert('Test Error', error.message);
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchStockData = async () => {
    if (endDate < startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching HNX stock data...');
      
      // For now, just fetch one date to test parsing
      const startDateData = await fetchHNXStockData(startDate);
      
      console.log('📊 Fetched HNX data:', {
        source: startDateData.source,
        date: startDateData.date,
        stockCount: startDateData.data.length,
        htmlLength: startDateData.htmlLength
      });

      setStockData(startDateData.data);
      
      Alert.alert(
        'Data Fetched! 📊', 
        `Successfully parsed ${startDateData.data.length} stocks from HNX\n\nDate: ${startDateData.date}\nSource: ${startDateData.source}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch HNX stock data: ' + error.message);
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStockItem = ({ item, index }) => (
    <View style={[styles.stockItem, index % 2 === 0 ? styles.evenItem : styles.oddItem]}>
      <View style={styles.stockHeader}>
        <Text style={styles.stockSymbol}>{item.securitySymbol}</Text>
        <Text style={styles.stockPrice}>{parseFloat(item.closePrice || 0).toFixed(2)}</Text>
      </View>
      
      <View style={styles.stockDetails}>
        <Text style={styles.stockDetailText}>
          O: {parseFloat(item.openPrice || 0).toFixed(2)} • 
          H: {parseFloat(item.highPrice || 0).toFixed(2)} • 
          L: {parseFloat(item.lowPrice || 0).toFixed(2)}
        </Text>
        
        {item.allCells && (
          <Text style={styles.debugText} numberOfLines={1}>
            Cells: {item.cellCount} | {item.allCells.slice(0, 4).join(' | ')}
          </Text>
        )}
      </View>
    </View>
  );

  const ListHeaderComponent = () => (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>HNX Stock Data</Text>
        <Text style={styles.subtitle}>🏛️ Real-time Parsing</Text>
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

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={handleTestAPI}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.buttonText}>🧪 Test HNX ListData API</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.fetchButton]}
          onPress={handleFetchStockData}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.buttonText}>📊 Parse HNX Stock Data</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* API Test Results */}
      {apiTestResult && apiTestResult.success && (
        <View style={styles.testResultContainer}>
          <Text style={styles.testResultTitle}>✅ API Test Results:</Text>
          <Text style={styles.testResultText}>
            📅 Date: {apiTestResult.date}
          </Text>
          <Text style={styles.testResultText}>
            📄 HTML Size: {apiTestResult.htmlLength.toLocaleString()} chars
          </Text>
          <Text style={styles.testResultText}>
            📋 Has Table: {apiTestResult.hasTable ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.testResultText}>
            💹 Has Stock Data: {apiTestResult.hasStockData ? 'Yes' : 'No'}
          </Text>
        </View>
      )}

      {/* Stock Data Header */}
      {stockData.length > 0 && (
        <View style={styles.stockDataHeader}>
          <Text style={styles.stockDataTitle}>
            📊 Parsed Stocks ({stockData.length})
          </Text>
          <Text style={styles.stockDataSubtitle}>
            O = Open • H = High • L = Low
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <FlatList
        data={stockData}
        renderItem={renderStockItem}
        keyExtractor={(item, index) => `${item.securitySymbol}-${index}`}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={
          !loading && stockData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                📋 No stock data yet
              </Text>
              <Text style={styles.emptySubtext}>
                Tap "Parse HNX Stock Data" to load real HNX data
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  headerContainer: {
    padding: 20,
    backgroundColor: '#F0F8FF',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
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
    gap: 12,
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  testButton: {
    backgroundColor: '#10B981',
  },
  fetchButton: {
    backgroundColor: '#3B82F6',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testResultContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  testResultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 8,
  },
  testResultText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  stockDataHeader: {
    marginBottom: 10,
  },
  stockDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 5,
  },
  stockDataSubtitle: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  stockItem: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 4,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  evenItem: {
    backgroundColor: '#FFFFFF',
  },
  oddItem: {
    backgroundColor: '#F8FAFC',
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  stockPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  stockDetails: {
    gap: 4,
  },
  stockDetailText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  debugText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 