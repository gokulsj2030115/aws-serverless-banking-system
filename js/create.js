/* js/create.js - New customer account registration validation and submission */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("createAccountForm");
  
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      // Toggle Bootstrap validation styling
      form.classList.add("was-validated");
      
      // Perform validation check
      if (!form.checkValidity()) {
        return;
      }
      
      const name = document.getElementById("customerName").value.trim();
      const email = document.getElementById("customerEmail").value.trim();
      const balance = document.getElementById("openingBalance").value;
      
      try {
        if (!window.ApiClient) {
          throw new Error("API Client not loaded");
        }
        
        // Execute create API request
        await window.ApiClient.createAccount(name, email, balance);
        
        // Trigger success notification
        if (typeof window.showToast === 'function') {
          window.showToast(`Account successfully registered for "${name}"!`, "success");
        }
        
        // Reset form controls
        form.reset();
        form.classList.remove("was-validated");
        
        // Redirect to Accounts after 1.5s delay
        setTimeout(() => {
          window.location.href = "accounts.html";
        }, 1500);
        
      } catch (error) {
        console.error("Account registration failed:", error);
      }
    });
  }
});
