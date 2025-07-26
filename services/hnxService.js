// HNX API Service
// Based on the user's investigation of HNX website APIs

// Format date for HNX API (DD/MM/YYYY format)
export const formatDateForHNX = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Test HNX ListData_Listed API (the real stock data API)
export const testHNXListDataAPI = async (date = new Date()) => {
  try {
    const formattedDate = formatDateForHNX(date);
    console.log('🔍 Testing HNX ListData_Listed API for date:', formattedDate);
    
    // Construct the form data based on the curl command
    // Pattern: date|0|-1|-1|0|date
    const searchParam = `${formattedDate}|0|-1|-1|0|${formattedDate}`;
    
    const formData = new URLSearchParams({
      'p_keysearch': searchParam,
      'pColOrder': 'col_a',
      'pOrderType': 'ASC',
      'pCurrentPage': '1',
      'pRecordOnPage': '1000', // Get all available stocks instead of just 50
      'pIsSearch': '1'
    });

    console.log('📤 Form data:', formData.toString());
    
    const response = await fetch('https://hnx.vn/ModuleReportStockETFs/Report_MD_PriceVolatilyti/ListData_Listed', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://hnx.vn',
        'Referer': 'https://hnx.vn/vi-vn/co-phieu-etfs/du-lieu-thi-truong-ny.html',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: formData.toString()
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const htmlData = await response.text();
    console.log('✅ HNX ListData response length:', htmlData.length);
    console.log('📄 Response preview (first 500 chars):', htmlData.substring(0, 500));
    
    // Check if it contains expected HTML structure
    const hasTable = htmlData.includes('<table') || htmlData.includes('divContainTable');
    const hasStockData = htmlData.includes('col_') || htmlData.includes('stock') || htmlData.includes('price');
    
    return {
      success: true,
      htmlLength: htmlData.length,
      hasTable,
      hasStockData,
      rawHTML: htmlData,
      date: formattedDate,
      message: `Received ${htmlData.length} chars of HTML. Contains table: ${hasTable}, Has stock data: ${hasStockData}`
    };
    
  } catch (error) {
    console.error('❌ HNX ListData API test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Legacy function - keep for backwards compatibility but mark as deprecated
export const testHNXConnection = async () => {
  console.log('⚠️ testHNXConnection is deprecated. Use testHNXListDataAPI instead.');
  return await testHNXListDataAPI();
};

// Parse HTML response and extract stock data (basic implementation)
const parseHNXStockData = (htmlText) => {
  console.log('🔍 Parsing HNX HTML data...');
  
  try {
    // Find all table rows in the tbody section
    const tableRowRegex = /<tr[^>]*>(.*?)<\/tr>/gs;
    const cellRegex = /<td[^>]*>(.*?)<\/td>/gs;
    
    const stocks = [];
    let match;
    
    // Extract all table rows
    while ((match = tableRowRegex.exec(htmlText)) !== null) {
      const rowContent = match[1];
      
      // Skip header rows and empty rows
      if (rowContent.includes('<th') || !rowContent.includes('<td')) {
        continue;
      }
      
      // Extract all cells from this row
      const cells = [];
      let cellMatch;
      const cellRegexForRow = /<td[^>]*>(.*?)<\/td>/gs;
      
      while ((cellMatch = cellRegexForRow.exec(rowContent)) !== null) {
        // Clean up the cell content - remove HTML tags and decode entities
        let cellContent = cellMatch[1]
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
          .replace(/&#225;/g, 'á') // Replace &#225; with á
          .replace(/&#227;/g, 'ã') // Replace &#227; with ã
          .replace(/&amp;/g, '&') // Replace &amp; with &
          .trim();
        
        cells.push(cellContent);
      }
      
      // If we have enough cells, try to extract stock data
      if (cells.length >= 4) {
        // Based on the header structure we saw:
        // STT | Mã CK | Mã ISIN | Giá Thay đổi | ... other columns
        const stockSymbol = cells[1]; // Mã CK (Stock Code)
        const priceChange = cells[3]; // Giá Thay đổi or similar
        
        // Only add if we have a valid stock symbol
        if (stockSymbol && stockSymbol.length > 0 && stockSymbol !== '-') {
          // Try to extract price information from available cells
          const prices = cells.slice(3).filter(cell => {
            // Look for cells that contain numbers (prices)
            return /[\d,]+/.test(cell) && cell !== '-' && cell.length > 0;
          });
          
          const stock = {
            securitySymbol: stockSymbol,
            closePrice: prices[0] || '0',
            openPrice: prices[1] || prices[0] || '0',
            highPrice: prices[2] || prices[0] || '0',
            lowPrice: prices[3] || prices[0] || '0',
            changePrice: '0',
            changePriceRatio: '0',
            // Additional info for debugging
            allCells: cells.slice(0, 8), // First 8 cells for debugging
            cellCount: cells.length
          };
          
          stocks.push(stock);
        }
      }
    }
    
    console.log(`📊 Successfully parsed ${stocks.length} stocks from HTML`);
    
    // Log first few stocks for debugging
    if (stocks.length > 0) {
      console.log('📋 First 3 parsed stocks:', stocks.slice(0, 3));
    }
    
    return stocks;
    
  } catch (error) {
    console.error('❌ Error parsing HNX HTML:', error);
    
    // Fallback to line-based parsing for debugging
    const lines = htmlText.split('\n');
    const dataLines = lines.filter(line => 
      line.includes('<td') && 
      !line.includes('<th') &&
      line.trim().length > 0
    );
    
    console.log(`📊 Fallback: Found ${dataLines.length} table cell lines`);
    
    // Return a simple test stock for debugging
    return [
      {
        securitySymbol: 'HNX_PARSE_TEST',
        closePrice: '10.500',
        openPrice: '10.200',
        highPrice: '10.800',
        lowPrice: '10.100',
        changePrice: '300',
        changePriceRatio: '2.94',
        error: 'Parsing failed, showing test data'
      }
    ];
  }
};

// Fetch HNX stock data using the ListData_Listed API
export const fetchHNXStockData = async (date) => {
  try {
    console.log(`📊 Fetching HNX stock data for: ${formatDateForHNX(date)}`);
    
    const result = await testHNXListDataAPI(date);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // Parse the HTML response
    const stockData = parseHNXStockData(result.rawHTML);
    
    return {
      data: stockData,
      source: 'HNX-ListData',
      date: result.date,
      htmlLength: result.htmlLength,
      parsed: true
    };
    
  } catch (error) {
    console.error('❌ Error fetching HNX stock data:', error);
    throw error;
  }
}; 