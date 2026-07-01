
const _chartRegistry = {};

/**
 * Safe Chart.js factory.
 * Destroys any previous chart on this canvas ID before creating a new one.
 * @param {string} canvasId - The HTML element ID of the <canvas>.
 * @param {object} config   - Standard Chart.js config object.
 * @returns {Chart|null}
 */
function createChart(canvasId, config) {

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn(`[createChart] Canvas element not found: #${canvasId}`);
    return null;
  }


  if (_chartRegistry[canvasId]) {
    _chartRegistry[canvasId].destroy();
    delete _chartRegistry[canvasId];
  }

  const ctx = canvas.getContext("2d");
  const chart = new Chart(ctx, config);
  _chartRegistry[canvasId] = chart;
  return chart;
}


function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  if (dateStr instanceof Date) return dateStr;

  let cleaned = String(dateStr).trim();


  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(cleaned)) {
    cleaned = cleaned.replace(" ", "T");
  }

  const d = new Date(cleaned);
  if (isNaN(d.getTime())) {
    console.warn("[parseDate] Could not parse date string:", dateStr);
    return new Date(0);
  }
  return d;
}


function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth()   === d2.getMonth()    &&
    d1.getDate()    === d2.getDate()
  );
}


function normaliseType(rawType) {
    const t = String(rawType || "").trim().toUpperCase();

    if (t === "DEPOSIT") {
        return "DEPOSIT";
    }

    if (t === "WITHDRAW" || t === "WITHDRAWAL") {
        return "WITHDRAWAL";
    }

    if (
        t === "TRANSFER" ||
        t === "TRANSFER_IN" ||
        t === "TRANSFER_OUT"
    ) {
        return "TRANSFER";
    }

    return t;
}

  async function fetchAllTransactions(accounts) {
    if (!accounts || accounts.length === 0) return [];

    const txnPromises = accounts.map(acc => {
      const accId = acc.account_id || acc.id || acc.accountId;
      return window.ApiClient.getTransactions(accId)
        .then(data => {
          const list = Array.isArray(data) ? data : (data.transactions || data.data || []);
          // Inject account metadata for display purposes.
          return list.map(t => ({
            ...t,
            accountId:    accId,
            customerName: acc.customer_name || acc.name || "N/A"
          }));
        })
        .catch(err => {
          console.warn(`[fetchAllTransactions] Could not load transactions for account ${accId}:`, err);
          return [];
        });
    });

    const results  = await Promise.all(txnPromises);
    const flatTxns = results.flat();
    console.log(`[fetchAllTransactions] Total transactions fetched: ${flatTxns.length}`);
    return flatTxns;
  }


document.addEventListener("DOMContentLoaded", () => {
  if (!window.ApiClient) {
    console.error("[analytics.js] window.ApiClient is not defined. Make sure api.js is loaded first.");
    return;
  }

  const isDashboard     = document.getElementById("growthChart")            !== null;
  const isAnalyticsPage = document.getElementById("monthlyDepositsChart")   !== null;

  if (isDashboard) {
    initDashboardView();
  } else if (isAnalyticsPage) {
    initAnalyticsView();
  }
});

