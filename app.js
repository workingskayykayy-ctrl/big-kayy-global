// BKG 🌍 — BIG KAYY GLOBAL

function showMessage(service) {
  alert(
    service +
    " is not connected yet. Please check back when this service becomes available."
  );
}

document.addEventListener("DOMContentLoaded", function () {
  const yearElement = document.getElementById("year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
});