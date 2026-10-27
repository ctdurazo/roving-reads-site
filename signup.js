(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const form = el("beta-signup-form"), button = el("beta-submit"), status = el("beta-status");
  let endpoint;
  try {
    const url = new URL((window.ROVING_SIGNUP || {}).endpoint);
    if (url.protocol === "https:" && !url.username && !url.password) endpoint = url.href;
  } catch { /* unavailable state below */ }
  if (!endpoint) {
    button.disabled = true;
    status.textContent = "Beta signup is temporarily unavailable. Please try again later.";
  }
  let busy = false, complete = false;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!endpoint || busy || complete || !form.reportValidity()) return;
    busy = true; button.disabled = true;
    status.textContent = "Requesting access…";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, { method: "POST", credentials: "omit", referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: el("beta-email").value.trim() }), signal: controller.signal });
      const data = await response.json();
      if (response.status === 200 && data.ok === true) {
        complete = true;
        form.reset(); form.hidden = true;
        status.textContent = "Thanks—your request was received and is pending approval. We’ll email you if your request is approved and a beta spot is available.";
      } else if (response.status === 400) {
        status.textContent = "Please enter a valid email address and try again.";
      } else if (response.status === 429) {
        status.textContent = "Beta signup is busy right now. Please try again later.";
      } else throw new Error("unavailable");
    } catch {
      status.textContent = "We could not confirm your request. Your email is still here; please try again later. Repeating a request won’t add you twice.";
    } finally { clearTimeout(timer); busy = false; button.disabled = complete; }
  });
})();
