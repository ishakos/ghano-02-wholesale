/**
 * main.js — Quran Store Landing Page
 *
 * Responsibilities:
 *  1. Populate wilaya <select>
 *  2. Pack card click → pre-select radio in form
 *  3. Form validation (Algerian phone, required fields)
 *  4. Submit order to Google Sheets via Apps Script web-app URL
 *  5. Facebook Pixel event tracking (ViewContent, InitiateCheckout, Purchase)
 *  6. Thank-you overlay
 */

/* ============================================================
   CONFIG — ✏️  Update these before going live
   ============================================================ */
const CONFIG = {
  /**
   * Google Apps Script deployment URL.
   * See SETUP.md for how to create this.
   */
  SHEET_URL: "https://script.google.com/macros/s/AKfycbyOrhTaUIiY2UJqhNYR2OP-wR1XunhE5wIX7uxTMqvVwkcxJxHeTz5lPzLRAvHrPga8/exec",

  /** Facebook Pixel is already initialised in <head>.
   *  The helpers below just fire named events. */
};

/* ============================================================
   WILAYA SELECT — populate from wilayas.js
   ============================================================ */
(function populateWilayas() {
  const sel = document.getElementById("wilaya");

  if (!sel || typeof WILAYAS === "undefined") return;

  const availableWilayas = WILAYAS.filter((w) => w.home !== null || w.office !== null);

  availableWilayas.forEach((w) => {
    const opt = document.createElement("option");

    opt.value = w.name;      // store the wilaya name (sent to sheet)
    opt.textContent = w.name; // display the name

    sel.appendChild(opt);
  });
})();

/* ============================================================
   FACEBOOK PIXEL HELPERS
   ============================================================ */
function fbEvent(eventName, params = {}) {
  if (typeof fbq === "function") {
    fbq("track", eventName, params);
  }
}

// Fire ViewContent once per session
fbEvent("ViewContent", { content_name: "Quran Packs Landing Page" });

/* ============================================================
   PACK CARD SELECTION (cards above the form)
   ============================================================ */
function selectPack(btn) {
  // Highlight button
  document.querySelectorAll(".btn--select").forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");

  // Read data from parent card
  const card = btn.closest(".pack-card");
  const name  = card.dataset.name;
  const price = card.dataset.price;

  // Update form display banner
  const display = document.getElementById("packDisplayValue");
  if (display) display.textContent = `${name} — ${Number(price).toLocaleString("ar-DZ")} دج`;

  // Tick the matching radio in the order form
  const radios = document.querySelectorAll('input[name="pack"]');
  radios.forEach((r) => {
    if (r.value.includes(name.replace("ة", "ة"))) {
      r.checked = true;
    }
  });

  // Smooth scroll to order form
  document.getElementById("order").scrollIntoView({ behavior: "smooth", block: "start" });

  // FB Pixel: user showed intent
  fbEvent("InitiateCheckout", {
    content_name: name,
    value: Number(price),
    currency: "EUR",
  });
}

/* ============================================================
   FORM VALIDATION
   ============================================================ */
const PHONE_REGEX = /^0[567]\d{8}$/;

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearErrors() {
  document.querySelectorAll(".field__error").forEach((e) => (e.textContent = ""));
  document.querySelectorAll(".field__input").forEach((i) => i.classList.remove("error"));
}
function markError(inputId, errId, msg) {
  const input = document.getElementById(inputId);
  if (input) input.classList.add("error");
  showError(errId, msg);
}

function validateForm(data) {
  let valid = true;
  clearErrors();

  if (!data.fullName.trim()) {
    markError("fullName", "fullNameErr", "الرجاء إدخال الاسم الكامل.");
    valid = false;
  }

  if (!PHONE_REGEX.test(data.phone.trim())) {
    markError("phone", "phoneErr", "رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 أو 06 أو 07 ويتبعه 8 أرقام.");
    valid = false;
  }

  if (!data.wilaya) {
    markError("wilaya", "wilayaErr", "الرجاء اختيار الولاية.");
    valid = false;
  }

  if (!data.commune.trim()) {
    markError("commune", "communeErr", "الرجاء إدخال اسم البلدية.");
    valid = false;
  }

  if (!data.pack) {
    showError("packErr", "الرجاء اختيار الباقة.");
    valid = false;
  }

  if (!data.delivery) {
    showError("deliveryErr", "الرجاء اختيار طريقة التوصيل.");
    valid = false;
  }

  return valid;
}

/* ============================================================
   GOOGLE SHEETS SUBMISSION
   ============================================================ */
async function sendToSheet(data) {
  /**
   * The Apps Script endpoint expects a GET request with query params
   * (simplest CORS-safe approach with Google Apps Script).
   * See SETUP.md for the Apps Script code.
   */
  const params = new URLSearchParams({
    timestamp:  new Date().toISOString(),
    productName: "مصحف 60 حزب",
    fullName:   data.fullName,
    phone:      String(data.phone).padStart(10, "0"),
    wilaya:     data.wilaya,
    commune:    data.commune,
    pack:       data.pack,
    delivery:   data.delivery,
    total:      data.total,
  });

  const url = `${CONFIG.SHEET_URL}?${params.toString()}`;
  const res  = await fetch(url, { method: "GET", mode: "no-cors" });
  // no-cors means we can't read the response, but the write still happens.
  return true;
}

