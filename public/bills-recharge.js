(function () {
  "use strict";

  const status = document.getElementById("bills-status");
  const apiBase = String(window.BKG_API_BASE || "").replace(/\/$/, "");
  const serviceButtons = document.querySelectorAll(".bill-select");

  async function checkStatus() {
    if (!status) return;
    try {
      const response = await fetch(apiBase + "/api/bills/status");
      const result = await response.json();
      if (result && result.providerConfigured) {
        status.querySelector("strong").textContent = "VTpass credentials detected";
        status.querySelector("p").textContent =
          "Provider credentials are configured. Purchases remain disabled until sandbox transactions, customer payment collection, transaction verification and reconciliation are tested.";
      }
    } catch (_) {
      // Keep the safe setup-required message when the API is unavailable.
    }
  }

  function openServiceForm(service) {
    let dialog = document.getElementById("bill-service-dialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "bill-service-dialog";
      dialog.setAttribute("aria-labelledby", "bill-service-title");
      dialog.style.cssText = "max-width:480px;width:calc(100% - 32px);border:0;border-radius:16px;padding:24px;box-shadow:0 20px 70px #0005;color:#172126";
      dialog.innerHTML =
        '<div style="display:flex;justify-content:space-between;gap:16px;align-items:start">' +
          '<div><p style="margin:0 0 8px;color:#a35a16;font-size:12px;font-weight:700;letter-spacing:.12em">BKG BILLS & RECHARGE</p>' +
          '<h2 id="bill-service-title" style="margin:0 0 16px">Choose a service</h2></div>' +
          '<button type="button" id="bill-service-close" aria-label="Close form" style="font-size:26px;border:0;background:transparent;cursor:pointer">×</button>' +
        '</div>' +
        '<form id="bill-service-form">' +
          '<label for="bill-service-type" style="display:block;margin:12px 0 6px;font-weight:600">Service</label>' +
          '<select id="bill-service-type" name="service" required style="width:100%;padding:12px;border:1px solid #ccd3d6;border-radius:8px">' +
            '<option value="Airtime">Airtime</option><option value="Mobile data">Mobile data</option>' +
            '<option value="TV subscription">TV subscription</option><option value="Electricity">Electricity</option></select>' +
          '<label for="bill-service-network" style="display:block;margin:12px 0 6px;font-weight:600">Network / provider</label>' +
          '<select id="bill-service-network" name="provider" required style="width:100%;padding:12px;border:1px solid #ccd3d6;border-radius:8px"></select>' +
          '<label for="bill-service-phone" id="bill-phone-label" style="display:block;margin:12px 0 6px;font-weight:600">Phone number</label>' +
          '<input id="bill-service-phone" name="phone" inputmode="tel" autocomplete="tel" maxlength="30" placeholder="e.g. 08012345678" style="box-sizing:border-box;width:100%;padding:12px;border:1px solid #ccd3d6;border-radius:8px">' +
          '<label for="bill-service-amount" style="display:block;margin:12px 0 6px;font-weight:600">Amount (₦)</label>' +
          '<input id="bill-service-amount" name="amount" type="number" min="50" max="1000000" step="1" required placeholder="Enter amount" style="box-sizing:border-box;width:100%;padding:12px;border:1px solid #ccd3d6;border-radius:8px">' +
          '<p id="bill-service-notice" role="status" style="padding:12px;border-radius:8px;background:#fff3df;line-height:1.45">Sandbox setup is in progress. This form will not submit a transaction or collect money.</p>' +
          '<button type="submit" style="width:100%;padding:13px;border:0;border-radius:8px;background:#ed8a22;color:#171717;font-weight:700;cursor:pointer">Check details</button>' +
        '</form>';
      document.body.appendChild(dialog);

      const typeSelect = dialog.querySelector("#bill-service-type");
      const providerSelect = dialog.querySelector("#bill-service-network");
      const phoneLabel = dialog.querySelector("#bill-phone-label");
      const phoneInput = dialog.querySelector("#bill-service-phone");
      const amountInput = dialog.querySelector("#bill-service-amount");
      const notice = dialog.querySelector("#bill-service-notice");

      function updateProviderOptions() {
        const type = typeSelect.value;
        const options = type === "Airtime" || type === "Mobile data"
          ? ["MTN", "Airtel", "Glo", "9mobile"]
          : type === "TV subscription"
            ? ["DStv", "GOtv", "StarTimes"]
            : ["Choose electricity distribution company (DisCo)", "Ikeja Electric", "Eko Electric", "Abuja Electric", "Ibadan Electric", "Enugu Electric", "Port Harcourt Electric", "Kano Electric", "Jos Electric", "Kaduna Electric", "Benin Electric", "Yola Electric"];
        providerSelect.innerHTML = "";
        options.forEach(function (name, index) {
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name;
          if (type === "Electricity" && index === 0) {
            option.value = "";
            option.disabled = true;
            option.selected = true;
          }
          providerSelect.appendChild(option);
        });
        const phoneService = type === "Airtime" || type === "Mobile data";
        phoneLabel.textContent = phoneService ? "Phone number" : type === "TV subscription" ? "Smartcard / IUC number" : "Meter number";
        phoneInput.placeholder = phoneService ? "e.g. 08012345678" : type === "TV subscription" ? "Enter decoder number" : "Enter meter number";
        amountInput.required = true;
      }
      typeSelect.addEventListener("change", updateProviderOptions);
      updateProviderOptions();
      dialog.querySelector("#bill-service-close").addEventListener("click", function () { dialog.close(); });
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) dialog.close();
      });
      dialog.querySelector("#bill-service-form").addEventListener("submit", function (event) {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        notice.textContent = "Your details are filled in, but VTpass sandbox transaction handling is not connected yet. Nothing has been sent to VTpass and no money has been collected. Please do not treat this as a purchase.";
        notice.style.background = "#fff3df";
      });
    }

    dialog.querySelector("#bill-service-type").value = service;
    dialog.querySelector("#bill-service-type").dispatchEvent(new Event("change"));
    dialog.querySelector("#bill-service-title").textContent = service + " details";
    const notice = dialog.querySelector("#bill-service-notice");
    notice.textContent = "Sandbox setup is in progress. This form will not submit a transaction or collect money.";
    dialog.showModal();
  }

  serviceButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      openServiceForm(button.dataset.bill || "Airtime");
    });
  });

  checkStatus();
})();