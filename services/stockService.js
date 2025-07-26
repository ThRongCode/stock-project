import { fetchHNXStockData, formatDateForHNX } from './hnxService';

// Stock service that supports multiple exchanges
export const fetchStockData = async (date, exchange = 'HSX') => {
  try {
    if (exchange === 'HNX') {
      return await fetchHNXStockData(date);
    } else {
      // Default to HSX
      return await fetchHSXStockData(date);
    }
  } catch (error) {
    console.error(`Error fetching ${exchange} stock data:`, error);
    throw error;
  }
};

// Fetch HSX company information (stock codes and names)
export const fetchHSXCompanyInfo = async () => {
  try {
    const url = 'https://api.hsx.vn/l/api/v1/1/securities/stock?pageIndex=1&pageSize=1000&code=&alphabet=&sectorId=';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Access-Control-Allow-Origin': '*',
        'Origin': 'https://www.hsx.vn',
        'Referer': 'https://www.hsx.vn/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'type': 'HJ2HNS3SKICV4FNE'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Create a mapping of stock code to company info
    const companyMap = {};
    let dataArray = [];
    
    // Try different possible data locations - fix for HSX API structure
    if (data.data && data.data.list && Array.isArray(data.data.list)) {
      dataArray = data.data.list;
    } else if (data.data && Array.isArray(data.data)) {
      dataArray = data.data;
    } else if (data.items && Array.isArray(data.items)) {
      dataArray = data.items;
    } else if (data.result && Array.isArray(data.result)) {
      dataArray = data.result;
    } else if (Array.isArray(data)) {
      dataArray = data;
    }

    dataArray.forEach((company, index) => {
      if (company && typeof company === 'object') {
        // Use the correct field names from HSX API
        const code = company.code || company.symbol || company.stockCode || company.securityCode;
        
        if (code) {
          companyMap[code] = {
            code: code,
            name: company.brief || company.name || code, // Use brief (English) as primary, fallback to name (Vietnamese)
            fullName: company.name || company.brief || code, // Vietnamese full name
            briefName: company.brief || '',
            displayText: company.displayText || '',
            sector: company.sector || company.sectorName || '',
            industry: company.industry || company.industryName || ''
          };
          
          // Debug MSB specifically
          if (code === 'MSB') {
            console.log('🔍 MSB found in API response:', {
              rawCompany: company,
              mappedData: companyMap[code]
            });
          }
        }
      }
    });

    // Check if MSB was found in the results
    if (!companyMap['MSB']) {
      console.log('🔍 MSB debugging - searching all company objects for MSB:');
      const msbResults = dataArray.filter(company => 
        (company.code && company.code.includes('MSB')) ||
        (company.name && company.name.toLowerCase().includes('msb')) ||
        (company.brief && company.brief.toLowerCase().includes('msb'))
      );
      console.log('🔍 Companies containing "MSB":', msbResults);
    }

    return {
      success: true,
      companyMap,
      totalCompanies: Object.keys(companyMap).length,
      rawData: data
    };

  } catch (error) {
    console.error('🏢 Error fetching HSX company info:', error);
    return {
      success: false,
      error: error.message,
      companyMap: {}
    };
  }
};

// HSX API calls (original implementation)
export const fetchHSXStockData = async (date) => {
  try {
    const url = `https://api.hsx.vn/mk/api/v1/market/quote-report?tradingBy=VNINDEX&date=${date}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching HSX stock data:', error);
    throw error;
  }
};

export const formatDateForAPI = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const calculatePercentageChange = (startPrice, endPrice) => {
  if (!startPrice || !endPrice || parseFloat(startPrice) === 0) return 0;
  const change = ((parseFloat(endPrice) - parseFloat(startPrice)) / parseFloat(startPrice)) * 100;
  return change.toFixed(2);
}; 