// End-to-end check of the core lifecycle against a running API (dev mode, demo personas seeded):
// signup -> verify -> choose role -> donate -> NGO claims -> volunteer delivers -> donor sees timeline + points.
// Usage: node scripts/smoke.mjs [http://localhost:5001]
import assert from "node:assert/strict";

const API = process.argv[2] || process.env.API_URL || "http://localhost:5001";
const DEMO_PASSWORD = "Demo@1234";

async function call(method, path, { token, body, expect = 200 } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  assert.equal(res.status, expect, `${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

const signin = async (email) =>
  (await call("POST", "/api/auth/signin", { body: { email, password: DEMO_PASSWORD } })).access_token;

const step = (msg) => console.log(`ok - ${msg}`);

// 1. A brand-new donor registers, verifies, then picks a role.
const email = `smoke-${Date.now()}@example.com`;
const signup = await call("POST", "/api/auth/signup", {
  body: { fullName: "Smoke Test", email, password: "SmokeTest#1" }, expect: 201,
});
assert.ok(signup.otp, "dev mode returns the OTP");
await call("POST", "/api/auth/signin", { body: { email, password: "SmokeTest#1" }, expect: 403 });
await call("POST", "/api/auth/verify-otp", { body: { email, token: "000000" }, expect: 400 });
const verified = await call("POST", "/api/auth/verify-otp", { body: { email, token: signup.otp } });
assert.equal(verified.user.role, "pending");
step("signup, wrong OTP rejected, verify");

const chosen = await call("PATCH", "/api/auth/role", { token: verified.access_token, body: { role: "donor" } });
const donor = chosen.access_token;
await call("PATCH", "/api/auth/role", { token: donor, body: { role: "organization" }, expect: 409 });
step("role chosen once; switching later refused");

// 2. Donor posts food.
await call("GET", "/api/donations", { expect: 401 });
const { donation } = await call("POST", "/api/donations", {
  token: donor, expect: 201,
  body: { type: "Vegetarian", foodDetails: [{ name: "Idli", quantity: "30" }], location: "Ghatkopar, Mumbai", contact: "+919999999999" },
});
assert.match(donation.donation_tracking_id, /^FH-[A-Z2-9]{8}$/);
step(`donation created ${donation.donation_tracking_id}`);

// 3. Wrong people can't move it; the NGO claims it.
await call("PATCH", `/api/donations/${donation.id}/status`, { token: donor, body: { status: "requested" }, expect: 403 });
const ngo = await signin("ngo1@feedinghands.dev");
await call("PATCH", `/api/donations/${donation.id}/status`, { token: ngo, body: { status: "requested" } });
const mine = await call("GET", "/api/donations?assigned=me", { token: ngo });
assert.ok(mine.donations.some((d) => d.id === donation.id), "claimed donation is in the NGO's list");
step("NGO claimed; donor can't claim");

// 4. A volunteer picks up and delivers; a second volunteer is locked out.
const vol = await signin("volunteer1@feedinghands.dev");
const vol2 = await signin("volunteer2@feedinghands.dev");
await call("PATCH", `/api/donations/${donation.id}/status`, { token: vol, body: { status: "picked_up" } });
await call("PATCH", `/api/donations/${donation.id}/status`, { token: vol2, body: { status: "in_transit" }, expect: 403 });
await call("PATCH", `/api/donations/${donation.id}/status`, { token: vol, body: { status: "in_transit" } });
await call("PATCH", `/api/donations/${donation.id}/status`, { token: vol, body: { status: "delivered" } });
await call("PATCH", `/api/donations/${donation.id}/status`, { token: donor, body: { status: "cancelled" }, expect: 409 });
step("volunteer delivered; other volunteer locked out; no cancel after delivery");

// 5. Donor sees the full timeline and earned points; the public page hides names.
const full = await call("GET", `/api/donations/${donation.id}`, { token: donor });
assert.deepEqual(full.donation.events.map((e) => e.status), ["available", "requested", "picked_up", "in_transit", "delivered"]);
const me = await call("GET", "/api/auth/me", { token: donor });
assert.equal(me.user.points, 10);
const pub = await call("GET", `/api/donations/tracking/${donation.donation_tracking_id}`);
assert.ok(pub.tracking.events.every((e) => e.actor_name === null), "public timeline has no personal names");
assert.equal(pub.tracking.contact, undefined);
step("timeline complete, 10 points awarded, public tracking anonymised");

// 6. Other donors can't read it.
const other = await signin("donor2@feedinghands.dev");
await call("GET", `/api/donations/${donation.id}`, { token: other, expect: 404 });
step("other donors can't see it");

// 7. Biogas: a donor schedules, a partner collects.
const pickup = await call("POST", "/api/biogas-donations", {
  token: donor, expect: 201,
  body: { food_type: "Vegetable peels", quantity: "12 kg", address: "Ghatkopar", date: new Date().toISOString().slice(0, 10), contact_number: "+919999999999" },
});
await call("PATCH", `/api/biogas-donations/${pickup.donation.id}/status`, { token: donor, body: { status: "collected" }, expect: 403 });
const partner = await signin("biogas1@feedinghands.dev");
const collected = await call("PATCH", `/api/biogas-donations/${pickup.donation.id}/status`, { token: partner, body: { status: "collected" } });
assert.equal(collected.donation.status, "collected");
step("biogas pickup scheduled and collected");

// 8. Stats and public lists don't leak contact details.
const stats = await call("GET", "/api/stats");
assert.equal(stats.weekly.length, 12);
const vols = await call("GET", "/api/volunteers");
assert.ok(vols.volunteers.every((v) => v.email === undefined && v.phone === undefined));
step("stats served; volunteer list has no contact details");

console.log("\nAll smoke checks passed.");
