/* js/transfer.js - Inter-account transfer manager */

let accounts = [];

document.addEventListener("DOMContentLoaded", () => {
  if (window.ApiClient) {
    initializeTransferPage();
  }
});

// Setup form and select elements
async function initializeTransferPage() {
  const fromSelect = document.getElementById("fromAccountSelect");
  const toSelect = document.getElementById("toAccountSelect");
  const form = document.getElementById("transferForm");
  const amountInput = document.getElementById("transferAmount");
  
  if (!fromSelect || !toSelect || !form || !amountInput) return;
  
  // 1. Fetch available accounts
  try {
    const data = await window.ApiClient.getAccounts();
    accounts = Array.isArray(data) ? data : (data.accounts || data.data || []);
    
    // Populate dropdowns
    accounts.forEach(acc => {
      const accId = acc.id || acc.accountId || acc.account_id;
      const accName = acc.customer_name || acc.name || "N/A";
      const option = document.createElement("option");
      option.value = accId;
      option.textContent = `${accName} (ID: ${accId} - ${window.formatCurrency(acc.balance)})`;
      
      fromSelect.appendChild(option.cloneNode(true));
      toSelect.appendChild(option.cloneNode(true));
    });
    
  } catch (error) {
    console.error("Failed to load accounts for transfer dropdowns:", error);
  }
  
  // 2. Bind change event for sender account selection
  fromSelect.addEventListener("change", (e) => {
    updateBalanceDisplay(e.target.value, "sender");
    validateSameAccounts();
  });
  
  // 3. Bind change event for receiver account selection
  toSelect.addEventListener("change", (e) => {
    updateBalanceDisplay(e.target.value, "receiver");
    validateSameAccounts();
  });
  
  // 4. Clear custom errors on amount change
  amountInput.addEventListener("input", () => {
    amountInput.setCustomValidity("");
    const feedback = document.getElementById("transferAmountFeedback");
    if (feedback) {
      feedback.textContent = "Please specify a transfer amount of at least $0.01.";
    }
  });
  
  // Same account validation helper
  function validateSameAccounts() {
    if (fromSelect.value && toSelect.value && fromSelect.value === toSelect.value) {
      toSelect.setCustomValidity("same_account");
    } else {
      toSelect.setCustomValidity("");
    }
  }
  
  // 5. Bind Form Submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    validateSameAccounts();
    
    form.classList.add("was-validated");
    
    if (!form.checkValidity()) {
      if (fromSelect.value === toSelect.value) {
        if (typeof window.showToast === 'function') {
          window.showToast("Source and destination accounts must be different.", "danger");
        }
      }
      return;
    }
    
    const fromId = fromSelect.value;
    const toId = toSelect.value;
    const amountVal = parseFloat(amountInput.value);
    
    const senderAcc = accounts.find(a => String(a.id || a.accountId || a.account_id) === String(fromId));
    
    // Balance check
    if (senderAcc && amountVal > parseFloat(senderAcc.balance)) {
      amountInput.setCustomValidity("insufficient");
      const feedback = document.getElementById("transferAmountFeedback");
      if (feedback) {
        feedback.textContent = `Insufficient funds. Sender available balance is ${window.formatCurrency(senderAcc.balance)}.`;
      }
      form.classList.add("was-validated");
      return;
    } else {
      amountInput.setCustomValidity("");
    }
    
    const recipientAcc = accounts.find(a => String(a.id || a.accountId || a.account_id) === String(toId));
    const senderName = senderAcc ? (senderAcc.customer_name || senderAcc.name) : "Sender";
    const receiverName = recipientAcc ? (recipientAcc.customer_name || recipientAcc.name) : "Receiver";
    
    try {
      // Post transfer operation (using Number parsing for ID fields as required by your endpoint)
      await window.ApiClient.transfer(fromId, toId, amountVal);
      
      if (typeof window.showToast === 'function') {
        window.showToast(`Transfer of ${window.formatCurrency(amountVal)} from "${senderName}" to "${receiverName}" executed successfully!`, "success");
      }
      
      form.reset();
      form.classList.remove("was-validated");
      document.getElementById("senderBalancePanel").classList.add("d-none");
      document.getElementById("receiverBalancePanel").classList.add("d-none");
      
      // Redirect back to accounts overview
      setTimeout(() => {
        window.location.href = "accounts.html";
      }, 1500);
      
    } catch (error) {
      console.error("Transfer execute failed:", error);
    }
  });
}

// Update the balance display cards based on dropdown selections
function updateBalanceDisplay(accountId, role) {
  const panelId = role === "sender" ? "senderBalancePanel" : "receiverBalancePanel";
  const labelId = role === "sender" ? "senderBalanceLabel" : "receiverBalanceLabel";
  
  const panel = document.getElementById(panelId);
  const label = document.getElementById(labelId);
  
  const acc = accounts.find(a => String(a.id || a.accountId || a.account_id) === String(accountId));
  
  if (acc && panel && label) {
    label.textContent = window.formatCurrency(acc.balance || 0);
    panel.classList.remove("d-none");
  } else if (panel) {
    panel.classList.add("d-none");
  }
}
