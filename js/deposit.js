/* js/deposit.js - Fund deposit management */

let accounts = [];

document.addEventListener("DOMContentLoaded", () => {
  if (window.ApiClient) {
    initializeDepositPage();
  }
});

// Setup form and select options
async function initializeDepositPage() {
  const select = document.getElementById("depositAccountSelect");
  const form = document.getElementById("depositForm");
  
  if (!select || !form) return;
  
  // 1. Fetch available accounts
  try {
    const data = await window.ApiClient.getAccounts();
    accounts = Array.isArray(data) ? data : (data.accounts || data.data || []);
    
    // Populate select element dropdown options
    accounts.forEach(acc => {
      const accId = acc.id || acc.accountId || acc.account_id;
      const accName = acc.customer_name || acc.name || "N/A";
      const option = document.createElement("option");
      option.value = accId;
      option.textContent = `${accName} (ID: ${accId} - ${window.formatCurrency(acc.balance)})`;
      select.appendChild(option);
    });
    
    // 2. Read query parameter if redirected from Accounts view
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedId = urlParams.get("accountId");
    
    if (preselectedId) {
      select.value = preselectedId;
      updateAccountDisplay(preselectedId);
    }
    
  } catch (error) {
    console.error("Failed to load accounts list for deposit dropdown:", error);
  }
  
  // 3. Bind Select change event to update balance panel
  select.addEventListener("change", (e) => {
    updateAccountDisplay(e.target.value);
  });
  
  // 4. Bind Form Submit Action
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    form.classList.add("was-validated");
    
    if (!form.checkValidity()) {
      return;
    }
    
    const accountId = select.value;
    const amount = document.getElementById("depositAmount").value;
    const selectedAcc = accounts.find(a => String(a.id || a.accountId || a.account_id) === String(accountId));
    const clientName = selectedAcc ? (selectedAcc.customer_name || selectedAcc.name) : "Account";
    
    try {
      // Post deposit operation
      const response = await window.ApiClient.deposit(accountId, amount);
      
      if (typeof window.showToast === 'function') {
        window.showToast(`Deposit of ${window.formatCurrency(amount)} successfully posted to "${clientName}"!`, "success");
      }
      
      form.reset();
      form.classList.remove("was-validated");
      document.getElementById("accountInfoPanel").classList.add("d-none");
      
      // Redirect back to accounts overview
      setTimeout(() => {
        window.location.href = "accounts.html";
      }, 1500);
      
    } catch (error) {
      console.error("Deposit post failed:", error);
    }
  });
}

// Update the balance display card based on selection
function updateAccountDisplay(accountId) {
  const panel = document.getElementById("accountInfoPanel");
  const nameLabel = document.getElementById("accountNameLabel");
  const balanceLabel = document.getElementById("accountBalanceLabel");
  
  const acc = accounts.find(a => String(a.id || a.accountId || a.account_id) === String(accountId));
  
  if (acc && panel && nameLabel && balanceLabel) {
    nameLabel.textContent = acc.customer_name || acc.name || "N/A";
    balanceLabel.textContent = window.formatCurrency(acc.balance || 0);
    
    panel.classList.remove("d-none");
  } else if (panel) {
    panel.classList.add("d-none");
  }
}
