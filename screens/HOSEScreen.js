import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
import { fetchStockData, formatDateForAPI, calculatePercentageChange, fetchHSXCompanyInfo } from '../services/stockService';

// VN30 static array
const VN30_STOCKS = [
  'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
  'LPB', 'MBB', 'MSN', 'MWG', 'PLX', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
  'TCB', 'TPB', 'VCB', 'VHM', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE'
];

export default function HOSEScreen() {
  const [startDate, setStartDate] = useState(new Date(2025, 6, 24)); // July 24, 2025
  const [endDate, setEndDate] = useState(new Date(2025, 6, 25)); // July 25, 2025
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState([]);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [searchText, setSearchText] = useState('');
  const [showVN30Only, setShowVN30Only] = useState(false); // VN30 filter state
  
  // Company info state
  const [companyMap, setCompanyMap] = useState({});
  const [companyInfoLoading, setCompanyInfoLoading] = useState(false);
  
  // Zoom and pan functionality
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [currentScale, setCurrentScale] = useState(1);
  const pinchRef = useRef();
  const panRef = useRef();
  const doubleTapRef = useRef();

  // Fetch company information when screen loads
  useEffect(() => {
    const loadCompanyInfo = async () => {
      setCompanyInfoLoading(true);
      try {
        const result = await fetchHSXCompanyInfo();
        
        if (result.success) {
          setCompanyMap(result.companyMap);
        }
      } catch (error) {
        console.error('🏢 Error loading company info:', error);
      } finally {
        setCompanyInfoLoading(false);
      }
    };

    loadCompanyInfo();
  }, []);

  // Helper function to get company name from the map
  const getCompanyName = useCallback((stockCode) => {
    const company = companyMap[stockCode];
    if (company && company.fullName) {
      return company.fullName; // Use fullName (Vietnamese company name)
    }
    return stockCode; // Fallback to stock code if no company name found
  }, [companyMap]);

  // Helper function to check if company data is available
  const hasCompanyData = useCallback((stockCode) => {
    const company = companyMap[stockCode];
    return company && company.fullName && company.fullName !== stockCode;
  }, [companyMap]);

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
    startData.forEach((startStock, index) => {
      const endStock = endDataMap[startStock.securitySymbol];
      if (endStock) {
        const startPrice = parseFloat(startStock.closePrice);
        const endPrice = parseFloat(endStock.closePrice);
        const changePercent = calculatePercentageChange(startPrice, endPrice);
        
        // Get company name with improved fallback logic
        const companyName = getCompanyName(startStock.securitySymbol);
        const displayCompanyName = (companyName && companyName !== startStock.securitySymbol) ? companyName : '';
        
        result.push([
          startStock.securitySymbol, // Stock Code
          {
            value: `${changePercent}%`, // Changes
            color: parseFloat(changePercent) >= 0 ? '#4CAF50' : '#F44336'
          },
          startPrice.toFixed(2), // Start Date Close Price
          endPrice.toFixed(2), // End Date Close Price
          displayCompanyName // Company Name (new column)
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
    let filtered = stockData;

    if (showVN30Only) {
      filtered = filtered.filter(row => VN30_STOCKS.includes(row[0]));
    }

    if (searchText.trim()) {
      filtered = filtered.filter(row => {
        const stockCode = row[0].toLowerCase(); // Stock code is in the first column
        const companyName = (row[4] || '').toLowerCase(); // Company name is in the fifth column
        const searchTerm = searchText.toLowerCase();
        
        // Search in both stock code and company name
        return stockCode.includes(searchTerm) || companyName.includes(searchTerm);
      });
    }

    return filtered;
  }, [stockData, searchText, showVN30Only]);

  const sortedAndFilteredData = useMemo(() => {
    if (!sortColumn || filteredData.length === 0) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortColumn) {
        case 'stockName':
          aValue = a[0]; // Stock Code
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
        case 'companyName':
          aValue = a[4] || ''; // Company Name
          bValue = b[4] || '';
          break;
        default:
          return 0;
      }

      if (sortColumn === 'stockName' || sortColumn === 'companyName') {
        // String comparison for stock names and company names
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

  // Memoize responsive column widths (updated for 5 columns)
  const tableColumnWidths = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    return [
      screenWidth * 0.15, // Stock Code - 15%
      screenWidth * 0.20, // Changes - 20%
      screenWidth * 0.20, // Start Price - 20%
      screenWidth * 0.20, // End Price - 20%
      screenWidth * 0.25, // Company Name - 25%
    ];
  }, []);

  const getSortIcon = useCallback((columnIndex) => {
    const columnNames = ['stockName', 'changes', 'startPrice', 'endPrice', 'companyName'];
    const columnName = columnNames[columnIndex];
    
    if (sortColumn !== columnName) {
      return ' ⇅'; // Default sort icon - indicates sortable
    }
    
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  }, [sortColumn, sortDirection]);

  const handleSearchTextChange = useCallback((text) => {
    setSearchText(text);
  }, []);

  // Pan gesture handlers - Define lastPan BEFORE gesture handlers
  const lastPan = useRef({ x: 0, y: 0 });
  
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

  const tableHead = ['Stock Code', 'Changes (%)', 'Start Price', 'End Price', 'Company Name'];
  
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
        {companyInfoLoading && (
          <View style={styles.companyLoadingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.companyLoadingText}>
              Loading company names...
            </Text>
          </View>
        )}
        {!companyInfoLoading && Object.keys(companyMap).length > 0 && (
          <Text style={styles.companyLoadedText}>
            ✅ {Object.keys(companyMap).length} companies loaded
          </Text>
        )}
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
          placeholder="Filter by stock code or company name (e.g., VCB, Vietcombank...)"
          value={searchText}
          onChangeText={handleSearchTextChange}
          placeholderTextColor="#999"
        />
      </View>

      {/* VN30 Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            showVN30Only && styles.filterButtonActive
          ]}
          onPress={() => setShowVN30Only(!showVN30Only)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.filterButtonText,
            showVN30Only && styles.filterButtonTextActive
          ]}>
            {showVN30Only ? 'Show All Stocks' : 'Show Only VN30'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Fetch Button */}
      <TouchableOpacity
        style={[
          styles.fetchButton, 
          companyInfoLoading && styles.fetchButtonDisabled
        ]}
        onPress={fetchStockComparison}
        disabled={loading || companyInfoLoading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <View style={styles.fetchButtonContent}>
            <Text style={[
              styles.fetchButtonText,
              companyInfoLoading && styles.fetchButtonTextDisabled
            ]}>
              Compare Stocks
            </Text>
            {companyInfoLoading && (
              <Text style={styles.fetchButtonSubtext}>
                Loading company names...
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Results Header */}
      {stockData.length > 0 && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            Comparison Results ({sortedAndFilteredData.length} stocks
            {searchText || showVN30Only ? ` filtered from ${stockData.length}` : ''}
            {showVN30Only ? ' • VN30 Only' : ''})
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
    currentScale, TableHeader, companyInfoLoading, companyMap, showVN30Only
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
        <View style={[styles.tableCell, { width: tableColumnWidths[4] }]}>
          <Text style={[styles.tableText, styles.companyNameText]} numberOfLines={0}>
            {item[4] || ''}
          </Text>
        </View>
      </View>
    );
  }, [tableColumnWidths]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Full-screen loading overlay for company info */}
      {companyInfoLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingTitle}>Loading Company Information</Text>
            <Text style={styles.loadingSubtitle}>
              Fetching company names from HSX...
            </Text>
            <Text style={styles.loadingHint}>
              Please wait, this will only take a moment
            </Text>
          </View>
        </View>
      )}
      
      {/* Main content - only show when company data is loaded */}
      {!companyInfoLoading && (
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
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={10}
                  updateCellsBatchingPeriod={50}
                  initialNumToRender={10}
                  windowSize={5}
                  showsVerticalScrollIndicator={true}
                  scrollEnabled={currentScale <= 1.1}
                  keyboardShouldPersistTaps="handled"
                />
              </Animated.View>
            </PinchGestureHandler>
          </PanGestureHandler>
        </TapGestureHandler>
      )}
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
  filterContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  filterButton: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  fetchButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  fetchButtonContent: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  fetchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fetchButtonTextDisabled: {
    color: '#999',
  },
  fetchButtonSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
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
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    minHeight: 35, // Minimum height for rows with short content
  },
  tableCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#ddd',
    paddingHorizontal: 4,
    paddingVertical: 8, // Add vertical padding for better spacing
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    minWidth: 280,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  loadingHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  fetchButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#ccc',
  },
  companyLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  companyLoadingText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  companyLoadedText: {
    marginTop: 10,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  companyNameText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'left',
    paddingHorizontal: 8, // Add more horizontal padding for company names
    flexWrap: 'wrap', // Enable text wrapping
  },
}); 