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
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  dbRef = firebase.database().ref('sales');
  
  // Load existing sales data to set orderNumber
  dbRef.once('value', snapshot => {
    const data = snapshot.val();
    if (data) {
      salesData = Object.values(data);
      orderNumber = salesData.length > 0 ? Math.max(...salesData.map(item => item.no)) + 1 : 1;
    }
  });
}

// Function to format date as YYYY-MM-DD
function getFormattedDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
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
  document.querySelector('.checkout-btn').addEventListener('click', function() {
    if (cartItems.length > 0 && isFirebaseLoaded && dbRef) {
      const purchaseDate = getFormattedDate();
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      
      cartItems.forEach(cartItem => {
        const sale = {
          no: orderNumber++,
          date: purchaseDate,
          item: cartItem.item,
          quantity: cartItem.quantity,
          price: cartItem.price,
          total: cartItem.total,
          totalQuantity: totalQuantity
        };
        // Push to Firebase
        dbRef.push(sale);
        salesData.push(sale);
      });
      // Clear cart after checkout
      cartItems = [];
      updateCartDisplay();
    } else if (!isFirebaseLoaded) {
      console.error('Firebase not loaded. Cannot save sales data.');
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
    return;
  }
  if (!isFirebaseLoaded || !dbRef) {
    console.error('Firebase not loaded. Please try again later.');
    return;
  }

  // Fetch all sales data from Firebase
  dbRef.once('value', snapshot => {
    const data = snapshot.val();
    salesData = data ? Object.values(data) : [];

    // Calculate overall total and daily totals
    const overallTotal = salesData.reduce((sum, item) => sum + item.total, 0);
    const dailyTotals = salesData.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = { total: 0, quantity: 0 };
      }
      acc[item.date].total += item.total;
      acc[item.date].quantity += item.quantity;
      return acc;
    }, {});

    // Prepare data for Excel
    const excelData = [
      ['No', 'Date of Purchase', 'Item Purchased', 'Quantity', 'Price (Rp)', 'Total (Rp)', 'Total Quantity'],
      ...salesData.map(item => [
        item.no,
        item.date,
        item.item,
        item.quantity,
        item.price,
        item.total,
        item.totalQuantity
      ]),
      [], // Empty row for separation
      ['Daily Totals'],
      ['Date', 'Total Quantity', 'Total Purchase (Rp)'],
      ...Object.entries(dailyTotals).map(([date, data]) => [date, data.quantity, data.total]),
      [], // Empty row for separation
      ['', '', '', '', '', 'Overall Total Purchase (Rp)', overallTotal]
    ];
    
    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
    
    // Auto-size columns (approximate)
    const colWidths = [
      { wch: 5 },   // No
      { wch: 15 },  // Date of Purchase
      { wch: 30 },  // Item Purchased
      { wch: 10 },  // Quantity
      { wch: 15 },  // Price
      { wch: 15 },  // Total
      { wch: 15 }   // Total Quantity
    ];
    ws['!cols'] = colWidths;
    
    // Generate and download Excel file
    XLSX.writeFile(wb, 'Solyum_Sales_Report.xlsx');
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initSalesTracking);

// Expose generateExcel to console for admin use
window.generateSalesReport = generateExcel;
