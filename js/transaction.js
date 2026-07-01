/* js/transaction.js - Transaction ledger, searching and CSV export */

let transactions = [];
let filteredTransactions = [];
let currentPage = 1;
const pageSize = 10;

document.addEventListener("DOMContentLoaded", () => {
  if (window.ApiClient) {
    loadTransactionHistory();
    
    // Bind Controls
    const searchInput = document.getElementById("txnSearchQuery");
    const typeFilter = document.getElementById("txnTypeFilter");
    const sortSelect = document.getElementById("txnSortBy");
    const exportBtn = document.getElementById("exportCsvBtn");
    
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        currentPage = 1;
        applyFiltersAndSort();
      });
    }
    
    if (typeFilter) {
      typeFilter.addEventListener("change", () => {
        currentPage = 1;
        applyFiltersAndSort();
      });
    }
    
    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        applyFiltersAndSort();
      });
    }
    
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        exportToCsv();
      });
    }
  }
});

// Robust helper to parse PostgreSQL/ISO date formats safely across all browsers
function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  if (dateStr instanceof Date) return dateStr;
  
  let cleaned = String(dateStr).trim();
  // Check if date contains spaces (like PostgreSQL "2026-06-30 12:14:43") and convert to 'T' for ISO compatibility
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(cleaned)) {
    cleaned = cleaned.replace(' ', 'T');
  }
  
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) {
    console.warn("[parseDate] Failed to parse date string, returning Unix Epoch:", dateStr);
    return new Date(0);
  }
  return d;
}

