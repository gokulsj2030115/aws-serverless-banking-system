/* js/withdraw.js - Fund withdrawal management */

let accounts = [];

document.addEventListener("DOMContentLoaded", () => {
  if (window.ApiClient) {
    initializeWithdrawPage();
  }
});

// Setup form and select elements
async function initializeWithdrawPage() {
  const select = document.getElementById("withdrawAccountSelect");
  const form = document.getElementById("withdrawForm");
  const amountInput = document.getElementById("withdrawAmount");
  
  if (!select || !form || !amountInput) return;
  
  // 1. Fetch available accounts
  try {
    const data = await window.ApiClient.getAccounts();
    accounts = Array.isArray(data) ? data : (data.accounts || data.data || []);
    
    accounts.forEach(acc => {
      const accId = acc.id || acc.accountId || acc.account_id;
      const accName = acc.customer_name || acc.name || "N/A";
      const option = document.createElement("option");
      option.value = accId;
      option.textContent = `${accName} (ID: ${accId} - ${window.formatCurrency(acc.balance)})`;
      select.appendChild(option);
    });
    
    // 2. Read query parameter if redirected from accounts page
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedId = urlParams.get("accountId");
    
    if (preselectedId) {
      select.value = preselectedId;
      updateAccountDisplay(preselectedId);
    }
    
  } catch (error) {
    console.error("Failed to load accounts for withdrawal dropdown:", error);
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
    
    const accountId = select.value;
    const amountVal = parseFloat(amountInput.value);
    
    if (!form.checkValidity()) {
      return;
    }
    
    const selectedAcc = accounts.find(a => String(a.id || a.accountId || a.account_id) === String(accountId));
    
    // Client-side balance check (overdraft prevention)
    if (selectedAcc && amountVal > parseFloat(selectedAcc.balance)) {
      amountInput.setCustomValidity("insufficient");
      const feedback = document.getElementById("withdrawAmountFeedback");
      if (feedback) {
        feedback.textContent = `Insufficient funds. Available balance is ${window.formatCurrency(selectedAcc.balance)}.`;
      }
      
      form.classList.add("was-validated");
      return;
    } else {
      amountInput.setCustomValidity(""); // Clear custom validation error
    }
    
    const clientName = selectedAcc ? (selectedAcc.customer_name || selectedAcc.name) : "Account";
    
    try {
      // Post withdraw operation
      await window.ApiClient.withdraw(accountId, amountVal);
      
      if (typeof window.showToast === 'function') {
        window.showToast(`Withdrawal of ${window.formatCurrency(amountVal)} successfully posted from "${clientName}"!`, "success");
      }
      
      form.reset();
      form.classList.remove("was-validated");
      document.getElementById("accountInfoPanel").classList.add("d-none");
      
      // Redirect back to accounts overview
      setTimeout(() => {
        window.location.href = "accounts.html";
      }, 1500);
      
    } catch (error) {
      console.error("Withdraw post failed:", error);
    }
  });
  
  // Clear custom validation error when typing
  amountInput.addEventListener("input", () => {
    amountInput.setCustomValidity("");
    const feedback = document.getElementById("withdrawAmountFeedback");
    if (feedback) {
      feedback.textContent = "Please specify a withdrawal amount of at least $0.01.";
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
