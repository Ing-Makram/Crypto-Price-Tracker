const API_BASE = "https://api.coingecko.com/api/v3";
const pricesContainer = document.getElementById("pricesContainer");
const coinForm = document.getElementById("coinForm");
const coinInput = document.getElementById("coinInput");
const currencySelect = document.getElementById("currencySelect");
const toggleBtn = document.getElementById("toggleMode");
const errorMsg = document.getElementById("error");
const suggestionsBox = document.getElementById("suggestions");
const chartSection = document.getElementById("chartSection");
const chartCanvas = document.getElementById("priceChart");

let trackedCoins = JSON.parse(localStorage.getItem("coins")) || [];
let selectedCurrency = localStorage.getItem("currency") || "usd";
let allCoins = [];
let chart = null;
let currentChartCoin = null;

document.body.classList.toggle("dark", localStorage.getItem("theme") === "dark");

currencySelect.value = selectedCurrency;
currencySelect.addEventListener("change", () => {
  selectedCurrency = currencySelect.value;
  localStorage.setItem("currency", selectedCurrency);
  fetchPrices();
});

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
});

fetch(`${API_BASE}/coins/list`)
  .then(res => res.json())
  .then(data => allCoins = data)
  .catch(() => console.error("Failed to load coin list."));

coinInput.addEventListener("input", () => {
  const val = coinInput.value.toLowerCase();
  const matches = allCoins.filter(c => c.id.startsWith(val)).slice(0, 5);
  suggestionsBox.innerHTML = matches.map(c => `<div class="suggestion">${c.id}</div>`).join("");
});

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("suggestion")) {
    coinInput.value = e.target.textContent;
    suggestionsBox.innerHTML = "";
  }
});

coinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const coin = coinInput.value.trim().toLowerCase();

  if (coin && !trackedCoins.includes(coin)) {
    trackedCoins.push(coin);
    localStorage.setItem("coins", JSON.stringify(trackedCoins));
    fetchPrices();
  }

  coinInput.value = "";
  suggestionsBox.innerHTML = "";
});

function removeCoin(coin) {
  trackedCoins = trackedCoins.filter(c => c !== coin);
  localStorage.setItem("coins", JSON.stringify(trackedCoins));
  fetchPrices();

  if (currentChartCoin === coin) {
    chartSection.style.display = "none";
    currentChartCoin = null;
  }
}

async function fetchPrices() {
  if (trackedCoins.length === 0) {
    pricesContainer.innerHTML = "<p>No coins being tracked yet.</p>";
    return;
  }

  try {
    const ids = trackedCoins.join(",");
    const res = await fetch(`${API_BASE}/simple/price?ids=${ids}&vs_currencies=${selectedCurrency}`);
    const data = await res.json();

    pricesContainer.innerHTML = "";
    errorMsg.textContent = "";

    trackedCoins.forEach(coin => {
      if (!data[coin]) {
        errorMsg.textContent += `Coin "${coin}" not found.\n`;
        return;
      }

      const card = document.createElement("div");
      card.className = "price-card";

      card.innerHTML = `
        <strong>${coin.toUpperCase()}</strong>: ${data[coin][selectedCurrency]} ${selectedCurrency.toUpperCase()}
        <button class="remove-btn" data-coin="${coin}">❌</button>
        <button class="chart-btn" data-coin="${coin}">📊 Show Chart</button>
      `;

      pricesContainer.appendChild(card);
    });

    document.querySelectorAll(".remove-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const coin = e.target.getAttribute("data-coin");
        removeCoin(coin);
      });
    });

    document.querySelectorAll(".chart-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const coin = e.target.getAttribute("data-coin");

        if (currentChartCoin === coin && chartSection.style.display === "block") {
          chartSection.style.display = "none";
          currentChartCoin = null;
        } else {
          await drawChart(coin);
          chartSection.style.display = "block";
          currentChartCoin = coin;
        }
      });
    });

  } catch (err) {
    errorMsg.textContent = "⚠️ Error fetching prices. Check your connection.";
  }
}

async function drawChart(coin) {
  try {
    const res = await fetch(`${API_BASE}/coins/${coin}/market_chart?vs_currency=${selectedCurrency}&days=1`);
    const data = await res.json();

    const labels = data.prices.map(p => new Date(p[0]).toLocaleTimeString());
    const prices = data.prices.map(p => p[1]);

    if (chart) chart.destroy();

    chart = new Chart(chartCanvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: `${coin.toUpperCase()} Price`,
          data: prices,
          borderColor: "#3cba54",
          fill: false
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: { display: false },
          y: { beginAtZero: false }
        }
      }
    });
  } catch (err) {
    errorMsg.textContent = `⚠️ Could not load chart for "${coin}".`;
  }
}

fetchPrices();
setInterval(fetchPrices, 60000); 
