# Beta feedback deployment

`feedback.html` is the public intake form. `feedback-config.js` supplies a public
API URL and optional monitored support email; it must never contain secrets.
The form sends no account credentials, identity, URL parameters or browser
fingerprint. Contact/email and platform/app version require explicit opt-in.
No data is saved in browser storage. Reports are acknowledged only on API 201
with a reference; failures preserve text and never imply successful delivery.
The backend inbox is MongoDB, not email. Set a monitored support email before
inviting beta participants. There are no automatic email notifications yet.

Deploy the Flask API first, run its reviewed schema installation, and enable
`FEEDBACK_ENABLED=true`. Then deploy this static site and the updated mobile/web
app. Follow `roving_reads/docs/beta-feedback.md` for operator inbox commands,
90-day retention, triage, escalation and live acceptance. The form API has a
shared global 100-attempt/ten-minute cap. It must not be exposed without the
backend validation/admission controls. CORS allows rovingreads.com/www origins.

Run the submission state/contract tests with `node --test tests/*.test.cjs`.
These use a minimal DOM harness, not a real browser or deployed receipt test.
Verify labels, mobile layout, keyboard navigation and actual delivery on the
supported browsers/builds before beta. No live deployment is performed by tests.
