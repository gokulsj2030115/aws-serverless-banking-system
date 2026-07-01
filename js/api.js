/* js/api.js - AWS API Gateway client wrapper customized for specific endpoint */

const DEFAULT_URL = "https://nwmzu3q8f6.execute-api.ap-southeast-1.amazonaws.com/dev";

const ApiClient = {
  // Get current API URL from storage or fallback
  getBaseUrl() {
    return localStorage.getItem("banking_api_url") || DEFAULT_URL;
  },

  // Set new API URL to storage
  setBaseUrl(url) {
    if (!url) {
      localStorage.removeItem("banking_api_url");
    } else {
      localStorage.setItem("banking_api_url", url.trim());
    }
  },

  // Helper to check if URL is configured
  isConfigured() {
    const url = this.getBaseUrl();
    return url && !url.includes("YOUR_API_GATEWAY_URL");
  },

  // Main HTTP Request wrapper with loader, retry and toast notifications
  async request(path, options = {}, retries = 3) {
    let baseUrl = this.getBaseUrl().trim();
    // Normalize trailing slash
    if (baseUrl.endsWith('/') && path.startsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    } else if (!baseUrl.endsWith('/') && !path.startsWith('/')) {
      baseUrl = baseUrl + '/';
    }
    const url = `${baseUrl}${path}`;
    
    // Auto start loader
    if (typeof window.toggleLoader === 'function') {
      window.toggleLoader(true);
    }

    // Default headers
    options.headers = {
      "Content-Type": "application/json",
      ...options.headers
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // Auto stop loader
        if (typeof window.toggleLoader === 'function') {
          window.toggleLoader(false);
        }

        if (!response.ok) {
          const errorMsg = await response.text();
          throw new Error(errorMsg || `HTTP error! Status: ${response.status}`);
        }

        // Return JSON parse
        return await response.json();

      } catch (error) {
        console.warn(`Request attempt ${attempt} failed: ${error.message}`);
        
        // If it was the last attempt, handle failure
        if (attempt === retries) {
          if (typeof window.toggleLoader === 'function') {
            window.toggleLoader(false);
          }
          
          const errMsg = `API Error: ${error.message}. Please check connection or CORS config.`;
          if (typeof window.showToast === 'function') {
            window.showToast(errMsg, "danger");
          } else {
            alert(errMsg);
          }
          throw error;
        }

        // Wait before retrying (exponential backoff helper)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  },

  // ============================
  // Create Account
  // POST /accounts
  // ============================
  async createAccount(customerName, email, balance) {
    return await this.request("/accounts", {
      method: "POST",
      body: JSON.stringify({
        customer_name: customerName,
        email: email,
        balance: Number(balance)
      })
    });
  },

  // ============================
  // List Accounts
  // GET /accounts
  // ============================
  async getAccounts() {
    return await this.request("/accounts", {
      method: "GET"
    });
  },

  // ============================
  // Get Account
  // GET /accounts/{id}
  // ============================
  async getAccount(id) {
    return await this.request(`/accounts/${id}`, {
      method: "GET"
    });
  },

  // ============================
  // Deposit
  // PUT /accounts/{id}/deposit
  // ============================
  async deposit(id, amount) {
    return await this.request(`/accounts/${id}/deposit`, {
      method: "PUT",
      body: JSON.stringify({
        amount: Number(amount)
      })
    });
  },

  // ============================
  // Withdraw
  // PUT /accounts/{id}/withdraw
  // ============================
  async withdraw(id, amount) {
    return await this.request(`/accounts/${id}/withdraw`, {
      method: "PUT",
      body: JSON.stringify({
        amount: Number(amount)
      })
    });
  },

  // ============================
  // Transfer
  // POST /transfer
  // ============================
  async transfer(fromAccount, toAccount, amount) {
    return await this.request("/transfer", {
      method: "POST",
      body: JSON.stringify({
        from_account: Number(fromAccount),
        to_account: Number(toAccount),
        amount: Number(amount)
      })
    });
  },

  // ============================
  // Transaction History
  // GET /transactions/{account_id}
  // ============================
  async getTransactions(accountId) {
    return await this.request(`/transactions/${accountId}`, {
      method: "GET"
    });
  },

  // ============================
  // Delete Account
  // DELETE /accounts/{id}
  // ============================
  async deleteAccount(id) {
    return await this.request(`/accounts/${id}`, {
      method: "DELETE"
    });
  }
};

// Export ApiClient to global scope
window.ApiClient = ApiClient;