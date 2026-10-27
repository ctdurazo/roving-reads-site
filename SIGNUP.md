# Email-only private beta waitlist

The existing Join Early Access links scroll to an email-only form. Request Access
POSTs only `{email}` to `/beta-signups`. It does not create an account, grant
membership, send email, or subscribe anyone to marketing. The visible notice
explains beta-invitation contact and 90-day retention without adding a checkbox.

Deploy API and site together, install reviewed schema indexes, then enable
`BETA_SIGNUP_ENABLED=true` in the API runtime. The feature defaults to disabled.
`signup-config.js` contains the public API URL, not credentials. CORS reuses the
landing-site origins configured for feedback. Success is shown only after the
API confirms durable storage. Network/server errors keep the email for retry;
parallel taps are suppressed. Duplicate addresses get the same acknowledgment
and one record, including across workers. Retries do not renew retention.

Run `flask --app wsgi beta-signups --limit 100` in the restricted operator shell.
Use `--after LAST_ID` for the next page. Output contains private email addresses:
never paste it in public Trello cards or CI logs. Operators manually review the
waitlist and contact people about beta access. No outbound email service or
mailbox is configured, and addresses are not verified. Do not send unsolicited
marketing. The only participant-supplied stored field is normalized email;
server timestamps and an opaque deterministic ID support retention/deduplication.

A shared global 100-attempt/ten-minute cap protects intake across workers. No IP,
account identifiers, diagnostics or ratings are stored by the signup feature.
Errors never echo addresses. A 90-day Mongo TTL requires the schema install;
cleanup is asynchronous and backups have a separate retention policy. Beta
readiness requires a named waitlist operator and a monitored sending mailbox.

Tests: `node --test tests/*.test.cjs`; API unit and real-Mongo concurrency tests
live in `roving_reads`. These do not send live invitations or prove deployed
receipt. Before enabling recruitment, submit a test address in a deployed browser,
confirm private CLI receipt, repeat with changed case, and verify one row and
unchanged timestamp. Check keyboard/Enter submission, invalid email, offline retry,
429, disabled intake and mobile layout. Do not use real participant addresses in tests.

## Review

Requests start pending and require a manual approval/rejection. Use the private
`beta-signup-review REQUEST_ID --decision approved|rejected --reviewer OPERATOR`
Flask command. The list defaults to pending; `--status approved|rejected|all`
filters other states. Status/time/reviewer are server metadata, not form fields.
Repeating an active signup preserves decisions. Legacy rows are pending. An
expired request starts pending again. No approval status is exposed publicly.
Approval controls which request receives an invitation; it does not restrict
app sign-in or grant membership. Notifications and invitation delivery require
a configured operator channel; neither is automatic in this review-only step.
