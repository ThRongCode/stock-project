import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform, ActivityIndicator, FlatList, TextInput } from 'react-native';
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
  const [searchText, setSearchText] = useState('');

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
      console.log('Fetching HNX stock comparison data...');
      
      // Fetch data for both dates like HOSE does
      const [startDateData, endDateData] = await Promise.all([
        fetchHNXStockData(startDate),
        fetchHNXStockData(endDate),
      ]);
      
      console.log('📊 Fetched HNX data:', {
        startDate: startDateData.date,
        endDate: endDateData.date,
        startStockCount: startDateData.data.length,
        endStockCount: endDateData.data.length,
        startSource: startDateData.source,
        endSource: endDateData.source
      });

      // Combine and calculate percentage changes
      const combinedData = combineStockData(startDateData.data, endDateData.data);
      setStockData(combinedData);
      
      // Reset search when new data is fetched
      setSearchText('');
      
      Alert.alert(
        'HNX Comparison Complete! 📊', 
        `Successfully compared ${combinedData.length} stocks\n\nStart: ${startDateData.date} (${startDateData.data.length} stocks)\nEnd: ${endDateData.date} (${endDateData.data.length} stocks)`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch HNX stock data: ' + error.message);
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const combineStockData = (startData, endData) => {
    console.log('🔄 Combining HNX stock data for comparison...');
    const result = [];
    
    // Create a map of end data for quick lookup
    const endDataMap = {};
    endData.forEach(stock => {
      endDataMap[stock.securitySymbol] = stock;
    });

    // Combine data for stocks present in both datasets
    startData.forEach(startStock => {
      const endStock = endDataMap[startStock.securitySymbol];
      if (endStock) {
        const startPrice = parseFloat(startStock.closePrice) || 0;
        const endPrice = parseFloat(endStock.closePrice) || 0;
        const changePercent = calculatePercentageChange(startPrice, endPrice);
        
        result.push({
          securitySymbol: startStock.securitySymbol,
          startPrice: startPrice.toFixed(2),
          endPrice: endPrice.toFixed(2),
          changePercent: parseFloat(changePercent),
          changePercentFormatted: `${changePercent > 0 ? '+' : ''}${changePercent}%`,
          // Keep original data for debugging
          startData: startStock,
          endData: endStock,
          // Additional derived data
          priceChange: (endPrice - startPrice).toFixed(2),
          isPositive: parseFloat(changePercent) >= 0
        });
      }
    });

    // Sort by stock symbol alphabetically (A-Z)
    result.sort((a, b) => a.securitySymbol.localeCompare(b.securitySymbol));

    console.log(`📈 Successfully combined ${result.length} stocks for comparison`);
    console.log('📋 Sample stocks:', result.slice(0, 3).map(s => 
      `${s.securitySymbol}: ${s.changePercentFormatted}`
    ));

    return result;
  };

  // Filter stocks based on search text
  const filteredStockData = useMemo(() => {
    if (!searchText.trim()) {
      return stockData;
    }
    
    return stockData.filter(stock => {
      const stockName = stock.securitySymbol.toLowerCase();
      return stockName.includes(searchText.toLowerCase());
    });
  }, [stockData, searchText]);

  const handleSearchTextChange = useCallback((text) => {
    setSearchText(text);
  }, []);

  const renderStockItem = ({ item, index }) => (
    <View style={[styles.stockItem, index % 2 === 0 ? styles.evenItem : styles.oddItem]}>
      <View style={styles.stockHeader}>
        <Text style={styles.stockSymbol}>{item.securitySymbol}</Text>
        <Text style={[
          styles.changePercent, 
          { color: item.isPositive ? '#10B981' : '#EF4444' }
        ]}>
          {item.changePercentFormatted}
        </Text>
      </View>
      
      <View style={styles.stockDetails}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Start Price:</Text>
          <Text style={styles.priceValue}>{item.startPrice}</Text>
        </View>
        
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>End Price:</Text>
          <Text style={styles.priceValue}>{item.endPrice}</Text>
        </View>
        
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Price Change:</Text>
          <Text style={[
            styles.priceValue, 
            { color: item.isPositive ? '#10B981' : '#EF4444' }
          ]}>
            {item.isPositive ? '+' : ''}{item.priceChange}
          </Text>
        </View>
      </View>
    </View>
  );

  const ListHeaderComponent = () => (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>HNX Stock Comparison</Text>
        <Text style={styles.subtitle}>🏛️ Two-Date Analysis</Text>
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

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter stocks by symbol (e.g., AAV, VNM, BVS...)"
          value={searchText}
          onChangeText={handleSearchTextChange}
          placeholderTextColor="#999"
        />
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
            <Text style={styles.buttonText}>📊 Compare HNX Stocks</Text>
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
            📊 Stock Comparison Results ({filteredStockData.length}
            {searchText ? ` of ${stockData.length}` : ''})
          </Text>
          <Text style={styles.stockDataSubtitle}>
            Sorted alphabetically by stock symbol (A-Z)
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <FlatList
        data={filteredStockData}
        renderItem={renderStockItem}
        keyExtractor={(item, index) => `${item.securitySymbol}-${index}`}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={
          !loading && stockData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                📋 No comparison data yet
              </Text>
              <Text style={styles.emptySubtext}>
                Select two dates and tap "Compare HNX Stocks" to see price changes
              </Text>
            </View>
          ) : searchText && filteredStockData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                🔍 No stocks found
              </Text>
              <Text style={styles.emptySubtext}>
                No stocks match "{searchText}". Try a different search term.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
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
  changePercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    fontSize: 16,
    color: '#333',
  },
}); 