// Fetch transaction logs from API Gateway (Consolidates logs across all active accounts)
async function loadTransactionHistory() {
  const tableBody = document.getElementById("txnTableBody");
  
  try {
    // 1. Fetch all accounts
    const accountsData = await window.ApiClient.getAccounts();
    const accounts = Array.isArray(accountsData) ? accountsData : (accountsData.accounts || accountsData.data || []);
    
    if (accounts.length === 0) {
      transactions = [];
      applyFiltersAndSort();
      return;
    }
    
    // 2. Fetch transactions for each account in parallel
    const txnPromises = accounts.map(acc => {
      const accId = acc.account_id || acc.id || acc.accountId;
      return window.ApiClient.getTransactions(accId)
        .then(data => {
          const list = Array.isArray(data) ? data : (data.transactions || data.data || []);
          
          // Inject account details for display mapping
          return list.map(t => ({
            ...t,
            accountId: accId,
            customerName: acc.customer_name || acc.name || "N/A"
          }));
        })
        .catch(err => {
          console.warn(`Could not fetch transactions for account ${accId}:`, err);
          return [];
        });
    });
    
    const results = await Promise.all(txnPromises);
    transactions = results.flat();
    
    applyFiltersAndSort();
    
  } catch (error) {
    console.error("Failed to load transactions history:", error);
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-danger py-4">
            <i class="fas fa-exclamation-triangle fs-4 mb-2 d-block"></i>
            <div>Error fetching transactions from AWS API. Verify CORS policies and connection settings.</div>
          </td>
        </tr>
      `;
    }
  }
}

// Filter and sort transactions array
function applyFiltersAndSort() {
  const searchInput = document.getElementById("txnSearchQuery");
  const typeFilter = document.getElementById("txnTypeFilter");
  
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const type = typeFilter ? typeFilter.value : "all";
  
  // 1. Filter mapping properties
  filteredTransactions = transactions.filter(txn => {
    const txnId = String(txn.transaction_id || txn.transactionId || txn.id || "").toLowerCase();
    const accRef = String(txn.accountId || txn.fromAccountId || txn.toAccountId || txn.account_id || txn.from_account || txn.to_account || "").toLowerCase();
    const customer = String(txn.customerName || "").toLowerCase();
    
    const rawType = (txn.transaction_type || txn.type || "").toUpperCase();
    let txnType = "";
    if (rawType === "DEPOSIT") txnType = "deposit";
    else if (rawType === "WITHDRAW" || rawType === "WITHDRAWAL") txnType = "withdrawal";
    else if (rawType === "TRANSFER") txnType = "transfer";
    
    const matchesSearch = txnId.includes(query) || accRef.includes(query) || customer.includes(query);
    const matchesType = type === "all" || txnType === type;
    
    return matchesSearch && matchesType;
  });
  
  // Update total counts
  const totalBadge = document.getElementById("txnTotalCountBadge");
  if (totalBadge) {
    totalBadge.textContent = `${filteredTransactions.length} Total Operations`;
  }
  
  // 2. Sort Selection
  const sortSelect = document.getElementById("txnSortBy");
  const sortBy = sortSelect ? sortSelect.value : "date_desc";
  
  filteredTransactions.sort((a, b) => {
    const timeA = parseDate(a.timestamp || a.created_at || a.date || 0).getTime();
    const timeB = parseDate(b.timestamp || b.created_at || b.date || 0).getTime();
    const amtA = parseFloat(a.amount || 0);
    const amtB = parseFloat(b.amount || 0);
    
    switch (sortBy) {
      case "date_desc":
        return timeB - timeA;
      case "date_asc":
        return timeA - timeB;
      case "amount_desc":
        return amtB - amtA;
      case "amount_asc":
        return amtA - amtB;
      default:
        return timeB - timeA;
    }
  });
  
  // 3. Render Table
  renderLedgerTable();
}

// Render dynamic rows
function renderLedgerTable() {
  const tableBody = document.getElementById("txnTableBody");
  if (!tableBody) return;
  
  if (filteredTransactions.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-secondary py-4">
          <i class="fas fa-history fs-4 mb-2 d-block text-secondary-50"></i>
          <div>No transactions found.</div>
        </td>
      </tr>
    `;
    updatePaginationControls(0);
    return;
  }
  
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredTransactions.length);
  const paginatedData = filteredTransactions.slice(startIndex, endIndex);
  
  let html = "";
  paginatedData.forEach(txn => {
    const txnId = String(txn.transaction_id || txn.transactionId || txn.id || "");
    const rawType = (txn.transaction_type || txn.type || "deposit").toUpperCase();
    const amount = parseFloat(txn.amount || 0);
    const timestamp = txn.timestamp || txn.created_at || txn.date;
    
    // Display transfer details or singular account
    let accRef = "";
    if (txn.from_account || txn.to_account) {
      accRef = `<div class="fs-7 text-truncate" style="max-width: 200px;">
        <span class="text-danger-emphasis">${txn.from_account || "N/A"}</span>
        <i class="fas fa-long-arrow-alt-right mx-1 text-secondary"></i>
        <span class="text-success-emphasis">${txn.to_account || "N/A"}</span>
      </div>`;
    } else {
      const singleId = txn.accountId || txn.account_id || "N/A";
      const name = txn.customerName || "N/A";
      accRef = `<div style="max-width: 220px;">
        <span class="font-monospace text-secondary fs-7 d-block text-truncate">${singleId}</span>
        <span class="text-muted d-block text-truncate" style="font-size: 0.75rem;">${name}</span>
      </div>`;
    }
    
    // Format Type Badge
    let badgeClass = "badge-deposit";
    let typeName = "Deposit";
    if (rawType === "WITHDRAW" || rawType === "WITHDRAWAL") {
      badgeClass = "badge-withdrawal";
      typeName = "Withdrawal";
    } else if (rawType === "TRANSFER") {
      badgeClass = "badge-transfer";
      typeName = "Transfer";
    }
    
    const displayId = txnId.length > 8 ? `${txnId.substring(0, 8)}...` : txnId;
    
    html += `
      <tr class="align-middle">
        <td class="font-monospace text-secondary fs-7" title="${txnId}">${displayId}</td>
        <td>${accRef}</td>
        <td>
          <span class="badge ${badgeClass} px-3 py-2 rounded-pill fs-7">${typeName}</span>
        </td>
        <td class="fw-bold">${window.formatCurrency(amount)}</td>
        <td class="text-secondary fs-7">${window.formatDate(timestamp)}</td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
  updatePaginationControls(filteredTransactions.length, startIndex, endIndex);
}

// Update Pagination DOM
function updatePaginationControls(totalItems, start = 0, end = 0) {
  const info = document.getElementById("txnPaginationInfo");
  const controls = document.getElementById("txnPaginationControls");
  
  if (info) {
    if (totalItems === 0) {
      info.textContent = "Showing 0 to 0 of 0 transactions";
    } else {
      info.textContent = `Showing ${start + 1} to ${end} of ${totalItems} transactions`;
    }
  }
  
  if (controls) {
    const totalPages = Math.ceil(totalItems / pageSize);
    let html = "";
    
    html += `
      <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changeTxnPage(${currentPage - 1}); return false;">Previous</a>
      </li>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
      html += `
        <li class="page-item ${currentPage === i ? 'active' : ''}">
          <a class="page-link" href="#" onclick="changeTxnPage(${i}); return false;">${i}</a>
        </li>
      `;
    }
    
    html += `
      <li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changeTxnPage(${currentPage + 1}); return false;">Next</a>
      </li>
    `;
    
    controls.innerHTML = html;
  }
}

window.changeTxnPage = function(page) {
  currentPage = page;
  renderLedgerTable();
};

// Export CSV file downloader
function exportToCsv() {
  if (filteredTransactions.length === 0) {
    if (typeof window.showToast === 'function') {
      window.showToast("No transaction records available to export.", "danger");
    }
    return;
  }
  
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Headers
  csvContent += "Transaction ID,Account Ref,Type,Amount,Timestamp\r\n";
  
  filteredTransactions.forEach(txn => {
    const txnId = txn.transaction_id || txn.transactionId || txn.id || "N/A";
    const amount = txn.amount || 0;
    const rawType = (txn.transaction_type || txn.type || "deposit").toUpperCase();
    const timestamp = txn.timestamp || txn.created_at || "N/A";
    
    let accRef = "";
    if (txn.from_account || txn.to_account) {
      accRef = `${txn.from_account} -> ${txn.to_account}`;
    } else {
      accRef = txn.accountId || txn.account_id || "N/A";
    }
    
    let typeName = "Deposit";
    if (rawType === "WITHDRAW" || rawType === "WITHDRAWAL") {
      typeName = "Withdrawal";
    } else if (rawType === "TRANSFER") {
      typeName = "Transfer";
    }
    
    csvContent += `"${txnId}","${accRef}","${typeName}","${amount}","${timestamp}"\r\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `banking_transactions_${timestamp}.csv`);
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
  
  if (typeof window.showToast === 'function') {
    window.showToast("CSV file exported successfully!", "success");
  }
}