async function initDashboardView() {
  try {

    const accountsData = await window.ApiClient.getAccounts();
    const accounts = Array.isArray(accountsData)
      ? accountsData
      : (accountsData.accounts || accountsData.data || []);

    console.log("[initDashboardView] Accounts loaded:", accounts);

    const transactions = await fetchAllTransactions(accounts);
    console.log("[initDashboardView] All transactions:", transactions);


    let totalAssets = 0;
    accounts.forEach(acc => {
      totalAssets += parseFloat(acc.balance || 0);
    });


    const totalBalanceEl = document.getElementById("totalBalance");
    if (totalBalanceEl) totalBalanceEl.textContent = window.formatCurrency(totalAssets);

    const totalAccountsEl = document.getElementById("totalAccountsCount");
    if (totalAccountsEl) totalAccountsEl.textContent = `${accounts.length} Registered Accounts`;

    const today = new Date();
    console.log(`[initDashboardView] Today is: ${today.toDateString()}`);

    const todayTxns = transactions.filter(t => {

      const dateStr = t.created_at || t.timestamp || t.date;
      const tDate   = parseDate(dateStr);
      const match   = isSameDay(tDate, today);
      console.log(
        `[isToday] ID=${t.transaction_id || t.id} | raw="${dateStr}" | parsed="${tDate.toDateString()}" | match=${match}`
      );
      return match;
    });

    console.log(`[initDashboardView] Today's transactions (${todayTxns.length}):`, todayTxns);

    let depSum = 0, depCount = 0;
    let withSum = 0, withCount = 0;
    let transSum = 0, transCount = 0;

    todayTxns.forEach(t => {
      const amount  = parseFloat(t.amount || 0);

      const bucket  = normaliseType(t.transaction_type || t.type);

      if (bucket === "DEPOSIT") {
        depSum   += amount; depCount++;
      } else if (bucket === "WITHDRAWAL") {
        withSum  += amount; withCount++;
      } else if (bucket === "TRANSFER") {
        transSum += amount; transCount++;
      }
    });

    console.log(
      `[initDashboardView] Today's summary — ` +
      `Deposits: $${depSum} (${depCount}tx), ` +
      `Withdrawals: $${withSum} (${withCount}tx), ` +
      `Transfers: $${transSum} (${transCount}tx)`
    );


    const todayDepositsEl = document.getElementById("todayDeposits");
    if (todayDepositsEl) todayDepositsEl.textContent = window.formatCurrency(depSum);

    const todayDepCntEl = document.getElementById("todayDepositsCount");
    if (todayDepCntEl) todayDepCntEl.textContent = `${depCount} transactions`;

    const todayWithEl = document.getElementById("todayWithdrawals");
    if (todayWithEl) todayWithEl.textContent = window.formatCurrency(withSum);

    const todayWithCntEl = document.getElementById("todayWithdrawalsCount");
    if (todayWithCntEl) todayWithCntEl.textContent = `${withCount} transactions`;

    const todayTransEl = document.getElementById("todayTransfers");
    if (todayTransEl) todayTransEl.textContent = window.formatCurrency(transSum);

    const todayTransCntEl = document.getElementById("todayTransfersCount");
    if (todayTransCntEl) todayTransCntEl.textContent = `${transCount} transactions`;


    renderRecentTransactions(transactions);


    renderDashboardCharts(accounts, transactions);

  } catch (error) {
    console.error("[initDashboardView] Failed:", error);
  }
}

async function initAnalyticsView() {
  try {
    const accountsData = await window.ApiClient.getAccounts();
    const accounts = Array.isArray(accountsData)
      ? accountsData
      : (accountsData.accounts || accountsData.data || []);

    const transactions = await fetchAllTransactions(accounts);

    renderAnalyticsCharts(accounts, transactions);
  } catch (error) {
    console.error("[initAnalyticsView] Failed:", error);
  }
}


