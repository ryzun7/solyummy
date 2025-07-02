// Load SheetJS library via CDN
const sheetJsScript = document.createElement('script');
sheetJsScript.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
sheetJsScript.onload = () => {
  isXlsxLoaded = true;
  console.log('SheetJS loaded successfully');
};
sheetJsScript.onerror = () => {
  console.error('Failed to load SheetJS');
};
document.head.appendChild(sheetJsScript);

// Load Firebase SDK via CDN
const firebaseScript = document.createElement('script');
firebaseScript.src = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js';
firebaseScript.onload = () => {
  const databaseScript = document.createElement('script');
  databaseScript.src = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js';
  databaseScript.onload = () => {
    isFirebaseLoaded = true;
    console.log('Firebase loaded successfully');
    initializeFirebase();
  };
  databaseScript.onerror = () => {
    console.error('Failed to load Firebase Database');
  };
  document.head.appendChild(databaseScript);
};
firebaseScript.onerror = () => {
  console.error('Failed to load Firebase App');
};
document.head.appendChild(firebaseScript);

// Sales data storage
let salesData = [];
let orderNumber = 1;
let cartItems = []; // Temporary cart storage
let isXlsxLoaded = false;
let isFirebaseLoaded = false;
let dbRef;

// Menu items with prices
const menuItems = {
  'Cokmelet (Risol Coklat)': 7000,
  'Suwirlisious (Suwir Ayam)': 5000,
  'MayoRolls (Risol Mayo)': 7000,
  'Mozzroll (Risol Mozarella)': 7000,
  'Sayuroll (Risol Sayur)': 5000
};

// Initialize Firebase
function initializeFirebase() {
 const firebaseConfig = {
    apiKey: "AIzaSyDNZMUSfNZDI39VdfTddg3_W72RSPZoayk",
    authDomain: "solyummy.firebaseapp.com",
    databaseURL: "https://solyummy-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "solyummy",
    storageBucket: "solyummy.firebasestorage.app",
    messagingSenderId: "1027707906563",
    appId: "1:1027707906563:web:96edf878ebd5273991bc36",
    measurementId: "G-J5NKYE05ST"
  };
  
  try {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    dbRef = firebase.database().ref('sales');
    
    // Load existing sales data to set orderNumber
    dbRef.once('value', snapshot => {
      const data = snapshot.val();
      if (data) {
        salesData = Object.values(data).filter(item => item.orderNo && !isNaN(item.orderNo) && item.orderNo > 0);
        orderNumber = salesData.length > 0 ? Math.max(...salesData.map(item => item.orderNo)) + 1 : 1;
        if (isNaN(orderNumber) || orderNumber <= 0) {
          console.warn('Invalid orderNo values detected. Resetting orderNumber to 1.');
          orderNumber = 1;
        }
      }
    }, error => {
      console.error('Error loading sales data from Firebase:', error.message);
    });
  } catch (error) {
    console.error('Error initializing Firebase:', error.message);
  }
}

