// Sales data storage
let salesData = [];
let orderNumber = 1;
let cartItems = []; // Temporary cart storage
let isXlsxLoaded = false; // Flag to track if SheetJS is loaded

// Menu items with prices
const menuItems = {
  'Cokmelet (Risol Coklat)': 7000,
  'Suwirlisious (Suwir Ayam)': 5000,
  'MayoRolls (Risol Mayo)': 7000,
  'Mozzroll (Risol Mozarella)': 7000,
  'Sayuroll (Risol Sayur)': 5000
};

// Load SheetJS library via CDN
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
script.onload = () => {
  isXlsxLoaded = true;
  console.log('SheetJS loaded successfully');
};
script.onerror = () => {
  console.error('Failed to load SheetJS');
};
document.head.appendChild(script);

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
    // Process cart items as a single order
    if (cartItems.length > 0) {
      const purchaseDate = getFormattedDate();
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      
      cartItems.forEach(cartItem => {
        salesData.push({
          no: orderNumber++,
          date: purchaseDate,
          item: cartItem.item,
          quantity: cartItem.quantity,
          price: cartItem.price,
          total: cartItem.total,
          totalQuantity: totalQuantity
        });
      });
      // Clear cart after checkout
      cartItems = [];
      updateCartDisplay();
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initSalesTracking);

// Expose generateExcel to console for admin use
window.generateSalesReport = generateExcel;
