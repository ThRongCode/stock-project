import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  TextInput,
  FlatList,
  Animated,
} from 'react-native';
import { PinchGestureHandler, TapGestureHandler, PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchStockData, formatDateForAPI, calculatePercentageChange } from './services/stockService';

export default function App() {
  const [startDate, setStartDate] = useState(new Date(2025, 6, 24)); // July 24, 2025
  const [endDate, setEndDate] = useState(new Date(2025, 6, 25)); // July 25, 2025
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState([]);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [searchText, setSearchText] = useState('');
  
  // Zoom and pan functionality
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [currentScale, setCurrentScale] = useState(1);
  const pinchRef = useRef();
  const panRef = useRef();
  const doubleTapRef = useRef();

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

  const fetchStockComparison = async () => {
    if (endDate < startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      const startDateStr = formatDateForAPI(startDate);
      const endDateStr = formatDateForAPI(endDate);

      // Fetch data for both dates
      const [startDateData, endDateData] = await Promise.all([
        fetchStockData(startDateStr),
        fetchStockData(endDateStr),
      ]);

      // Process and combine the data
      const combinedData = combineStockData(startDateData.data, endDateData.data);
      setStockData(combinedData);
      
      // Reset sorting and search when new data is fetched
      setSortColumn(null);
      setSortDirection('asc');
      setSearchText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch stock data. Please try again.');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const combineStockData = (startData, endData) => {
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
        const startPrice = parseFloat(startStock.closePrice);
        const endPrice = parseFloat(endStock.closePrice);
        const changePercent = calculatePercentageChange(startPrice, endPrice);
        
        result.push([
          startStock.securitySymbol, // Stock Name
          {
            value: `${changePercent}%`, // Changes
            color: parseFloat(changePercent) >= 0 ? '#4CAF50' : '#F44336'
          },
          startPrice.toFixed(2), // Start Date Close Price
          endPrice.toFixed(2), // End Date Close Price
        ]);
      }
    });

    return result;
  };

  const handleColumnSort = useCallback((columnIndex) => {
    const columnNames = ['stockName', 'changes', 'startPrice', 'endPrice'];
    const columnName = columnNames[columnIndex];
    
    // If clicking the same column, toggle direction; otherwise, start with ascending
    if (sortColumn === columnName) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnName);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  const filteredData = useMemo(() => {
    if (!searchText.trim()) {
      return stockData;
    }
    
    return stockData.filter(row => {
      const stockName = row[0].toLowerCase(); // Stock name is in the first column
      return stockName.includes(searchText.toLowerCase());
    });
  }, [stockData, searchText]);

  const sortedAndFilteredData = useMemo(() => {
    if (!sortColumn || filteredData.length === 0) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortColumn) {
        case 'stockName':
          aValue = a[0]; // Stock Name
          bValue = b[0];
          break;
        case 'changes':
          // Extract percentage value from the object
          aValue = parseFloat(a[1].value.replace('%', ''));
          bValue = parseFloat(b[1].value.replace('%', ''));
          break;
        case 'startPrice':
          aValue = parseFloat(a[2]); // Start Price
          bValue = parseFloat(b[2]);
          break;
        case 'endPrice':
          aValue = parseFloat(a[3]); // End Price
          bValue = parseFloat(b[3]);
          break;
        default:
          return 0;
      }

      if (sortColumn === 'stockName') {
        // String comparison for stock names
        if (sortDirection === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      } else {
        // Numeric comparison for prices and percentages
        if (sortDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Memoize responsive column widths
  const tableColumnWidths = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    return [
      screenWidth * 0.25, // Stock Name - 25%
      screenWidth * 0.25, // Changes - 25%
      screenWidth * 0.25, // Start Price - 25%
      screenWidth * 0.25, // End Price - 25%
    ];
  }, []);

  const getSortIcon = useCallback((columnIndex) => {
    const columnNames = ['stockName', 'changes', 'startPrice', 'endPrice'];
    const columnName = columnNames[columnIndex];
    
    if (sortColumn !== columnName) {
      return ' ⇅'; // Default sort icon - indicates sortable
    }
    
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  }, [sortColumn, sortDirection]);

  const handleSearchTextChange = useCallback((text) => {
    setSearchText(text);
  }, []);

  // Zoom gesture handlers
  const onPinchGestureEvent = useCallback((event) => {
    const { scale: newScale } = event.nativeEvent;
    // Limit zoom between 0.8x and 3x
    const clampedScale = Math.min(Math.max(newScale, 0.8), 3);
    scale.setValue(clampedScale);
    setCurrentScale(clampedScale);
  }, [scale]);

  const onPinchStateChange = useCallback((event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { scale: newScale } = event.nativeEvent;
      const clampedScale = Math.min(Math.max(newScale, 0.8), 3);
      
      setCurrentScale(clampedScale);
      
      // If zoom level is back to normal (1x), reset pan position
      if (clampedScale <= 1.1) {
        lastPan.current = { x: 0, y: 0 };
        Animated.parallel([
          Animated.spring(scale, {
            toValue: clampedScale,
            useNativeDriver: true,
          }),
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.spring(scale, {
          toValue: clampedScale,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [scale, translateX, translateY]);

  const onDoubleTap = useCallback((event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      // Reset zoom and pan to original position on double tap
      lastPan.current = { x: 0, y: 0 };
      setCurrentScale(1);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [scale, translateX, translateY]);

  // Pan gesture handlers
  const lastPan = useRef({ x: 0, y: 0 });
  
  const onPanGestureEvent = useCallback((event) => {
    // Only allow panning when zoomed in
    if (currentScale <= 1.1) return;
    
    const { translationX, translationY } = event.nativeEvent;
    translateX.setValue(lastPan.current.x + translationX);
    translateY.setValue(lastPan.current.y + translationY);
  }, [translateX, translateY, currentScale]);

  const onPanStateChange = useCallback((event) => {
    // Only allow panning when zoomed in
    if (currentScale <= 1.1) return;
    
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, translationY } = event.nativeEvent;
      const newX = lastPan.current.x + translationX;
      const newY = lastPan.current.y + translationY;
      
      // Apply bounds based on current zoom level
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;
      
      // Allow more panning when zoomed in
      const maxTranslateX = screenWidth * 0.4 * currentScale;
      const maxTranslateY = screenHeight * 0.3 * currentScale;
      
      const clampedX = Math.min(Math.max(newX, -maxTranslateX), maxTranslateX);
      const clampedY = Math.min(Math.max(newY, -maxTranslateY), maxTranslateY);
      
      lastPan.current = { x: clampedX, y: clampedY };
      
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: clampedX,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: clampedY,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [translateX, translateY, currentScale]);

  const tableHead = ['Stock Name', 'Changes (%)', 'Start Price', 'End Price'];
  
  // Create table header component
  const TableHeader = useMemo(() => (
    <View style={styles.tableHeaderRow}>
      {tableHead.map((header, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.tableHeaderButton, { width: tableColumnWidths[index] }]}
          onPress={() => handleColumnSort(index)}
          activeOpacity={0.7}
        >
          <Text style={styles.tableHeadText}>
            {header}{getSortIcon(index)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [handleColumnSort, getSortIcon, sortColumn, sortDirection, tableColumnWidths]);



    // Create header component for the FlatList
  const ListHeaderComponent = useMemo(() => (
    <View style={styles.listHeader}>
      <View style={styles.header}>
        <Text style={styles.title}>Stock Price Comparison</Text>
      </View>

      <View style={styles.datePickerContainer}>
        {/* Start Date Picker */}
        <View style={styles.datePickerSection}>
          <Text style={styles.dateLabel}>Start Date:</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={styles.dateText}>
              {startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showStartPicker && (
            <DateTimePicker
              testID="startDatePicker"
              value={startDate}
              mode="date"
              display="default"
              onChange={onStartDateChange}
            />
          )}
        </View>

        {/* End Date Picker */}
        <View style={styles.datePickerSection}>
          <Text style={styles.dateLabel}>End Date:</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={styles.dateText}>
              {endDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showEndPicker && (
            <DateTimePicker
              testID="endDatePicker"
              value={endDate}
              mode="date"
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
          placeholder="Filter stocks by name (e.g., AAA, VNM...)"
          value={searchText}
          onChangeText={handleSearchTextChange}
          placeholderTextColor="#999"
        />
      </View>

      {/* Fetch Button */}
      <TouchableOpacity
        style={styles.fetchButton}
        onPress={fetchStockComparison}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.fetchButtonText}>Compare Stocks</Text>
        )}
      </TouchableOpacity>

      {/* Results Header */}
      {stockData.length > 0 && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            Comparison Results ({sortedAndFilteredData.length} stocks
            {searchText ? ` filtered from ${stockData.length}` : ''})
          </Text>
          <Text style={styles.zoomHint}>
            💡 Pinch to zoom • {currentScale > 1.1 ? 'Drag to pan' : 'Scroll normally'} • Double tap to reset
          </Text>
          {TableHeader}
        </View>
      )}
    </View>
  ), [
    startDate, endDate, showStartPicker, showEndPicker, 
    searchText, loading, stockData.length, sortedAndFilteredData.length, 
    currentScale, TableHeader
  ]);

  // Regular row component (gestures will be at FlatList level)
  const SimpleTableRow = useCallback(({ item, index }) => {
    if (!item || !Array.isArray(item) || item.length < 4) {
      return null;
    }

    return (
      <View style={[styles.tableDataRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
        <View style={[styles.tableCell, { width: tableColumnWidths[0] }]}>
          <Text style={styles.tableText}>{item[0] || ''}</Text>
        </View>
        <View style={[styles.tableCell, { width: tableColumnWidths[1] }]}>
          <Text style={[styles.tableText, { 
            color: item[1]?.color || '#333', 
            fontWeight: '600' 
          }]}>
            {item[1]?.value || ''}
          </Text>
        </View>
        <View style={[styles.tableCell, { width: tableColumnWidths[2] }]}>
          <Text style={styles.tableText}>{item[2] || ''}</Text>
        </View>
        <View style={[styles.tableCell, { width: tableColumnWidths[3] }]}>
          <Text style={styles.tableText}>{item[3] || ''}</Text>
        </View>
      </View>
    );
  }, [tableColumnWidths]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="auto" />
      <TapGestureHandler
        ref={doubleTapRef}
        onHandlerStateChange={onDoubleTap}
        numberOfTaps={2}
      >
        <PanGestureHandler
          ref={panRef}
          onGestureEvent={onPanGestureEvent}
          onHandlerStateChange={onPanStateChange}
          simultaneousHandlers={[pinchRef, doubleTapRef]}
          minPointers={1}
          maxPointers={1}
          enabled={currentScale > 1.1}
        >
          <PinchGestureHandler
            ref={pinchRef}
            onGestureEvent={onPinchGestureEvent}
            onHandlerStateChange={onPinchStateChange}
            simultaneousHandlers={[panRef, doubleTapRef]}
          >
            <Animated.View 
              style={[
                styles.mainFlatList,
                {
                  transform: [
                    { translateX },
                    { translateY },
                    { scale }
                  ]
                }
              ]}
            >
              <FlatList
                data={stockData.length > 0 ? sortedAndFilteredData : []}
                renderItem={SimpleTableRow}
                keyExtractor={(item, index) => `${item?.[0] || 'unknown'}-${index}`}
                ListHeaderComponent={ListHeaderComponent}
                ListEmptyComponent={!loading && stockData.length === 0 ? (
                  <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>
                      Select two dates and tap "Compare Stocks" to see results
                    </Text>
                  </View>
                ) : null}
                contentContainerStyle={styles.flatListContent}
                getItemLayout={(data, index) => ({
                  length: 35,
                  offset: 35 * index,
                  index,
                })}
                removeClippedSubviews={true}
                maxToRenderPerBatch={20}
                updateCellsBatchingPeriod={50}
                initialNumToRender={20}
                windowSize={10}
                showsVerticalScrollIndicator={true}
                scrollEnabled={currentScale <= 1.1}
                keyboardShouldPersistTaps="handled"
              />
            </Animated.View>
          </PinchGestureHandler>
        </PanGestureHandler>
      </TapGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mainFlatList: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  listHeader: {
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  datePickerSection: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#555',
  },
  dateButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 120,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  fetchButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  fetchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },


  tableHeaderRow: {
    flexDirection: 'row',
    height: 40,
    backgroundColor: '#f1f8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableHeaderButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f8ff',
    borderRightWidth: 0.5,
    borderRightColor: '#ddd',
  },
  tableHeadText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333',
    fontSize: 13,
    paddingHorizontal: 4,
  },
  tableDataScroll: {
    flex: 1,
  },
  tableDataRow: {
    flexDirection: 'row',
    height: 35,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  tableCell: {
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#ddd',
    paddingHorizontal: 4,
  },
  evenRow: {
    backgroundColor: '#ffffff',
  },
  oddRow: {
    backgroundColor: '#f9f9f9',
  },
  tableText: {
    textAlign: 'center',
    color: '#333',
    fontSize: 12,
  },
  resultsHeader: {
    backgroundColor: 'white',
    paddingTop: 15,
    paddingBottom: 0,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
    paddingHorizontal: 15,
  },
  zoomHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  noDataContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 200,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
