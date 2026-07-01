/* js/accounts.js - Accounts management and list pagination */

let allAccounts = [];
let filteredAccounts = [];
let currentPage = 1;
const pageSize = 5;

document.addEventListener("DOMContentLoaded", () => {
  if (window.ApiClient) {
    loadAccountsList();
    
    // Bind Filter Controls
    const searchInput = document.getElementById("searchQuery");
    const sortSelect = document.getElementById("sortBy");
    const resetBtn = document.getElementById("resetFilters");
    
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        currentPage = 1;
        applyFiltersAndSort();
      });
    }
    
    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        applyFiltersAndSort();
      });
    }
    
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (sortSelect) sortSelect.value = "balance_desc";
        currentPage = 1;
        applyFiltersAndSort();
      });
    }
  }
});

// Fetch active accounts from AWS API Gateway
async function loadAccountsList() {
  const tableBody = document.getElementById("accountsTableBody");
  
  try {
    const data = await window.ApiClient.getAccounts();
    
    // Accept array directly or nested in an object wrapper
    allAccounts = Array.isArray(data) ? data : (data.accounts || data.data || []);
    
    applyFiltersAndSort();
    
  } catch (error) {
    console.error("Failed to load accounts:", error);
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-danger py-4">
            <i class="fas fa-exclamation-triangle fs-4 mb-2 d-block"></i>
            <div>Error fetching account records from AWS API. Verify CORS policies and API Endpoint settings.</div>
          </td>
        </tr>
      `;
    }
  }
}

// Filter and sort client-side array
function applyFiltersAndSort() {
  const searchInput = document.getElementById("searchQuery");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  
  // 1. Search Query Filter mapping custom properties
  filteredAccounts = allAccounts.filter(acc => {
    const name = (acc.customer_name || acc.name || "").toLowerCase();
    const email = (acc.email || "").toLowerCase();
    const id = String(acc.id || acc.accountId || acc.account_id || "").toLowerCase();
    return name.includes(query) || email.includes(query) || id.includes(query);
  });
  
  // Update totals count badge
  const countBadge = document.getElementById("accountsCountBadge");
  if (countBadge) {
    countBadge.textContent = `${filteredAccounts.length} Total Accounts`;
  }
  
  // 2. Sort Select Choice
  const sortSelect = document.getElementById("sortBy");
  const sortBy = sortSelect ? sortSelect.value : "balance_desc";
  
  filteredAccounts.sort((a, b) => {
    const balA = parseFloat(a.balance || 0);
    const balB = parseFloat(b.balance || 0);
    const nameA = (a.customer_name || a.name || "").toLowerCase();
    const nameB = (b.customer_name || b.name || "").toLowerCase();
    
    switch (sortBy) {
      case "balance_desc":
        return balB - balA;
      case "balance_asc":
        return balA - balB;
      case "name_asc":
        return nameA.localeCompare(nameB);
      case "name_desc":
        return nameB.localeCompare(nameA);
      default:
        return balB - balA;
    }
  });
  
  // 3. Render Paginated Table
  renderAccountsTable();
}

// Render dynamic rows with pagination controls
function renderAccountsTable() {
  const tableBody = document.getElementById("accountsTableBody");
  if (!tableBody) return;
  
  if (filteredAccounts.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-secondary py-4">
          <i class="fas fa-search fs-4 mb-2 d-block text-secondary-50"></i>
          <div>No accounts match your query filter.</div>
        </td>
      </tr>
    `;
    updatePaginationControls(0);
    return;
  }
  
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredAccounts.length);
  const paginatedData = filteredAccounts.slice(startIndex, endIndex);
  
  let html = "";
  paginatedData.forEach(acc => {
    const accId = acc.id || acc.accountId || acc.account_id;
    const accName = acc.customer_name || acc.name || "N/A";
    const balance = parseFloat(acc.balance || 0);
    const email = acc.email || "N/A";
    
    html += `
      <tr class="align-middle">
        <td class="font-monospace text-secondary fs-7 text-break">${accId}</td>
        <td>
          <div class="fw-semibold">${accName}</div>
        </td>
        <td>${email}</td>
        <td class="fw-bold text-success">${window.formatCurrency(balance)}</td>
        <td>
          <div class="d-flex justify-content-center gap-1">
            <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="viewAccountDetails('${accId}')">
              <i class="fas fa-eye me-1"></i>View
            </button>
            <a href="deposit.html?accountId=${accId}" class="btn btn-sm btn-success rounded-pill px-3">
              <i class="fas fa-arrow-down me-1"></i>Dep
            </a>
            <a href="withdraw.html?accountId=${accId}" class="btn btn-sm btn-danger rounded-pill px-3">
              <i class="fas fa-arrow-up me-1"></i>With
            </a>
            <button class="btn btn-sm btn-outline-danger rounded-circle" style="width:30px; height:30px; padding:0; display:inline-flex; align-items:center; justify-content:center;" onclick="confirmDeleteAccount('${accId}', '${accName.replace(/'/g, "\\'")}')" title="Delete Account">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
  updatePaginationControls(filteredAccounts.length, startIndex, endIndex);
}

// Update Pagination DOM
function updatePaginationControls(totalItems, start = 0, end = 0) {
  const info = document.getElementById("paginationInfo");
  const controls = document.getElementById("paginationControls");
  
  if (info) {
    if (totalItems === 0) {
      info.textContent = "Showing 0 to 0 of 0 accounts";
    } else {
      info.textContent = `Showing ${start + 1} to ${end} of ${totalItems} accounts`;
    }
  }
  
  if (controls) {
    const totalPages = Math.ceil(totalItems / pageSize);
    let html = "";
    
    // Prev Button
    html += `
      <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">Previous</a>
      </li>
    `;
    
    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
      html += `
        <li class="page-item ${currentPage === i ? 'active' : ''}">
          <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
        </li>
      `;
    }
    
    // Next Button
    html += `
      <li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">Next</a>
      </li>
    `;
    
    controls.innerHTML = html;
  }
}

// Change active pagination page
window.changePage = function(page) {
  currentPage = page;
  renderAccountsTable();
};

// View Details Modal Trigger
window.viewAccountDetails = function(accountId) {
  const acc = allAccounts.find(a => String(a.id || a.accountId || a.account_id) === String(accountId));
  if (!acc) return;
  
  const accName = acc.customer_name || acc.name || "N/A";
  
  // Set modal text
  document.getElementById("modalName").textContent = accName;
  document.getElementById("modalEmail").textContent = acc.email || "N/A";
  document.getElementById("modalAccountId").textContent = accountId;
  document.getElementById("modalBalance").textContent = window.formatCurrency(acc.balance || 0);
  document.getElementById("modalCreatedAt").textContent = window.formatDate(acc.createdAt || acc.created_at);
  
  // Dynamic Initial avatar
  const initials = accName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  document.getElementById("modalAvatar").textContent = initials;
  
  // Dynamic links for buttons inside modal
  document.getElementById("modalDepositLink").setAttribute("href", `deposit.html?accountId=${accountId}`);
  document.getElementById("modalWithdrawLink").setAttribute("href", `withdraw.html?accountId=${accountId}`);
  
  // Show Bootstrap Modal
  const modalEl = document.getElementById("accountDetailsModal");
  if (modalEl && window.bootstrap) {
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
  }
};

// Delete account function
window.confirmDeleteAccount = async function(accountId, name) {
  const confirmed = confirm(`Are you absolutely sure you want to delete the account for "${name}"?\nThis action cannot be undone.`);
  if (!confirmed) return;
  
  try {
    await window.ApiClient.deleteAccount(accountId);
    
    if (typeof window.showToast === 'function') {
      window.showToast(`Account for ${name} has been deleted successfully.`, "success");
    }
    
    // Refresh Account List
    loadAccountsList();
  } catch (error) {
    console.error("Delete account failed:", error);
  }
};