// Function to format date as YYYY-MM-DD
function getFormattedDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Function to format time as HH:MM:SS
function getFormattedTime() {
  const now = new Date();
  return now.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Function to sanitize user input
function sanitizeInput(input) {
  if (!input) return '';
  // Remove control characters and trim
  return input.replace(/[-\u001F\u007F-\u009F]/g, '').trim();
}

// Function to validate sale object
function isValidSale(sale) {
  return (
    typeof sale.orderNo === 'number' && !isNaN(sale.orderNo) && sale.orderNo > 0 &&
    typeof sale.date === 'string' && sale.date !== '' &&
    typeof sale.time === 'string' && sale.time !== '' &&
    typeof sale.userName === 'string' && sale.userName !== '' &&
    typeof sale.item === 'string' && sale.item !== '' &&
    typeof sale.quantity === 'number' && sale.quantity > 0 &&
    typeof sale.price === 'number' && !isNaN(sale.price) &&
    typeof sale.total === 'number' && !isNaN(sale.total) &&
    typeof sale.totalQuantity === 'number' && !isNaN(sale.totalQuantity) &&
    typeof sale.subtotal === 'number' && !isNaN(sale.subtotal)
  );
}

// Function to initialize event listeners
function initSalesTracking() {
  // Add event listeners to all "Tambah ke Keranjang" buttons to update cart
  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', function() {
      const menuItem = this.parentElement.querySelector('h3').textContent;
      const quantityElement = this.parentElement.querySelector('.quantity');
      const quantity = parseInt(quantityElement.textContent);
      
      if (quantity > 0) {
        // Add to temporary cart
        cartItems.push({
          item: menuItem,
          quantity: quantity,
          price: menuItems[menuItem],
          total: menuItems[menuItem] * quantity
        });
        updateCartDisplay();
      }
    });
  });

  // Add event listener to "Checkout via WhatsApp" button
  document.querySelector('.checkout-btn').addEventListener('click', function(event) {
    if (cartItems.length === 0) {
      alert('Keranjang kosong. Silakan tambahkan item terlebih dahulu.');
      return;
    }
    
    // Prompt for user name
    const userName = prompt('Masukkan nama Anda untuk checkout:');
    const sanitizedUserName = sanitizeInput(userName);
    if (!sanitizedUserName) {
      alert('Nama diperlukan untuk melanjutkan checkout.');
      return;
    }

    if (isFirebaseLoaded && dbRef) {
      const purchaseDate = getFormattedDate();
      const purchaseTime = getFormattedTime();
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
      const currentOrderNo = orderNumber++;
      
      // Validate orderNo
      if (isNaN(currentOrderNo) || currentOrderNo <= 0) {
        console.error('Invalid orderNo:', currentOrderNo);
        alert('Gagal menghasilkan nomor pesanan. Silakan coba lagi.');
        return;
      }

      cartItems.forEach(cartItem => {
        const sale = {
          orderNo: currentOrderNo,
          date: purchaseDate,
          time: purchaseTime,
          userName: sanitizedUserName,
          item: cartItem.item,
          quantity: cartItem.quantity,
          price: cartItem.price,
          total: cartItem.total,
          totalQuantity: totalQuantity,
          subtotal: subtotal
        };
        
        // Validate sale object
        if (!isValidSale(sale)) {
          console.error('Invalid sale data:', sale);
          alert('Data pembelian tidak valid. Silakan coba lagi.');
          return;
        }

        // Push to Firebase
        dbRef.push(sale, error => {
          if (error) {
            console.error('Error saving sale to Firebase:', error.message);
            alert('Gagal menyimpan data pembelian. Silakan coba lagi.');
          } else {
            salesData.push(sale);
          }
        });
      });
      // Clear cart after checkout
      cartItems = [];
      updateCartDisplay();
    } else {
      console.error('Firebase not loaded or database reference not initialized.');
      alert('Gagal terhubung ke database. Silakan coba lagi nanti.');
    }
  });
}

// Function to update cart display
function updateCartDisplay() {
  const cartItemsElement = document.querySelector('.cart-items');
  const totalElement = document.querySelector('.cart-total');
  let total = 0;
  
  // Clear current cart display
  cartItemsElement.innerHTML = '';
  
  // Group items by name to avoid duplicates
  const groupedItems = cartItems.reduce((acc, item) => {
    if (!acc[item.item]) {
      acc[item.item] = { quantity: 0, total: 0 };
    }
    acc[item.item].quantity += item.quantity;
    acc[item.item].total += item.total;
    return acc;
  }, {});
  
  // Update cart UI
  for (const [item, data] of Object.entries(groupedItems)) {
    const li = document.createElement('li');
    li.textContent = `${item} x${data.quantity} - Rp${data.total.toLocaleString('id-ID')}`;
    cartItemsElement.appendChild(li);
    total += data.total;
  }
  
  totalElement.textContent = `Total: Rp${total.toLocaleString('id-ID')}`;
}

