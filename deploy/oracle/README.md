# Podman deployment from scratch

This guide uses an Ubuntu 24.04 LTS Oracle VM, rootful Podman with a system Quadlet, and Caddy for static files and automatic HTTPS. Builds happen in WSL; Node.js is not required on the VM. Rootful Podman binds ports 80 and 443 directly without changing rootless port settings. Content updates do not rebuild the container image.

Nothing here has created Oracle resources or published the site. Run cloud steps in your own account. Commands marked VM run after SSH; WSL commands run in the local project.

## 1. Create your Oracle account and VM

1. Register through https://www.oracle.com/cloud/free/ and select your home region carefully. Review verification/payment requirements during signup.
2. In the OCI Console, open Compute → Instances → Create instance. Name it `my-blog` and choose Ubuntu 24.04 LTS.
3. Select an Always Free eligible shape. An Ampere A1 Flex VM with **1 OCPU and 2 GB RAM** is sufficient for this static site; select the ARM-compatible Ubuntu image. Check current tenancy allowances and the cost estimate before creating it. Avoid trial-only paid shapes or paid add-ons if you want to remain within free allowances. Available capacity varies; retry another availability domain in the home region if necessary.
4. Use a boot volume within the free allowance (the default around 50 GB is sufficient; verify the Console estimate). Create a VCN with a public subnet, internet gateway, and route to that gateway. Assign a public IPv4 address.
5. Generate/download the SSH key offered by OCI, or provide your own public key. Keep the private key outside this repository. Save the VM’s public IP.
6. Add stateful ingress rules to the subnet security list or attached network security group: TCP 22 from your own public IP `/32`; TCP 80 and 443 from `0.0.0.0/0`. Preserve required outbound access. This configuration uses TCP HTTPS; HTTP/3 UDP is not exposed.

Current allowances and console details can change. Check https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm rather than relying on old 4-OCPU/24-GB tutorials. Free capacity and uninterrupted availability are not guaranteed; keep source and backups outside the VM.

## 2. Connect from WSL

Replace the IP and key filename below. Store the key in your WSL home directory, not on a Windows-mounted filesystem if permission enforcement is problematic.

```bash
chmod 600 ~/.ssh/oracle-blog.key
ssh -i ~/.ssh/oracle-blog.key ubuntu@YOUR_VM_IP
```

For easier uploads, add a host entry to `~/.ssh/config` in WSL:

```text
Host blog-vm
    HostName YOUR_VM_IP
    User ubuntu
    IdentityFile ~/.ssh/oracle-blog.key
```

Then use `ssh blog-vm`. Verify the SSH host fingerprint before accepting it.

## 3. Install Podman on the VM

```bash
sudo apt update
sudo apt install -y podman curl
podman --version
sudo podman info --format '{{.Host.CgroupsVersion}}'
```

Require Podman with Quadlet support (4.4+), cgroup v2, and systemd. Ubuntu 24.04's distribution package supports this setup. These are system services: always use `sudo podman`, not a separate rootless Podman instance.

Allow HTTP/HTTPS in the VM's existing host firewall too. If UFW is already active:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

OCI images may also have preconfigured iptables/nftables rules. Inspect `sudo iptables -S` and `sudo nft list ruleset` if ports remain unreachable. Add rules through the existing firewall manager; do not flush the firewall or enable another firewall blindly. Preserve SSH access. OCI network ingress and the host firewall must both permit traffic.

Create deployment directories:

```bash
sudo install -d -o ubuntu -g ubuntu /srv/my-blog /srv/my-blog/releases
sudo install -d /etc/my-blog /etc/containers/systemd
```

## 4. Point DuckDNS at the VM

Sign in to https://www.duckdns.org/ and set `jairo-ipial` to the VM's public IPv4 address. Confirm you own this hostname; if unavailable, choose a different one and update both `astro.config.mjs` and `deploy/Caddyfile` before building.

In WSL verify resolution:

```bash
getent ahostsv4 jairo-ipial.duckdns.org
```

It must resolve to the VM IP. Remove incorrect IPv6 records if you have not configured IPv6 networking. Keep the public IP stable or update DuckDNS after an IP change. Never commit the DuckDNS token. Caddy needs public inbound ports 80/443 to obtain certificates.

## 5. Build and upload the first release (WSL)

```bash
npm ci
npm run check
npm run check:types
npm run build
```

