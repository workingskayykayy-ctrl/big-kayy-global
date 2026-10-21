// BKG — Bigg Kayy Global storefront interactions
(function () {
  "use strict";

  const CONTACT_EMAIL = "hello@bigkayyglobal.com";
  const STORAGE_KEY = "bkg-enquiry-items";
  const cart = [];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const cartDialog = $("#cart-dialog");
  const cartItems = $("#cart-items");
  const cartCount = $("#cart-count");
  const dialogCount = $("#dialog-count");
  const toast = $("#toast");
  let toastTimer;

  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2800);
  }

  function saveCart() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (_) { /* Storage may be unavailable; the in-memory list still works. */ }
  }

  function renderCart() {
    const count = cart.length;
    if (cartCount) cartCount.textContent = String(count);
    if (dialogCount) dialogCount.textContent = "(" + count + ")";
    if (!cartItems) return;
    cartItems.replaceChildren();
    if (!count) {
      const empty = document.createElement("p");
      empty.className = "empty-cart";
      empty.textContent = "Your list is empty. Add a gadget to get started.";
      cartItems.appendChild(empty);
      return;
    }
    cart.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      const label = document.createElement("span");
      label.textContent = item.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-item";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + item.name);
      remove.addEventListener("click", () => {
        cart.splice(index, 1);
        saveCart();
        renderCart();
        notify("Item removed from your enquiry list.");
      });
      row.append(label, remove);
      cartItems.appendChild(row);
    });
  }

  function addItem(name) {
    if (cart.some((item) => item.name === name)) {
      notify(name + " is already on your enquiry list.");
      return;
    }
    cart.push({ name });
    saveCart();
    renderCart();
    notify(name + " added to your enquiry list.");
  }

  function sendEmail(subject, body) {
    const href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    window.location.href = href;
  }

  $$(".add-item").forEach((button) => {
    button.addEventListener("click", () => addItem(button.dataset.item || "Gadget enquiry"));
  });

  $$(".service-link").forEach((button) => {
    button.addEventListener("click", () => {
      const service = button.dataset.service || "Digital services";
      sendEmail("BKG enquiry: " + service, "Hello BKG,\n\nI would like to enquire about: " + service + ".\n\nPlease confirm availability, the total price, and the steps to proceed.\n\nThank you.");
    });
  });

  $("#number-enquiry")?.addEventListener("click", () => {
    sendEmail("BKG enquiry: International virtual numbers", "Hello BKG,\n\nI would like to enquire about international virtual numbers and SMS verification.\n\nCountry: \nPlatform/service: \nIntended use: \n\nPlease confirm supported countries, permitted uses, availability, rental duration and pricing.\n\nThank you.");
  });

  $("#open-cart")?.addEventListener("click", () => {
    if (typeof cartDialog?.showModal === "function") cartDialog.showModal();
  });
  $("#close-cart")?.addEventListener("click", () => cartDialog?.close());
  cartDialog?.addEventListener("click", (event) => {
    if (event.target === cartDialog) cartDialog.close();
  });
  $("#clear-cart")?.addEventListener("click", () => {
    cart.splice(0, cart.length);
    saveCart();
    renderCart();
    notify("Your enquiry list has been cleared.");
  });
  $("#send-enquiry")?.addEventListener("click", () => {
    if (!cart.length) {
      notify("Add at least one item before sending an enquiry.");
      return;
    }
    const list = cart.map((item, index) => (index + 1) + ". " + item.name).join("\n");
    sendEmail("BKG gadget enquiry", "Hello BKG,\n\nI am interested in the following items:\n" + list + "\n\nPlease confirm availability, prices, delivery options and secure payment steps. I understand this is an enquiry, not a completed order.\n\nThank you.");
  });

  // Restore only the local enquiry list; no account, payment, or sensitive data is stored here.
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved)) {
      saved.filter((item) => item && typeof item.name === "string").slice(0, 50).forEach((item) => {
        if (!cart.some((existing) => existing.name === item.name)) cart.push({ name: item.name });
      });
    }
  } catch (_) { /* Continue with an empty list when saved data cannot be read. */ }

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
  renderCart();
})();