// Function to generate Excel file
function generateExcel() {
  if (!isXlsxLoaded || typeof XLSX === 'undefined') {
    console.error('SheetJS library not loaded. Please try again later.');
    alert('Gagal menghasilkan laporan Excel. Silakan coba lagi nanti.');
    return;
  }
  if (!isFirebaseLoaded || !dbRef) {
    console.error('Firebase not loaded or database reference not initialized.');
    alert('Gagal terhubung ke database. Silakan coba lagi nanti.');
    return;
  }

  // Fetch all sales data from Firebase
  dbRef.once('value', snapshot => {
    const data = snapshot.val();
    salesData = data ? Object.values(data).filter(item => item.orderNo && !isNaN(item.orderNo) && item.orderNo > 0) : [];

    // Group sales by orderNo for Excel display
    const groupedSales = salesData.reduce((acc, item) => {
      if (!acc[item.orderNo]) {
        acc[item.orderNo] = {
          orderNo: item.orderNo,
          date: item.date,
          time: item.time,
          userName: item.userName || 'Unknown',
          subtotal: item.subtotal || 0,
          items: [],
          totalQuantity: item.totalQuantity
        };
      }
      acc[item.orderNo].items.push({
        item: item.item,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      });
      return acc;
    }, {});

    // Prepare data for Excel
    const excelData = [
      ['No', 'Date of Purchase', 'Time of Purchase', 'User Name', 'Item Purchased', 'Quantity', 'Price (Rp)', 'Total (Rp)', 'Subtotal (Rp)', 'Total Quantity']
    ];

    Object.values(groupedSales).forEach(order => {
      order.items.forEach((item, index) => {
        excelData.push([
          index === 0 ? order.orderNo : '', // Only show orderNo for first item
          index === 0 ? order.date : '',
          index === 0 ? order.time : '',
          index === 0 ? order.userName : '',
          item.item,
          item.quantity,
          item.price,
          item.total,
          index === 0 ? order.subtotal : '', // Only show subtotal for first item
          index === 0 ? order.totalQuantity : ''
        ]);
      });
    });

    // Calculate overall total and daily totals
    const overallTotal = salesData.reduce((sum, item) => sum + (item.total || 0), 0);
    const dailyTotals = salesData.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = { total: 0, quantity: 0 };
      }
      acc[item.date].total += item.total || 0;
      acc[item.date].quantity += item.quantity || 0;
      return acc;
    }, {});

    // Add daily totals and overall total
    excelData.push(
      [], // Empty row
      ['Daily Totals'],
      ['Date', 'Total Quantity', 'Total Purchase (Rp)'],
      ...Object.entries(dailyTotals).map(([date, data]) => [date, data.quantity, data.total]),
      [], // Empty row
      ['', '', '', '', '', '', '', '', 'Overall Total Purchase (Rp)', overallTotal]
    );
    
    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
    
    // Auto-size columns (approximate)
    const colWidths = [
      { wch: 5 },   // No
      { wch: 15 },  // Date of Purchase
      { wch: 12 },  // Time of Purchase
      { wch: 20 },  // User Name
      { wch: 30 },  // Item Purchased
      { wch: 10 },  // Quantity
      { wch: 15 },  // Price
      { wch: 15 },  // Total
      { wch: 15 },  // Subtotal
      { wch: 15 }   // Total Quantity
    ];
    ws['!cols'] = colWidths;
    
    // Generate and download Excel file
    XLSX.writeFile(wb, 'Solyum_Sales_Report.xlsx');
  }, error => {
    console.error('Error fetching sales data from Firebase:', error.message);
    alert('Gagal mengambil data penjualan dari database. Silakan coba lagi.');
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initSalesTracking);

// Expose generateExcel to console for admin use
window.generateSalesReport = generateExcel;
