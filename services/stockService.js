// Stock service for HSX API calls
export const fetchStockData = async (date) => {
  try {
    // Use query parameters as shown in the example URL
    const url = `https://api.hsx.vn/mk/api/v1/market/quote-report?tradingBy=VNINDEX&date=${date}`;
    console.log('Fetching data from URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Received data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching stock data:', error);
    throw error;
  }
};

// Helper function to format date to YYYY-MM-DD
export const formatDateForAPI = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to calculate percentage change
export const calculatePercentageChange = (startPrice, endPrice) => {
  if (!startPrice || !endPrice || startPrice === 0) return 0;
  const change = ((parseFloat(endPrice) - parseFloat(startPrice)) / parseFloat(startPrice)) * 100;
  return change.toFixed(2);
}; 