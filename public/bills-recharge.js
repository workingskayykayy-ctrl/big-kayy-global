(function () {
  "use strict";
  const status = document.getElementById("bills-status");
  const apiBase = String(window.BKG_API_BASE || "").replace(/\/$/, "");
  async function checkStatus() {
    if (!status) return;
    try {
      const response = await fetch(apiBase + "/api/bills/status");
      const result = await response.json();
      if (result && result.providerConfigured) {
        status.querySelector("strong").textContent = "VTpass credentials detected";
        status.querySelector("p").textContent = "Provider credentials are configured. Live purchases still remain disabled until payment collection, transaction verification and reconciliation are tested.";
      }
    } catch (_) { /* Keep the safe setup-required message when the API is unavailable. */ }
  }
  document.querySelectorAll(".bill-select").forEach(function (button) {
    button.addEventListener("click", function () {
      const service = button.dataset.bill || "Bills & Recharge";
      if (!status) return;
      status.scrollIntoView({ behavior: "smooth", block: "nearest" });
      status.querySelector("strong").textContent = service + " — setup in progress";
      status.querySelector("p").textContent = "This service is not accepting transactions yet. Register for VTpass API access and complete sandbox tests first. No money has been collected.";
    });
  });
  checkStatus();
})();