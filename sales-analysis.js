// Include SheetJS library via CDN
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
document.head.appendChild(script);

// Sales data storage
let salesData = [];
let orderNumber = 1;

// Menu items with prices
const menuItems = {
  'Cokmelet (Risol Coklat)': 7000,
  'Suwirlisious (Suwir Ayam)': 5000,
  'MayoRolls (Risol Mayo)': 7000,
  'Mozzroll (Risol Mozarella)': 7000,
  'Sayuroll (Risol Sayur)': 5000
};

// Function to initialize event listeners
function initSalesTracking() {
  // Add event listeners to all "Tambah ke Keranjang" buttons
  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', function() {
      const menuItem = this.parentElement.querySelector('h3').textContent;
      const quantityElement = this.parentElement.querySelector('.quantity');
      const quantity = parseInt(quantityElement.textContent);
      
      if (quantity > 0) {
        const price = menuItems[menuItem];
        const total = price * quantity;
        
        // Add to sales data
        salesData.push({
          no: orderNumber++,
          item: menuItem,
          price: price,
          total: total
        });
        
        // Update cart display (assuming existing cart functionality)
        updateCartDisplay();
      }
    });
  });
}

// Function to update cart display (minimal, assuming existing functionality)
function updateCartDisplay() {
  const cartItems = document.querySelector('.cart-items');
  const totalElement = document.querySelector('.cart-total');
  let total = 0;
  
  // Clear current cart display
  cartItems.innerHTML = '';
  
  // Group items by name to avoid duplicates
  const groupedItems = salesData.reduce((acc, item) => {
    if (!acc[item.item]) {
      acc[item.item] = { quantity: 0, total: 0 };
    }
    acc[item.item].quantity += 1;
    acc[item.item].total += item.total;
    return acc;
  }, {});
  
  // Update cart UI
  for (const [item, data] of Object.entries(groupedItems)) {
    const li = document.createElement('li');
    li.textContent = `${item} x${data.quantity} - Rp${data.total.toLocaleString('id-ID')}`;
    cartItems.appendChild(li);
    total += data.total;
  }
  
  totalElement.textContent = `Total: Rp${total.toLocaleString('id-ID')}`;
}

// Function to generate Excel file
function generateExcel() {
  // Calculate overall total
  const overallTotal = salesData.reduce((sum, item) => sum + item.total, 0);
  
  // Prepare data for Excel
  const excelData = [
    ['No', 'Item Purchased', 'Price (Rp)', 'Total (Rp)'],
    ...salesData.map(item => [item.no, item.item, item.price, item.total]),
    ['', '', 'Overall Total', overallTotal]
  ];
  
  // Create workbook and worksheet
  const ws = XLSX.utils.aoa_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
  
  // Auto-size columns (approximate)
  const colWidths = [
    { wch: 5 },  // No
    { wch: 30 }, // Item Purchased
    { wch: 15 }, // Price
    { wch: 15 }  // Total
  ];
  ws['!cols'] = colWidths;
  
  // Generate and download Excel file
  XLSX.write(wb, 'Solyum_Sales_Report.xlsx');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initSalesTracking);

// Expose generateExcel to console for admin use
window.generateSalesReport = generateExcel;