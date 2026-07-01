/* js/common.js - Shared UI utilities, Theme toggler, and notifications */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initSidebar();
  checkApiConfiguration();
  highlightActiveLink();
});

// 1. Theme (Dark/Light Mode) Initialization and toggling
function initTheme() {
  const currentTheme = localStorage.getItem("banking_theme") || "light";
  document.documentElement.setAttribute("data-bs-theme", currentTheme);
  
  // Set theme selector toggle state if button exists on page
  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) {
    updateThemeButtonIcon(themeBtn, currentTheme);
    themeBtn.addEventListener("click", () => {
      const activeTheme = document.documentElement.getAttribute("data-bs-theme");
      const newTheme = activeTheme === "dark" ? "light" : "dark";
      
      document.documentElement.setAttribute("data-bs-theme", newTheme);
      localStorage.setItem("banking_theme", newTheme);
      updateThemeButtonIcon(themeBtn, newTheme);
    });
  }
}

function updateThemeButtonIcon(btn, theme) {
  if (theme === "dark") {
    btn.innerHTML = '<i class="fas fa-sun text-warning animate__animated animate__rotateIn"></i>';
  } else {
    btn.innerHTML = '<i class="fas fa-moon text-primary animate__animated animate__bounceIn"></i>';
  }
}

// 2. Sidebar Responsive Drawer
function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const toggler = document.getElementById("sidebarToggler");
  
  if (toggler && sidebar) {
    toggler.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("show");
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener("click", (e) => {
      if (sidebar.classList.contains("show") && !sidebar.contains(e.target) && e.target !== toggler) {
        sidebar.classList.remove("show");
      }
    });
  }
}

// 3. Highlight current page in Sidebar navigation
function highlightActiveLink() {
  const currentPath = window.location.pathname;
  const pageName = currentPath.substring(currentPath.lastIndexOf("/") + 1) || "index.html";
  
  const navLinks = document.querySelectorAll(".sidebar-link");
  navLinks.forEach(link => {
    const href = link.getAttribute("href");
    if (href === pageName || (pageName === "" && href === "index.html")) {
      link.parentElement.classList.add("active");
    } else {
      link.parentElement.classList.remove("active");
    }
  });
}

// 4. API Configuration warning banner
function checkApiConfiguration() {
  if (window.ApiClient && !window.ApiClient.isConfigured()) {
    // Inject alert banner at the top of main content
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      const banner = document.createElement("div");
      banner.className = "alert alert-warning alert-dismissible fade show d-flex align-items-center gap-2 mb-4 glass-card shadow-sm border-warning";
      banner.style.zIndex = "100";
      banner.role = "alert";
      banner.innerHTML = `
        <i class="fas fa-exclamation-triangle fs-4 text-warning"></i>
        <div>
          <strong>AWS API Endpoint Not Configured:</strong> The system is currently using the placeholder endpoint URL. Please update it in the <a href="settings.html" class="alert-link">Settings Page</a> to connect to your AWS API Gateway.
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;
      mainContent.insertBefore(banner, mainContent.firstChild);
    }
  }
}

// 5. Global Loading Spinner Helper
window.toggleLoader = function(show) {
  let loader = document.getElementById("globalLoader");
  if (!loader) {
    // Create loader dynamically if it doesn't exist
    loader = document.createElement("div");
    loader.id = "globalLoader";
    loader.className = "loading-overlay";
    loader.innerHTML = `
      <div class="spinner-container">
        <div class="custom-spinner"></div>
        <h5 class="m-0 fw-semibold text-white">Processing Request...</h5>
      </div>
    `;
    document.body.appendChild(loader);
  }
  
  if (show) {
    loader.classList.add("active");
  } else {
    loader.classList.remove("active");
  }
};

// 6. Global Toast Notifications Helper
window.showToast = function(message, type = "success") {
  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }
  
  const toastId = "toast_" + Date.now();
  const iconClass = type === "success" 
    ? "fa-check-circle text-success" 
    : type === "danger" 
      ? "fa-times-circle text-danger" 
      : "fa-info-circle text-info";
      
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center border-0 glass-card shadow-lg" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="fas ${iconClass} fs-5"></i>
          <span class="text-primary-emphasis fw-medium">${message}</span>
        </div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  
  toastContainer.insertAdjacentHTML("beforeend", toastHtml);
  const toastElement = document.getElementById(toastId);
  
  // Use Bootstrap Toast constructor
  if (window.bootstrap && window.bootstrap.Toast) {
    const bsToast = new bootstrap.Toast(toastElement, { delay: 4000 });
    bsToast.show();
    
    // Clean up DOM after toast hides
    toastElement.addEventListener("hidden.bs.toast", () => {
      toastElement.remove();
    });
  } else {
    // Fallback if Bootstrap is not loaded yet
    toastElement.style.display = "block";
    setTimeout(() => {
      toastElement.remove();
    }, 4000);
  }
};

// Helper for formatting Currency
window.formatCurrency = function(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Helper for formatting Dates
window.formatDate = function(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