/* ============================================================
   THANK-YOU OVERLAY
   ============================================================ */
function showThankYou() {
  const overlay = document.getElementById("thankYou");
  if (overlay) {
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }
}

function closeThankYou() {
  const overlay = document.getElementById("thankYou");
  if (overlay) {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }
}

// Close on backdrop click
document.getElementById("thankYou")?.addEventListener("click", function (e) {
  if (e.target === this) closeThankYou();
});

/* ============================================================
   FORM SUBMIT
   ============================================================ */
document.getElementById("orderForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  const form = e.target;
  const packRadio     = form.querySelector('input[name="pack"]:checked');
  const deliveryRadio = form.querySelector('input[name="delivery"]:checked');

  const data = {
    fullName: form.fullName.value,
    phone:    form.phone.value,
    wilaya:   form.wilaya.value,
    commune:  form.commune.value,
    pack:     packRadio ? packRadio.value : "",
    delivery: deliveryRadio ? (deliveryRadio.value === "home" ? "توصيل إلى المنزل" : "توصيل إلى المكتب") : "",
    total:    document.getElementById("totalPrice")?.textContent || "",
  };

  if (!validateForm(data)) {
    // Scroll to first error
    const firstError = form.querySelector(".field__input.error, .field__error:not(:empty)");
    if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  // Show loading state
  const btn     = document.getElementById("submitBtn");
  const btnText = document.getElementById("submitText");
  const spinner = document.getElementById("submitSpinner");
  btn.disabled  = true;
  btnText.hidden = true;
  spinner.hidden = false;

  try {
    await sendToSheet(data);

    // FB Pixel: purchase/lead conversion
    fbEvent("Purchase", {
      content_name: data.pack,
      currency:     "EUR",
      value:        extractPrice(data.pack),
    });
    fbEvent("Lead");

    showThankYou();
    form.reset();
    document.getElementById("packDisplayValue").textContent = "لم يتم الاختيار بعد";
    document.querySelectorAll(".btn--select").forEach((b) => b.classList.remove("selected"));
    ["packPrice", "deliveryPrice", "totalPrice"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = "0 دج";
    });
    totalPrice = 0;

  } catch (err) {
    alert("حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى أو التواصل معنا مباشرة.");
    console.error("Sheet submission error:", err);
  } finally {
    btn.disabled   = false;
    btnText.hidden = false;
    spinner.hidden = true;
  }
});

const PACK_PRICES = {
  "10 كتاب": 6900,
  "20 كتاب": 13200,
  "30 كتاب": 18900,
};

function extractPrice(packString) {
  // First try lookup by pack name (new format: "10 مصاحف")
  if (PACK_PRICES[packString]) return PACK_PRICES[packString];
  // Fallback: parse "1500 دج" style strings
  const match = packString.replace(/\s/g, "").match(/(\d+)دج/);
  return match ? parseInt(match[1]) : 0;
}

/* ============================================================
   PHONE — digits only input filter
   ============================================================ */
document.getElementById("phone")?.addEventListener("input", function () {
  this.value = this.value.replace(/\D/g, "").slice(0, 10);
});

/* ============================================================
   ORDER SUMMARY
   ============================================================ */

let totalPrice = 0;

function updateOrderSummary() {

    const wilayaName    = document.getElementById("wilaya").value;
    const deliveryRadio = document.querySelector('input[name="delivery"]:checked');
    const packRadio     = document.querySelector('input[name="pack"]:checked');

    // Pack price — update as soon as a pack is selected
    const packPrice = packRadio ? extractPrice(packRadio.value) : 0;

    // Delivery price — needs both wilaya AND delivery method chosen
    let deliveryPrice = 0;
    if (wilayaName && deliveryRadio) {
        const wilaya = WILAYAS.find(w => w.name === wilayaName);
        if (wilaya) {
            deliveryPrice = deliveryRadio.value === "home"
                ? wilaya.home
                : wilaya.office;
        }
    }

    totalPrice = packPrice + deliveryPrice;

    document.getElementById("packPrice").textContent =
        packPrice > 0 ? packPrice.toLocaleString("ar-DZ") + " دج" : "0 دج";

    document.getElementById("deliveryPrice").textContent =
        deliveryPrice > 0
            ? deliveryPrice.toLocaleString("ar-DZ") + " دج"
            : (deliveryRadio && !wilayaName ? "— اختر الولاية —" : "0 دج");

    document.getElementById("totalPrice").textContent =
        totalPrice.toLocaleString("ar-DZ") + " دج";

}


/* ============================================================
   EVENTS
   ============================================================ */

document.getElementById("wilaya").addEventListener(
    "change",
    updateOrderSummary
);

document.querySelectorAll('input[name="delivery"]').forEach(radio => {

    radio.addEventListener(
        "change",
        updateOrderSummary
    );

});

document.querySelectorAll('input[name="pack"]').forEach(radio => {

    radio.addEventListener("change", function () {

        const display = document.getElementById("packDisplayValue");

        if (display)
            display.textContent = this.value;

        updateOrderSummary();

    });

});