Create a unique release name and upload into a new directory. The `rsync` command requires rsync locally and on the VM (`sudo apt install rsync` if missing).

```bash
BLOG_RELEASE=$(date -u +%Y%m%dT%H%M%SZ)
ssh blog-vm "mkdir /srv/my-blog/releases/$BLOG_RELEASE"
rsync -az dist/ "blog-vm:/srv/my-blog/releases/$BLOG_RELEASE/"
scp deploy/Caddyfile deploy/my-blog.container blog-vm:/tmp/
```

The release variable contains only a timestamp; do not use arbitrary shell text as a release name.

## 6. Install and start Caddy (VM)

```bash
sudo install -m 644 /tmp/Caddyfile /etc/my-blog/Caddyfile
sudo install -m 644 /tmp/my-blog.container /etc/containers/systemd/my-blog.container
sudo podman pull docker.io/library/caddy:2-alpine
sudo podman run --rm -v /etc/my-blog/Caddyfile:/etc/caddy/Caddyfile:ro docker.io/library/caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Validate and activate the uploaded release. Replace `RELEASE_TIMESTAMP` with the name from step 5:

```bash
cd /srv/my-blog
test -s releases/RELEASE_TIMESTAMP/index.html
test -s releases/RELEASE_TIMESTAMP/404.html
test -s releases/RELEASE_TIMESTAMP/rss.xml
ln -s releases/RELEASE_TIMESTAMP current.next
mv -Tf current.next current
sudo systemctl daemon-reload
sudo systemctl start my-blog.service
sudo systemctl status my-blog.service
```

The symlink target is relative and remains inside the mounted directory. Atomic rename switches the release. Quadlet's `[Install]` section configures boot startup; do not run `systemctl enable` on the generated transient service. Caddy stores certificates in persistent Podman volumes. Once stable, pin the container image by digest if you need reproducible upgrades.

## 7. Verify the public site (WSL)

```bash
curl -I https://jairo-ipial.duckdns.org/
curl -I https://jairo-ipial.duckdns.org/rss.xml
curl -I https://jairo-ipial.duckdns.org/nonexistent-page-check/
TEST_BASE_URL=https://jairo-ipial.duckdns.org npm run test:mobile
```

Expect HTTP 200 for Home and RSS and HTTP 404 for the missing page, with the custom recovery content. Tests include metadata/image checks and removed template routes. Check sharing previews separately with LinkedIn Post Inspector or Facebook Sharing Debugger. Test HTTP redirects to HTTPS too.

## 8. Publish updates and roll back

Build and upload to another unique timestamp directory as in step 5. Before switching, record the active release on the VM:

```bash
readlink /srv/my-blog/current
```

Validate the new release's files and use the same `current.next`/atomic rename commands from step 6. No container restart is necessary for static content updates. Avoid deploying concurrently: this manual process assumes one operator.

Verify the site immediately. To roll back, switch `current` to the recorded previous release with the same atomic rename. Keep old releases available: existing browsers may still request their hashed assets, which a new release may no longer contain. For frequent updates, retain prior hashed assets in new releases or schedule asset cleanup after an appropriate grace period. Do not delete the active release or certificate volumes.

Configuration changes require:

```bash
sudo systemctl restart my-blog.service
```

## Troubleshooting

```bash
sudo journalctl -u my-blog.service -n 100 --no-pager
sudo podman logs my-blog
sudo ss -ltnp
sudo systemctl cat my-blog.service
```

- HTTPS timeout: verify DuckDNS, OCI ingress, public-subnet route, and VM firewall.
- Certificate failure: inspect logs; ensure ports 80/443 are public and DNS points here. Avoid repeated attempts with broken DNS.
- Service missing: check the Quadlet file location, Podman version, and generator diagnostics; run `sudo systemctl daemon-reload`.
- Missing page returns 200: do not configure an SPA fallback to `index.html`. This site uses real static routes and `404.html`.
- Old content: verify `readlink /srv/my-blog/current` and that your upload contains the new build.

## References

- Oracle free resources: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- Oracle VM/network walkthrough: https://docs.oracle.com/en/learn/lab_compute_instance/index.html
- Podman Quadlet: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Caddy HTTPS: https://caddyserver.com/docs/automatic-https
- Caddy static files: https://caddyserver.com/docs/caddyfile/directives/file_server

The container and HTTPS configuration still need validation on the actual VM; this workspace has neither Podman nor Caddy installed.
