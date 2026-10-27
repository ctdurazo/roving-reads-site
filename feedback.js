(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const form = el("feedback-form"), button = el("submit"), status = el("status");
  const config = window.ROVING_FEEDBACK || {};
  let endpoint;
  try { const url = new URL(config.endpoint); if (url.protocol === "https:" && !url.username && !url.password) endpoint = url.href; } catch { /* show unavailable below */ }
  if (!endpoint) { button.disabled = true; status.textContent = "Feedback is temporarily unavailable. Please try again later."; }
  const email = config.supportEmail;
  if (typeof email === "string" && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)) {
    el("support-link").href = `mailto:${email}`;
    el("support").hidden = false;
  }
  el("contact").addEventListener("change", () => {
    const enabled = el("contact").checked;
    el("email-section").hidden = !enabled;
    el("email").required = enabled;
    if (!enabled) el("email").value = "";
  });
  el("diagnostics").addEventListener("change", () => { el("details").hidden = !el("diagnostics").checked; });
  let busy = false, completed = false;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!endpoint || busy || completed || !form.reportValidity()) return;
    busy = true; button.disabled = true;
    status.textContent = "Sending feedback…";
    const body = { category: el("category").value, description: el("description").value.trim(),
      contactPermission: el("contact").checked, website: el("website").value };
    if (body.contactPermission) body.email = el("email").value.trim();
    if (el("diagnostics").checked) body.diagnostics = { platform: el("platform").value, appVersion: el("version").value.trim() };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "omit", referrerPolicy: "no-referrer", body: JSON.stringify(body), signal: controller.signal });
      const data = await response.json();
      if (response.status === 201 && data.ok === true && /^[a-f0-9]{32}$/.test(data.reference)) {
        completed = true;
        form.hidden = true;
        form.reset();
        status.textContent = `Thank you. Your feedback was received. Reference: ${data.reference}. Keep this reference if you contact support.`;
      } else if (response.status === 429) {
        status.textContent = "Feedback is busy right now. Your report has not been submitted. Please try again later.";
      } else if (response.status === 400) {
        status.textContent = "Please check the category, description and email address, then try again.";
      } else throw new Error("unavailable");
    } catch {
      status.textContent = "We could not confirm delivery. Your text is still here; please try again later. If you already received a reference, do not resubmit.";
    } finally { clearTimeout(timer); busy = false; button.disabled = completed; }
  });
})();
