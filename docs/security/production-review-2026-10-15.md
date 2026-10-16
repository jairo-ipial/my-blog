# Production security assessment — 2026-10-15

Target: https://blog.jairo-ipial.workers.dev/

Owner-authorized, bounded, non-destructive external assessment of the static blog. Tests used ordinary GET/HEAD requests, two OPTIONS/TRACE probes, a single encoded traversal probe, a harmless query-string script marker, controlled header variations, TLS inspection, and Chromium browser checks. No production data was modified. This is a limited assessment, not a comprehensive penetration-test certification.

## Findings

### Medium: HTTP serves the website without an HTTPS redirect

Two requests to `http://blog.jairo-ipial.workers.dev/` returned `HTTP/1.1 200 OK`, with the actual blog HTML, and no Location header. HTTPS works, but visitors using HTTP can receive unencrypted content. A network attacker on that connection could alter the page or scripts. This site has no tested authenticated transaction, which limits the demonstrated impact.

Reproduce without following redirects:

```bash
curl -sS -D - -o /dev/null http://blog.jairo-ipial.workers.dev/
```

Recommendation: enforce an HTTP-to-HTTPS redirect using routing appropriate to the workers.dev deployment, or a custom-domain HTTPS redirect configuration. Require a 301/308 redirect to the same host, path, and query on HTTPS. Verify that normal assets and the exact Google verification URL still work. Consider HSTS after HTTPS enforcement is verified; the inspected HTTPS response did not include Strict-Transport-Security. Browser HTTPS upgrades or parent-domain HSTS behavior were not audited, so they should not be assumed as the deployment's redirect mechanism.

### Low: CSP is intentionally report-only

The deployed site sends Content-Security-Policy-Report-Only and no enforced Content-Security-Policy. A controlled browser script-injection probe emitted a report-only violation but executed. The probe uses test-runner privileges to insert code; it does not establish an exploitable site injection path.

Recommendation: review legitimate production violations before enforcing a compatible policy. Inline styles currently remain allowed. There is no central reporting endpoint, so visitor reports are not collected. This is a known staged rollout rather than a newly demonstrated XSS vulnerability.

## Successful checks

- TLS certificate validated with the system trust store; negotiated TLS 1.3 with TLS_AES_256_GCM_SHA384. Certificate expiry reported as 2027-01-13 UTC. Older protocol/cipher support was not exhaustively tested.
- Environment files, Git configuration, Wrangler configuration, package.json, and Astro source paths returned 404. The encoded traversal probe returned 400.
- `_headers` and `_redirects` were not publicly served (404).
- The query-string script marker was not reflected as executable HTML in the homepage response.
- A foreign Origin header did not produce an Access-Control-Allow-Origin grant on the homepage response.
- A foreign X-Forwarded-Host value did not replace the production canonical host in the homepage HTML.
- OPTIONS and TRACE on the homepage returned 405.
- Chromium refused iframe embedding because X-Frame-Options is DENY. The report-only frame-ancestors directive alone does not enforce this.
- All 12 existing production security checks passed at the two configured mobile widths: headers, verification GET/HEAD/Googlebot responses, exact verification URL without redirects, trailing-slash routing, sitemap XML, custom 404, language switching, CSS loading, and report-only CSP evaluation.

## Re-run the production regression checks

```bash
TEST_CLOUDFLARE=1 TEST_BASE_URL=https://blog.jairo-ipial.workers.dev npm run test:mobile -- security.spec.ts
```

These regression checks currently do not assert HTTP-to-HTTPS enforcement; passing them does not clear the medium finding.

## Limits

No account access, Cloudflare/GitHub permissions audit, dependency exploit analysis, load testing, brute force, authenticated testing, exhaustive path enumeration, or broad fuzzing. Negative results apply only to the specific paths, payloads, and responses tested. The assessment did not modify deployment settings or remediate findings.

## Remediation prepared locally

Enforced CSP and HSTS are configured and validated locally. The proposed HTTPS redirect Worker was reverted at the owner's request to keep assets-only hosting. The medium finding remains open; HSTS does not replace a first-request HTTP redirect. CSP still requires deployment and a production re-test before closing the low finding. The observations above remain historical evidence.
