/* Site-wide "Sign up for discounts & early access" pop-up.
 *
 * Injected on every public page (index, membership, masterclass, contact).
 * Shows a centred modal a moment after the page loads with the company logo,
 * a short header, and name / email / phone fields — the visitor must give at
 * least one of email or phone. On submit it POSTs to /api/subscribe, shows a
 * spinning-logo "thank you" state, then closes.
 *
 * To keep it from nagging, once a visitor signs up we never show it again, and
 * if they dismiss it we hold off for a week (tracked in localStorage).
 */
(function () {
  "use strict";

  var LOGO = "Adders%20Film%20School%20Logo%20110825.png";
  var STORAGE_KEY = "afs_signup_popup";
  var SHOW_DELAY_MS = 1500;          // wait a beat after load before showing
  var DISMISS_COOLDOWN_DAYS = 7;     // re-ask a week after a dismissal
  var CLOSE_AFTER_THANKS_MS = 3200;  // auto-close once they've signed up

  // ---- Should we show it at all? ------------------------------------------
  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (e) {
      return null;
    }
  }
  function writeState(status) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ status: status, ts: Date.now() }));
    } catch (e) { /* ignore private-mode storage errors */ }
  }
  function shouldShow() {
    var s = readState();
    if (!s) return true;
    if (s.status === "signed_up") return false;
    if (s.status === "dismissed") {
      var days = (Date.now() - (s.ts || 0)) / 86400000;
      return days >= DISMISS_COOLDOWN_DAYS;
    }
    return true;
  }

  if (!shouldShow()) return;

  // ---- Build the modal -----------------------------------------------------
  var overlay = document.createElement("div");
  overlay.className = "afs-popup-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "afs-popup-header");
  overlay.innerHTML =
    '<div class="afs-popup">' +
      '<button type="button" class="afs-popup-close" aria-label="Close">&times;</button>' +
      '<div class="afs-popup-form-wrap">' +
        '<h2 class="afs-popup-header" id="afs-popup-header">Sign up now!</h2>' +
        '<p class="afs-popup-sub">Receive discounts and latest information</p>' +
        '<form class="afs-popup-form" novalidate>' +
          '<input type="text" name="name" autocomplete="name" placeholder="Your name (optional)">' +
          '<input type="email" name="email" autocomplete="email" placeholder="Email address">' +
          '<input type="tel" name="phone" autocomplete="tel" placeholder="Phone number">' +
          '<p class="afs-popup-error" role="alert"></p>' +
          '<button type="submit" class="afs-popup-submit">Sign Up Now</button>' +
        '</form>' +
      '</div>' +
      '<div class="afs-popup-thanks">' +
        '<img class="afs-popup-spinner" src="' + LOGO + '" alt="">' +
        '<p class="afs-popup-thanks-title">Thank you!</p>' +
        '<p class="afs-popup-thanks-text">You\'re signed up — welcome to Adders Film School.</p>' +
      '</div>' +
    '</div>';

  var closeBtn = overlay.querySelector(".afs-popup-close");
  var formWrap = overlay.querySelector(".afs-popup-form-wrap");
  var form = overlay.querySelector(".afs-popup-form");
  // Grab inputs explicitly — form.name would collide with the native
  // HTMLFormElement.name property rather than return the name field.
  var nameInput = form.querySelector('input[name="name"]');
  var emailInput = form.querySelector('input[name="email"]');
  var phoneInput = form.querySelector('input[name="phone"]');
  var errorEl = overlay.querySelector(".afs-popup-error");
  var submitBtn = overlay.querySelector(".afs-popup-submit");
  var thanks = overlay.querySelector(".afs-popup-thanks");
  var thanksTitle = overlay.querySelector(".afs-popup-thanks-title");

  // ---- Open / close --------------------------------------------------------
  var closeTimer = null;

  function open() {
    document.body.appendChild(overlay);
    // Force a reflow so the opening transition runs.
    void overlay.offsetWidth;
    overlay.classList.add("is-visible");
    if (emailInput) emailInput.focus();
    document.addEventListener("keydown", onKeydown);
  }

  function remove() {
    document.removeEventListener("keydown", onKeydown);
    if (closeTimer) clearTimeout(closeTimer);
    overlay.classList.remove("is-visible");
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 320);
  }

  function dismiss() {
    writeState("dismissed");
    remove();
  }

  function onKeydown(e) {
    if (e.key === "Escape") dismiss();
  }

  closeBtn.addEventListener("click", dismiss);
  overlay.addEventListener("mousedown", function (e) {
    // Click on the dark backdrop (not the card) dismisses.
    if (e.target === overlay) dismiss();
  });

  // ---- Submit --------------------------------------------------------------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorEl.textContent = "";

    var name = nameInput.value.trim();
    var email = emailInput.value.trim();
    var phone = phoneInput.value.trim();

    if (!email && !phone) {
      errorEl.textContent = "Please give us an email address or a phone number.";
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorEl.textContent = "That email address doesn't look right.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing you up…";

    fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        email: email,
        phone: phone,
        source: (location.pathname || "/").replace(/^\//, "") || "home",
      }),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          throw new Error(result.body && result.body.error ? result.body.error : "Something went wrong.");
        }
        writeState("signed_up");
        showThanks();
      })
      .catch(function (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign Up Now";
        errorEl.textContent = err.message || "Sorry, something went wrong. Please try again.";
      });
  });

  function showThanks() {
    formWrap.style.display = "none";
    thanks.classList.add("is-active");
    // Give a personal touch if we know their name.
    var name = nameInput.value.trim();
    if (name) {
      thanksTitle.textContent = "Thank you, " + name + "!";
    }
    closeTimer = setTimeout(remove, CLOSE_AFTER_THANKS_MS);
  }

  // ---- Kick it off ---------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(open, SHOW_DELAY_MS);
    });
  } else {
    setTimeout(open, SHOW_DELAY_MS);
  }
})();