function renderRecentTransactions(transactions) {
  const tbody = document.getElementById("recentTransactionsTable");
  if (!tbody) return;

  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-secondary py-3">No system transactions logged yet.</td>
      </tr>`;
    return;
  }


  const sorted = [...transactions]
    .sort((a, b) => {
      const dateA = parseDate(a.created_at || a.timestamp || a.date).getTime();
      const dateB = parseDate(b.created_at || b.timestamp || b.date).getTime();
      return dateB - dateA; // descending — newest first
    })
    .slice(0, 5);

  let html = "";
  sorted.forEach(txn => {
    const txnId    = String(txn.transaction_id || txn.transactionId || txn.id || "");
    const amount   = parseFloat(txn.amount || 0);
    const timestamp = txn.created_at || txn.timestamp || txn.date;


    const bucket   = normaliseType(txn.transaction_type || txn.type);

    let badgeClass = "badge-deposit";
    let typeName   = "Deposit";

    if (bucket === "WITHDRAWAL") {
      badgeClass = "badge-withdrawal";
      typeName   = "Withdrawal";
    } else if (bucket === "TRANSFER") {
      badgeClass = "badge-transfer";
      typeName   = "Transfer";

      const rawUpper = (txn.transaction_type || "").toUpperCase();
      if (rawUpper === "TRANSFER_IN")  typeName = "Transfer In";
      if (rawUpper === "TRANSFER_OUT") typeName = "Transfer Out";
    }

    let accRef = "";
    if (txn.from_account || txn.to_account) {
      accRef = `<span class="text-danger-emphasis">${txn.from_account || "N/A"}</span> → <span class="text-success-emphasis">${txn.to_account || "N/A"}</span>`;
    } else {
      accRef = String(txn.accountId || txn.account_id || "N/A");
    }

    const displayId = txnId.length > 8 ? `${txnId.substring(0, 8)}...` : txnId;

    html += `
      <tr class="align-middle">
        <td class="font-monospace text-secondary fs-7" title="${txnId}">${displayId}</td>
        <td class="fs-7">${accRef}</td>
        <td><span class="badge ${badgeClass} rounded-pill">${typeName}</span></td>
        <td class="fw-bold">${window.formatCurrency(amount)}</td>
        <td class="text-secondary fs-7">${window.formatDate(timestamp)}</td>
      </tr>`;
  });

  tbody.innerHTML = html;
}

function renderDashboardCharts(accounts, transactions) {
  const secondaryColor = "#0284c7";
  const accentColor    = "#38bdf8";


  const sortedBalances = [...accounts]
    .sort((a, b) => parseFloat(b.balance || 0) - parseFloat(a.balance || 0))
    .slice(0, 6);

  const labels   = sortedBalances.map(a => (a.customer_name || a.name || "").split(" ")[0]);
  const balances = sortedBalances.map(a => parseFloat(a.balance || 0));


  createChart("growthChart", {
    type: "bar",
    data: {
      labels:   labels.length   > 0 ? labels   : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [{
        label:           "Account Assets (USD)",
        data:            balances.length > 0 ? balances : [1000, 3000, 2000, 5000, 4000, 7000],
        backgroundColor: "rgba(2, 132, 199, 0.75)",
        borderColor:     secondaryColor,
        borderWidth:     2,
        borderRadius:    8
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { borderColor: "rgba(128,128,128,0.1)" } },
        x: { grid: { display: false } }
      }
    }
  });


  let depCount = 0, withCount = 0, transCount = 0;

  // BUG FIX #4 applied: normaliseType() counts TRANSFER_IN/OUT as transfers.
  transactions.forEach(t => {
    const bucket = normaliseType(t.transaction_type || t.type);
    if      (bucket === "DEPOSIT")   depCount++;
    else if (bucket === "WITHDRAWAL") withCount++;
    else if (bucket === "TRANSFER")  transCount++;
  });

  console.log(`[renderDashboardCharts] op counts — dep=${depCount}, with=${withCount}, trans=${transCount}`);

  createChart("transferChart", {
    type: "line",
    data: {
      labels:   ["Deposits", "Withdrawals", "Transfers"],
      datasets: [{
        label:           "Total Operations Count",
        data:            transactions.length > 0 ? [depCount, withCount, transCount] : [12, 19, 8],
        borderColor:     accentColor,
        backgroundColor: "rgba(56, 189, 248, 0.1)",
        fill:            true,
        tension:         0.4,
        borderWidth:     3
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { borderColor: "rgba(128,128,128,0.1)" } },
        x: { grid: { display: false } }
      }
    }
  });
}


function renderAnalyticsCharts(accounts, transactions) {
  const successColor = "#10b981";
  const dangerColor  = "#ef4444";

  const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-based

  const last6Slots = [];
  for (let i = 5; i >= 0; i--) {
    let mIdx  = currentMonthIdx - i;
    let year  = currentYear;
    if (mIdx < 0) { mIdx += 12; year -= 1; }
    last6Slots.push({ label: monthsList[mIdx], year, monthIdx: mIdx });
  }

  const monthlyDeps  = [0, 0, 0, 0, 0, 0];
  const monthlyWiths = [0, 0, 0, 0, 0, 0];

  transactions.forEach(t => {
    const date   = parseDate(t.created_at || t.timestamp || t.date);
    const amount = parseFloat(t.amount || 0);
    const bucket = normaliseType(t.transaction_type || t.type);

    const tYear  = date.getFullYear();
    const tMonth = date.getMonth();

    // Find the matching slot by year AND month index.
    const slotIdx = last6Slots.findIndex(s => s.year === tYear && s.monthIdx === tMonth);
    if (slotIdx !== -1) {
      if      (bucket === "DEPOSIT")   monthlyDeps [slotIdx] += amount;
      else if (bucket === "WITHDRAWAL") monthlyWiths[slotIdx] += amount;
    }
  });

  const labels = last6Slots.map(s => s.label);

  const finalDeps  = monthlyDeps .reduce((a, b) => a + b, 0) > 0 ? monthlyDeps  : [2000, 4500, 3000, 6000, 8000, 5000];
  const finalWiths = monthlyWiths.reduce((a, b) => a + b, 0) > 0 ? monthlyWiths : [1000, 2000, 1500, 3500, 4000, 3000];


  createChart("monthlyDepositsChart", {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label:           "Deposited Value (USD)",
        data:            finalDeps,
        backgroundColor: "rgba(16, 185, 129, 0.75)",
        borderColor:     successColor,
        borderWidth:     2,
        borderRadius:    6
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { borderColor: "rgba(128,128,128,0.1)" } },
        x: { grid: { display: false } }
      }
    }
  });


  createChart("monthlyWithdrawalsChart", {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label:           "Withdrawn Value (USD)",
        data:            finalWiths,
        backgroundColor: "rgba(239, 68, 68, 0.75)",
        borderColor:     dangerColor,
        borderWidth:     2,
        borderRadius:    6
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { borderColor: "rgba(128,128,128,0.1)" } },
        x: { grid: { display: false } }
      }
    }
  });


  let depCount = 0, withCount = 0, transCount = 0;


  transactions.forEach(t => {
    const bucket = normaliseType(t.transaction_type || t.type);
    if      (bucket === "DEPOSIT")   depCount++;
    else if (bucket === "WITHDRAWAL") withCount++;
    else if (bucket === "TRANSFER")  transCount++;
  });

  const finalVolume = (depCount + withCount + transCount) > 0
    ? [depCount, withCount, transCount]
    : [30, 20, 15];

  createChart("transferVolumeChart", {
    type: "doughnut",
    data: {
      labels: ["Deposits", "Withdrawals", "Transfers"],
      datasets: [{
        data:            finalVolume,
        backgroundColor: [
          "rgba(16, 185, 129, 0.75)",
          "rgba(239, 68, 68, 0.75)",
          "rgba(59, 130, 246, 0.75)"
        ],
        borderColor: ["#10b981", "#ef4444", "#3b82f6"],
        borderWidth: 2
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 15 } }
      }
    }
  });


  const topAccounts = [...accounts]
    .sort((a, b) => parseFloat(b.balance || 0) - parseFloat(a.balance || 0))
    .slice(0, 5);

  const custLabels   = topAccounts.map(a => a.customer_name || a.name || "N/A");
  const custBalances = topAccounts.map(a => parseFloat(a.balance || 0));

  const finalCustLabels   = custLabels.length   > 0 ? custLabels   : ["Alice Smith", "Bob Jones", "Charlie Brown", "Diana Prince", "Ethan Hunt"];
  const finalCustBalances = custBalances.length > 0 ? custBalances : [12000, 9500, 8200, 7500, 6000];

  createChart("topCustomersChart", {
    type: "bar",
    data: {
      labels: finalCustLabels,
      datasets: [{
        label:           "Account Assets (USD)",
        data:            finalCustBalances,
        backgroundColor: "rgba(59, 130, 246, 0.75)",
        borderColor:     "#3b82f6",
        borderWidth:     2,
        borderRadius:    6
      }]
    },
    options: {
      indexAxis:           "y",
      responsive:          true,
      maintainAspectRatio: false,
      scales: {
        x: { beginAtZero: true, grid: { borderColor: "rgba(128,128,128,0.1)" } },
        y: { grid: { display: false } }
      }
    }
  });
}
