// Minimal Spotify Venn app
// Features: Connect (PKCE), pull top artists/tracks, save snapshot under Spotify ID, compare via invite username, render simple Venn.

const STORAGE_KEY = "spotify_venn_profiles_v1";
const TOKEN_KEY = "spotify_venn_token_v1";
const STATE_KEY = "spotify_venn_oauth_state_v1";
const VERIFIER_KEY = "spotify_venn_oauth_verifier_v1";
const FRIENDS_KEY = "spotify_venn_friends_v1";

const ui = {
  connectSpotify: document.getElementById("connect-spotify"),
  pullData: document.getElementById("pull-data"),
  compare: document.getElementById("compare"),
  authChip: document.getElementById("auth-chip"),
  authStatus: document.getElementById("auth-status"),
  snapshotStatus: document.getElementById("snapshot-status"),
  compareStatus: document.getElementById("compare-status"),
  meSummary: document.getElementById("me-summary"),
  sharedArtists: document.getElementById("shared-artists"),
  sharedTracks: document.getElementById("shared-tracks"),
  venn: document.getElementById("venn"),
  copyInvite: document.getElementById("copy-invite"),
  shareInvite: document.getElementById("share-invite"),
  inviteLink: document.getElementById("invite-link"),
  compareSplit: document.getElementById("compare-split"),
  compareAvatars: document.getElementById("compare-avatars"),
  toast: document.getElementById("toast"),
  friendsList: document.getElementById("friends-list"),
  viz: document.getElementById("viz"),
  scoreLine: document.getElementById("score-line"),
  themeToggle: document.getElementById("theme-toggle"),
};

const state = {
  spotifyUser: null,
  mySnapshot: null,
  invitedUsername: null,
  currentFriend: null,
};

init();

async function init() {
  bindEvents();
  applyInviteFromUrl();
  await handleOAuthCallback();
  const token = getToken();
  setAuthState(token ? "connected" : "neutral", token ? "Spotify connected" : "Not connected");
  // Gate compare until ready and reflect invite state
  setCompareReady(false);
  updateCompareUIForInvite();
  // Seed UI
  renderFriendsList();
  renderInitialViz();
  // Apply saved theme
  applySavedTheme();
}

function bindEvents() {
  ui.connectSpotify && ui.connectSpotify.addEventListener("click", startSpotifyAuth);
  ui.pullData && ui.pullData.addEventListener("click", loadMyListeningData);
  // Auto-save on pull; no explicit save button anymore
  if (ui.compare) ui.compare.addEventListener("click", compareUsers);
  ui.copyInvite.addEventListener("click", copyInviteLink);
  ui.shareInvite.addEventListener("click", shareInviteLink);
  ui.themeToggle && ui.themeToggle.addEventListener("click", toggleTheme);
}

function setAuthState(mode, message) {
  const chipClass = {
    neutral: "chip chip-neutral",
    connected: "chip chip-success",
    error: "chip chip-error",
  };
  ui.authChip.className = chipClass[mode] || chipClass.neutral;
  ui.authChip.textContent = mode === "connected" ? "Connected" : mode === "error" ? "Error" : "Not connected";
  ui.authStatus.textContent = message;
}

function getClientId() {
  return document.querySelector('meta[name="spotify-client-id"]')?.content?.trim() || "";
}

function getRedirectUri() {
  const meta = document.querySelector('meta[name="spotify-redirect-uri"]')?.content?.trim();
  if (meta) return meta;
  const url = new URL(window.location.href);
  url.search = ""; url.hash = "";
  if (url.pathname.endsWith("index.html")) url.pathname = url.pathname.slice(0, -10);
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.toString();
}

function validateAuthPreflight() {
  const clientId = getClientId();
  const redirectUri = getRedirectUri();
  if (!clientId) return "Missing Client ID. Set meta[spotify-client-id].";
  try { new URL(redirectUri); } catch { return "Invalid redirect URI."; }
  const host = new URL(redirectUri).hostname;
  const isHttps = redirectUri.startsWith("https:");
  if (!isHttps && host !== "127.0.0.1" && host !== "[::1]") return "Redirect must be HTTPS or 127.0.0.1.";
  return "";
}

async function startSpotifyAuth() {
  const pre = validateAuthPreflight();
  if (pre) { setAuthState("error", pre); return; }
  const clientId = getClientId();
  const redirectUri = getRedirectUri();
  const stateToken = randomString(18);
  const verifier = randomString(64);
  let challenge = verifier, method = "plain";
  try { challenge = await pkceChallenge(verifier); method = "S256"; } catch {}
  localStorage.setItem(STATE_KEY, stateToken);
  localStorage.setItem(VERIFIER_KEY, verifier);
  const auth = new URL("https://accounts.spotify.com/authorize");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("redirect_uri", redirectUri);
  // Request broader scopes to approximate "ever listened" via saved/followed
  auth.searchParams.set("scope", "user-read-private user-top-read user-library-read user-follow-read");
  auth.searchParams.set("show_dialog", "true");
  auth.searchParams.set("code_challenge_method", method);
  auth.searchParams.set("code_challenge", challenge);
  auth.searchParams.set("state", stateToken);
  const url = auth.toString();
  // Robust navigation
  window.open(url, "_blank");
  window.location.href = url;
  setTimeout(() => { try { window.location.assign(url); } catch {} try { window.location.replace(url); } catch {} }, 50);
}

async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const incomingState = params.get("state");
  if (!code) return;
  const expectedState = localStorage.getItem(STATE_KEY);
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!incomingState || incomingState !== expectedState || !verifier) {
    setAuthState("error", "Auth state mismatch.");
    clearOAuthParams(); return;
  }
  const clientId = getClientId();
  try {
    const body = new URLSearchParams({ client_id: clientId, grant_type: "authorization_code", code, redirect_uri: getRedirectUri(), code_verifier: verifier });
    const res = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
    const data = await res.json();
    const expiresAt = Date.now() + Math.max((data.expires_in || 3600) - 60, 60) * 1000;
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt }));
    setAuthState("connected", "Spotify connected.");
  } catch (err) {
    setAuthState("error", err.message || "Auth failed");
  } finally {
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(VERIFIER_KEY);
    clearOAuthParams();
  }
}

function clearOAuthParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
}

function getToken() {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try { const t = JSON.parse(raw); return (t && t.accessToken && t.expiresAt) ? t : null; } catch { return null; }
}

async function getValidAccessToken() {
  const token = getToken();
  if (!token) return null;
  if (Date.now() < token.expiresAt) return token.accessToken;
  if (!token.refreshToken) return null;
  const body = new URLSearchParams({ client_id: getClientId(), grant_type: "refresh_token", refresh_token: token.refreshToken });
  const res = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) { localStorage.removeItem(TOKEN_KEY); return null; }
  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken: data.access_token, refreshToken: data.refresh_token || token.refreshToken, expiresAt: Date.now() + Math.max((data.expires_in || 3600) - 60, 60) * 1000 }));
  return data.access_token;
}

async function spotifyGet(path) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("No valid Spotify session.");
  const res = await fetch(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Spotify error (${res.status})`);
  return res.json();
}

async function loadMyListeningData() {
  ui.snapshotStatus.textContent = "Loading your listening data...";
  try {
    const [me, topArtistsLong, topTracksLong] = await Promise.all([
      spotifyGet("/me"),
      spotifyGet("/me/top/artists?limit=50&time_range=long_term"),
      spotifyGet("/me/top/tracks?limit=50&time_range=long_term"),
    ]);
    // Try to merge in saved tracks and followed artists to expand coverage.
    // These may fail if scopes not granted; we'll ignore errors gracefully.
    let savedTrackArtists = [];
    let followedArtists = [];
    try { savedTrackArtists = await fetchSavedTrackArtists(350); } catch {}
    try { followedArtists = await fetchFollowedArtists(200); } catch {}
    // Union artist IDs across sources
    const artistMap = new Map();
    const addArtist = (a)=> { if (!a || !a.id) return; if (!artistMap.has(a.id)) artistMap.set(a.id, { id: a.id, name: a.name }); };
    (topArtistsLong.items||[]).forEach(a=> addArtist({id:a.id,name:a.name}));
    (topTracksLong.items||[]).forEach(t=> (t.artists||[]).forEach(a=> addArtist({id:a.id,name:a.name})));
    savedTrackArtists.forEach(a=> addArtist(a));
    followedArtists.forEach(a=> addArtist(a));
    state.spotifyUser = { id: me.id, displayName: me.display_name || me.id, imageUrl: (me.images && me.images[0] && me.images[0].url) || "" };
    state.mySnapshot = {
      spotifyUserId: me.id,
      spotifyDisplayName: me.display_name || me.id,
      spotifyImageUrl: (me.images && me.images[0] && me.images[0].url) || "",
      capturedAt: new Date().toISOString(),
      artists: Array.from(artistMap.values()),
      tracks: (topTracksLong.items || []).map((t) => ({ id: t.id, name: t.name, artists: (t.artists || []).map((a) => a.name).join(", ") })),
    };
    // Auto-save snapshot under your Spotify ID
    const key = normalizeUsername(state.mySnapshot.spotifyUserId);
    const profiles = readProfiles(); profiles[key] = state.mySnapshot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    // Update UI
    renderMeSummary(state.mySnapshot);
    ui.snapshotStatus.textContent = `Snapshot saved for @${key}`;
    // Build invite link and show single-circle viz immediately
    const url = buildInviteUrl(); if (url) ui.inviteLink.value = url;
    renderVizSingle(state.mySnapshot);
    updateCompareUIForInvite();
  } catch (err) {
    ui.snapshotStatus.textContent = err.message || "Failed to load.";
  }
}

// Fetch a sample of saved tracks and return unique artists
async function fetchSavedTrackArtists(maxItems=300) {
  const pageSize = 50; let offset = 0; const artists = new Map();
  while (offset < maxItems) {
    const limit = Math.min(pageSize, maxItems - offset);
    const data = await spotifyGet(`/me/tracks?limit=${limit}&offset=${offset}`);
    for (const item of (data.items||[])) {
      const track = item.track; if (!track) continue;
      for (const a of (track.artists||[])) {
        if (a && a.id && !artists.has(a.id)) artists.set(a.id, { id: a.id, name: a.name });
      }
    }
    offset += limit;
    if (!data.next) break;
  }
  return Array.from(artists.values());
}

// Fetch a sample of followed artists
async function fetchFollowedArtists(maxItems=200) {
  // Spotify uses cursor pagination for followed artists with 'after'
  const pageSize = 50; let collected = 0; let after = undefined; const artists = new Map();
  while (collected < maxItems) {
    const qs = new URLSearchParams({ type: "artist", limit: String(Math.min(pageSize, maxItems - collected)) });
    if (after) qs.set("after", after);
    const data = await spotifyGet(`/me/following?${qs.toString()}`);
    const items = (data.artists && data.artists.items) || [];
    for (const a of items) { if (a && a.id && !artists.has(a.id)) artists.set(a.id, { id: a.id, name: a.name }); }
    collected += items.length;
    after = (data.artists && data.artists.cursors && data.artists.cursors.after) || undefined;
    if (!after || items.length === 0) break;
  }
  return Array.from(artists.values());
}

function renderMeSummary(s) {
  ui.meSummary.innerHTML = [
    `<div class="list-item"><strong>Spotify profile:</strong> ${escapeHtml(s.spotifyDisplayName)}</div>`,
    `<div class="list-item"><strong>Top artists:</strong> ${s.artists.slice(0,5).map((a)=>escapeHtml(a.name)).join(", ")}</div>`,
    `<div class="list-item"><strong>Top tracks:</strong> ${s.tracks.slice(0,5).map((t)=>escapeHtml(t.name)).join(", ")}</div>`,
  ].join("");
}

function saveSnapshot() {
  if (!state.mySnapshot) { ui.snapshotStatus.textContent = "Pull listening data first."; return; }
  const key = normalizeUsername(state.mySnapshot.spotifyUserId);
  const profiles = readProfiles(); profiles[key] = state.mySnapshot;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  ui.snapshotStatus.textContent = `Saved snapshot for @${key}`;
  // Build invite link immediately for convenience
  const url = buildInviteUrl();
  if (url) ui.inviteLink.value = url;
  updateCompareUIForInvite();
  renderInitialViz();
}

function readProfiles() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {}; try { return JSON.parse(raw) || {}; } catch { return {}; }
}

function getProfile(username) {
  const profiles = readProfiles(); return profiles[username] || null;
}

function applyInviteFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const invited = normalizeUsername(params.get("invite") || "");
  const snapshotParam = params.get("snapshot") || "";
  if (invited) {
    state.invitedUsername = invited;
    ui.compareStatus.textContent = `Invite loaded for @${invited}`;
    if (snapshotParam) {
      try {
        const otherSnapshot = decodeSnapshotFromUrl(snapshotParam);
        if (otherSnapshot && otherSnapshot.spotifyUserId) {
          const profiles = readProfiles();
          profiles[normalizeUsername(otherSnapshot.spotifyUserId)] = otherSnapshot;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
          addOrUpdateFriend({
            id: normalizeUsername(otherSnapshot.spotifyUserId),
            displayName: otherSnapshot.spotifyDisplayName || invited,
            imageUrl: otherSnapshot.spotifyImageUrl || "",
          });
        }
      } catch {}
    }
    updateCompareUIForInvite();
    renderFriendsList();
  }
}

function compareUsers() {
  const meKey = normalizeUsername(state.spotifyUser?.id || state.mySnapshot?.spotifyUserId || "");
  const otherKey = normalizeUsername(state.invitedUsername || "");
  if (!meKey || !otherKey) { ui.compareStatus.textContent = "Open a friend’s invite link to compare."; setCompareReady(false); return; }
  const me = getProfile(meKey); const other = getProfile(otherKey);
  if (!me || !other) { ui.compareStatus.textContent = "One or both snapshots missing"; return; }
  setCompareReady(true);
  // Ensure avatar images are present; fetch other user image if missing
  Promise.resolve().then(async () => {
    if (!me.spotifyImageUrl) {
      try { const m = await spotifyGet("/me"); me.spotifyImageUrl = (m.images && m.images[0] && m.images[0].url) || ""; } catch {}
    }
    if (!other.spotifyImageUrl) {
      try { const u = await spotifyGet(`/users/${encodeURIComponent(other.spotifyUserId)}`); other.spotifyImageUrl = (u.images && u.images[0] && u.images[0].url) || ""; } catch {}
    }
    showCompareAvatars({
      me: { name: me.spotifyDisplayName || meKey, imageUrl: me.spotifyImageUrl || "" },
      other: { name: other.spotifyDisplayName || otherKey, imageUrl: other.spotifyImageUrl || "" },
    });
  });
  const artists = overlap(me.artists, other.artists, (x)=>x.id);
  const tracks = overlap(me.tracks, other.tracks, (x)=>x.id);
  const sharedCount = artists.shared.length + tracks.shared.length;
  const meUniverse = me.artists.length + me.tracks.length;
  const otherUniverse = other.artists.length + other.tracks.length;
  const mePct = meUniverse ? Math.round(sharedCount*100/meUniverse) : 0;
  const otherPct = otherUniverse ? Math.round(sharedCount*100/otherUniverse) : 0;
  ui.compareStatus.textContent = `@${normalizeUsername(me.spotifyDisplayName||meKey)} vs @${otherKey} · shared ${sharedCount}`;
  renderList(ui.sharedArtists, artists.shared.map((a)=>a.name), "No shared artists.");
  renderList(ui.sharedTracks, tracks.shared.map((t)=>`${t.name} - ${t.artists}`), "No shared tracks.");
  renderVenn({ meUsername: normalizeUsername(me.spotifyDisplayName||meKey), otherUsername: otherKey, mePct, otherPct, sharedCount });
}

function overlap(left, right, idFn) {
  const r = new Set((right||[]).map(idFn));
  const shared = (left||[]).filter((x)=>r.has(idFn(x)));
  return { shared };
}

function renderList(el, items, empty) {
  if (!items.length) { el.innerHTML = `<div class="list-item">${escapeHtml(empty)}</div>`; return; }
  el.innerHTML = items.slice(0,30).map((x)=>`<div class="list-item">${escapeHtml(x)}</div>`).join("");
}

function renderVenn({ meUsername, otherUsername, mePct, otherPct, sharedCount }) {
  ui.venn.innerHTML = `
  <svg viewBox="0 0 580 250" aria-label="Venn diagram overlap">
    <rect x="0" y="0" width="580" height="250" fill="#ffffff" rx="14"></rect>
    <circle cx="220" cy="130" r="88" fill="rgba(80,170,255,0.45)"></circle>
    <circle cx="360" cy="130" r="88" fill="rgba(29,185,84,0.45)"></circle>
    <text x="120" y="44" font-size="16" fill="#1d2a4d">@${escapeHtml(meUsername)}</text>
    <text x="370" y="44" font-size="16" fill="#164527">@${escapeHtml(otherUsername)}</text>
    <text x="170" y="130" font-size="24" fill="#10315f">${mePct}%</text>
    <text x="320" y="130" font-size="24" fill="#174a2c">${otherPct}%</text>
    <text x="257" y="130" font-size="18" fill="#101010">${sharedCount}</text>
    <text x="246" y="150" font-size="11" fill="#101010">shared</text>
  </svg>`;
}

function setCompareReady(ready) {
  if (ui.venn) ui.venn.style.display = ready ? "block" : "none";
  if (ui.compareSplit) ui.compareSplit.style.display = ready ? "grid" : "none";
  if (ui.compareAvatars) ui.compareAvatars.style.display = ready ? "flex" : "none";
  if (ui.compare) {
    ui.compare.disabled = !ready;
    ui.compare.textContent = ready ? "Build Venn" : "Awaiting invite";
  }
}

function showCompareAvatars({ me, other }) {
  const meHtml = avatarHtml(me.name, me.imageUrl);
  const otherHtml = avatarHtml(other.name, other.imageUrl);
  ui.compareAvatars.innerHTML = `
    <div class="avatar-col">
      ${meHtml}
      <div class="avatar-name">${escapeHtml(me.name)}</div>
    </div>
    <div class="avatar-col">
      ${otherHtml}
      <div class="avatar-name">${escapeHtml(other.name)}</div>
    </div>
  `;
}

function avatarHtml(name, imageUrl) {
  const initials = String(name||"?").trim().slice(0,2).toUpperCase();
  const base = '<div class="avatar" style="width:72px;height:72px;border-radius:50%;background:#e9edf6;display:flex;align-items:center;justify-content:center;font-weight:600;color:#1e2a44;">'+initials+'</div>';
  if (!imageUrl) return base;
  return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" class="avatar" style="width:72px;height:72px;border-radius:50%;object-fit:cover;">`;
}

function updateCompareUIForInvite() {
  const meKey = normalizeUsername(state.spotifyUser?.id || state.mySnapshot?.spotifyUserId || "");
  const otherKey = normalizeUsername(state.invitedUsername || "");
  const me = meKey ? getProfile(meKey) : null;
  const other = otherKey ? getProfile(otherKey) : null;
  // Show avatars header even before both snapshots, with placeholders
  if (ui.compareAvatars) {
    const meName = (me && me.spotifyDisplayName) || (state.spotifyUser && state.spotifyUser.displayName) || (state.mySnapshot && state.mySnapshot.spotifyDisplayName) || "You";
    const meImg = (me && me.spotifyImageUrl) || (state.spotifyUser && state.spotifyUser.imageUrl) || (state.mySnapshot && state.mySnapshot.spotifyImageUrl) || "";
    const otherName = (other && other.spotifyDisplayName) || (otherKey ? `@${otherKey}` : "Friend");
    const otherImg = (other && other.spotifyImageUrl) || "";
    showCompareAvatars({ me: { name: meName, imageUrl: meImg }, other: { name: otherName, imageUrl: otherImg } });
  }
  const ready = Boolean(me && other);
  setCompareReady(ready);
}

function normalizeUsername(x) { return String(x||"").trim().toLowerCase().replace(/[^a-z0-9_-]/g, ""); }

function randomString(n) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes).map((b)=>alphabet[b%alphabet.length]).join("");
}

async function pkceChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = ""; bytes.forEach((b)=>{ bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function encodeSnapshotForUrl(snapshot) {
  const encoder = new TextEncoder();
  const json = JSON.stringify(snapshot);
  const bytes = encoder.encode(json);
  return base64UrlEncode(bytes);
}

function decodeSnapshotFromUrl(str) {
  const bytes = base64UrlDecode(str);
  const decoder = new TextDecoder();
  const json = decoder.decode(bytes);
  return JSON.parse(json);
}

function buildInviteUrl() {
  if (!state.mySnapshot) { showToast("Save your snapshot first"); return ""; }
  const s = state.mySnapshot;
  const compact = {
    spotifyUserId: s.spotifyUserId,
    spotifyDisplayName: s.spotifyDisplayName,
    spotifyImageUrl: s.spotifyImageUrl || "",
    capturedAt: s.capturedAt,
    artists: (s.artists||[]).slice(0,20),
    tracks: (s.tracks||[]).slice(0,20),
  };
  const snapshotParam = encodeSnapshotForUrl(compact);
  const url = new URL(window.location.href);
  url.search = ""; // reset existing params
  url.hash = "";
  url.searchParams.set("invite", normalizeUsername(s.spotifyUserId));
  url.searchParams.set("snapshot", snapshotParam);
  return url.toString();
}

function copyInviteLink() {
  const url = buildInviteUrl();
  if (!url) return;
  ui.inviteLink.value = url;
  navigator.clipboard?.writeText(url).then(()=>{
    showToast("Invite copied");
  }).catch(()=>{
    showToast("Copy failed; select and copy manually");
  });
}

function shareInviteLink() {
  const url = buildInviteUrl();
  if (!url) return;
  ui.inviteLink.value = url;
  if (navigator.share) {
    navigator.share({ title: "Spotify Venn Invite", text: "Compare our listening overlap", url })
      .then(()=>showToast("Invite shared"))
      .catch(()=>{ /* ignored */ });
  } else {
    copyInviteLink();
  }
}

function showToast(msg) {
  if (!ui.toast) return;
  ui.toast.textContent = msg;
  ui.toast.style.opacity = "1";
  ui.toast.style.transform = "translateY(0)";
  setTimeout(()=>{ ui.toast.style.opacity = "0"; }, 1800);
}

function escapeHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }

// Theme handling
function applySavedTheme() {
  const saved = localStorage.getItem("spotify_venn_theme");
  const mode = saved === "dark" ? "dark" : "light";
  setTheme(mode);
}

function toggleTheme() {
  const isDark = document.body.classList.contains("theme-dark");
  setTheme(isDark ? "light" : "dark");
}

function setTheme(mode) {
  if (mode === "dark") {
    document.body.classList.add("theme-dark");
    localStorage.setItem("spotify_venn_theme", "dark");
    if (ui.themeToggle) ui.themeToggle.textContent = "Light mode";
  } else {
    document.body.classList.remove("theme-dark");
    localStorage.setItem("spotify_venn_theme", "light");
    if (ui.themeToggle) ui.themeToggle.textContent = "Dark mode";
  }
}

// Friends storage
function readFriends() {
  const raw = localStorage.getItem(FRIENDS_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}

function saveFriends(map) {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(map));
}

function addOrUpdateFriend({ id, displayName, imageUrl }) {
  if (!id) return;
  const map = readFriends();
  map[id] = { id, displayName: displayName || id, imageUrl: imageUrl || "", updatedAt: Date.now() };
  saveFriends(map);
}

function renderFriendsList() {
  if (!ui.friendsList) return;
  const map = readFriends();
  const entries = Object.values(map).sort((a,b)=> (b.updatedAt||0)-(a.updatedAt||0));
  if (!entries.length) { ui.friendsList.innerHTML = '<div class="list-item">No friends yet. Open an invite link to add one.</div>'; return; }
  ui.friendsList.innerHTML = entries.map(f => friendItemHtml(f)).join("");
  // Bind clicks
  entries.forEach(f => {
    const el = document.getElementById(`friend-${f.id}`);
    if (el) el.addEventListener("click", ()=> selectFriend(f.id));
  });
}

function friendItemHtml(f) {
  const initials = String(f.displayName||f.id).trim().slice(0,2).toUpperCase();
  const avatar = f.imageUrl ? `<img class="friend-avatar" src="${escapeHtml(f.imageUrl)}" alt="${escapeHtml(f.displayName||f.id)}">` : `<div class="friend-avatar">${initials}</div>`;
  return `<div id="friend-${escapeHtml(f.id)}" class="friend-item" role="button" tabindex="0" aria-label="Compare with ${escapeHtml(f.displayName||f.id)}">
    ${avatar}
    <div>
      <div class="friend-name">${escapeHtml(f.displayName||f.id)}</div>
      <div class="friend-sub">@${escapeHtml(f.id)}</div>
    </div>
  </div>`;
}

function selectFriend(id) {
  state.currentFriend = id;
  const me = getMyProfile();
  const other = getProfile(id);
  if (me && other) {
    renderVizVenn(me, other);
  } else if (me) {
    renderVizSingle(me);
  }
}

function getMyProfile() {
  const meKey = normalizeUsername(state.spotifyUser?.id || state.mySnapshot?.spotifyUserId || "");
  return meKey ? getProfile(meKey) : null;
}

function renderInitialViz() {
  const me = getMyProfile();
  if (me) renderVizSingle(me); else if (ui.viz) ui.viz.innerHTML = '';
}

// Visualization helpers
function renderVizSingle(me) {
  if (!ui.viz) return;
  const W = 640, H = 420; const cx = W/2, cy = H/2 + 10;
  const count = new Set((me.artists||[]).map(a=>a.id)).size;
  const r = scaleRadius(count);
  const artists = (me.artists||[]).slice(0,60);
  const placed = [];
  const nodes = placeNodesInCircle(artists, { cx, cy, r }, placed);
  ui.viz.innerHTML = `
    <svg class="viz-svg" viewBox="0 0 ${W} ${H}">
      <circle class="circle-single" cx="${cx}" cy="${cy}" r="${r}" />
      <text class="label" x="${cx - 70}" y="${cy - r - 16}">@${escapeHtml(me.spotifyDisplayName||'you')}</text>
      ${nodes.map(n => artistText(n)).join('')}
    </svg>
  `;
  ui.scoreLine.textContent = "";
}

function renderVizVenn(me, other) {
  if (!ui.viz) return;
  const W = 760, H = 500; const cy = 270;
  const leftSet = new Set((me.artists||[]).map(a=>a.id));
  const rightSet = new Set((other.artists||[]).map(a=>a.id));
  const overlapIds = new Set([...leftSet].filter(x=> rightSet.has(x)));
  // Use full-set counts for the score (do NOT use sliced arrays)
  const intersectionCount = overlapIds.size;
  const unionCount = new Set([...leftSet, ...rightSet]).size;
  const pct = unionCount ? Math.round((intersectionCount * 100) / unionCount) : 0;
  // Radii scale with artist counts (softly, clamped)
  const rLeft = scaleRadius(leftSet.size);
  const rRight = scaleRadius(rightSet.size);
  // Determine circle separation based on overlap fraction using general geometry
  const ftarget = unionCount ? (intersectionCount / unionCount) : 0;
  let d = computeDistanceForOverlapFractionGeneral(ftarget, rLeft, rRight);
  // Add a small visual gap when f=0 to emphasize separation
  if (ftarget <= 0) d = rLeft + rRight + 8;
  // Center circles horizontally
  const cx1 = (W/2) - (d/2);
  const cx2 = (W/2) + (d/2);
  const rMLeft = rLeft - 12;
  const rMRight = rRight - 12;
  // Slice only for rendering density
  const leftOnly = (me.artists||[]).filter(a=> !rightSet.has(a.id)).slice(0,60);
  const rightOnly = (other.artists||[]).filter(a=> !leftSet.has(a.id)).slice(0,60);
  const overlap = (me.artists||[]).filter(a=> overlapIds.has(a.id)).slice(0,80);
  const placed = [];
  const midNodes = placeNodesInRegion(
    overlap,
    (x,y)=> inIntersection(x,y,cx1,cy,rMLeft,cx2,cy,rMRight),
    { W, H, sampler: makeSamplerIntersection(cx1, cy, rMLeft, cx2) },
    placed
  );
  const leftNodes = placeNodesInRegion(
    leftOnly,
    (x,y)=> inLeftOnly(x,y,cx1,cy,rMLeft,cx2,cy,rMRight),
    { W, H, sampler: makeSamplerLeftOnly(cx1, cy, rMLeft, cx2) },
    placed
  );
  const rightNodes = placeNodesInRegion(
    rightOnly,
    (x,y)=> inRightOnly(x,y,cx1,cy,rMLeft,cx2,cy,rMRight),
    { W, H, sampler: makeSamplerRightOnly(cx2, cy, rMRight, cx1) },
    placed
  );
  ui.viz.innerHTML = `
    <svg class="viz-svg" viewBox="0 0 ${W} ${H}">
      <circle class="circle-left" cx="${cx1}" cy="${cy}" r="${rLeft}" />
      <circle class="circle-right" cx="${cx2}" cy="${cy}" r="${rRight}" />
      <text class="label" x="${cx1 - 80}" y="${cy - Math.max(rLeft,rRight) - 16}">@${escapeHtml(me.spotifyDisplayName||'you')}</text>
      <text class="label" x="${cx2 - 80}" y="${cy - Math.max(rLeft,rRight) - 16}">@${escapeHtml(other.spotifyDisplayName||other.spotifyUserId)}</text>
      ${leftNodes.map(n => artistText(n)).join('')}
      ${rightNodes.map(n => artistText(n)).join('')}
      ${midNodes.map(n => artistText(n)).join('')}
    </svg>
  `;
  ui.scoreLine.textContent = `You and @${normalizeUsername(other.spotifyDisplayName||other.spotifyUserId)} have ${pct}% overlapping music taste (artists)`;
}

function artistText(n) {
  const dx = (Math.random()*3-1.5).toFixed(1) + 'px';
  const dy = (Math.random()*3-1.5).toFixed(1) + 'px';
  const delay = (Math.random()*2).toFixed(2) + 's';
  const name = shorten(n.item.name, 18);
  return `<text class="artist-node" x="${n.x}" y="${n.y}" text-anchor="middle" style="--dx:${dx};--dy:${dy};animation-delay:${delay};">${escapeHtml(name)}</text>`;
}

function shorten(s, max) {
  const str = String(s||"");
  return str.length>max ? str.slice(0,max-1)+"…" : str;
}

function rand(min, max) { return Math.random()*(max-min)+min; }

function pointInCircle(x,y,cx,cy,r) { const dx=x-cx, dy=y-cy; return dx*dx+dy*dy <= r*r; }
function inIntersection(x,y,cx1,cy1,r1,cx2,cy2,r2) { return pointInCircle(x,y,cx1,cy1,r1) && pointInCircle(x,y,cx2,cy2,r2); }
function inLeftOnly(x,y,cx1,cy1,r1,cx2,cy2,r2) { return pointInCircle(x,y,cx1,cy1,r1) && !pointInCircle(x,y,cx2,cy2,r2); }
function inRightOnly(x,y,cx1,cy1,r1,cx2,cy2,r2) { return pointInCircle(x,y,cx2,cy2,r2) && !pointInCircle(x,y,cx1,cy1,r1); }

// Targeted samplers to focus random sampling within each region's bounding box.
function makeSamplerIntersection(cx1, cy, r, cx2) {
  const xmin = Math.max(cx1 - r, cx2 - r);
  const xmax = Math.min(cx1 + r, cx2 + r);
  const ymin = cy - r;
  const ymax = cy + r;
  return () => [rand(xmin, xmax), rand(ymin, ymax)];
}

function makeSamplerLeftOnly(cx1, cy, r, cx2) {
  let xmin = cx1 - r;
  let xmax = Math.min(cx1 + r, cx2 - r);
  // If circles are disjoint or just-touching, sample full left circle bbox
  if (xmax <= xmin) { xmin = cx1 - r; xmax = cx1 + r; }
  const ymin = cy - r;
  const ymax = cy + r;
  return () => [rand(xmin, xmax), rand(ymin, ymax)];
}

function makeSamplerRightOnly(cx2, cy, r, cx1) {
  let xmin = Math.max(cx2 - r, cx1 + r);
  let xmax = cx2 + r;
  // If circles are disjoint or just-touching, sample full right circle bbox
  if (xmin >= xmax) { xmin = cx2 - r; xmax = cx2 + r; }
  const ymin = cy - r;
  const ymax = cy + r;
  return () => [rand(xmin, xmax), rand(ymin, ymax)];
}

function approxTextWidth(name) {
  const n = Math.min(18, String(name||"").length);
  return 7 * n + 10; // font-size ~11; rough width per char + padding
}

function overlapsAny(rect, list) {
  for (const b of list) {
    if (!(rect.x2 < b.x1 || rect.x1 > b.x2 || rect.y2 < b.y1 || rect.y1 > b.y2)) return true;
  }
  return false;
}

function fitsRectInPredicate(x, y, w, h, predicate) {
  const hw = w/2, hh = h/2;
  const points = [
    [x, y],
    [x - hw*0.9, y - hh*0.9],
    [x + hw*0.9, y - hh*0.9],
    [x - hw*0.9, y + hh*0.9],
    [x + hw*0.9, y + hh*0.9],
  ];
  return points.every(([px,py])=> predicate(px,py));
}

function placeNodesInCircle(items, {cx,cy,r}, placedRects=[]) {
  const nodes = [];
  const marginR = r - 12;
  for (let i=0; i<items.length; i++) {
    const item = items[i];
    let guard=0; let placed=false;
    const w = approxTextWidth(item.name); const h = 14;
    while(!placed && guard<600) {
      const angle = Math.random() * Math.PI * 2;
      const radius = marginR * Math.sqrt(Math.random());
      const x = cx + Math.cos(angle)*radius;
      const y = cy + Math.sin(angle)*radius;
      if (!pointInCircle(x, y, cx, cy, marginR)) { guard++; continue; }
      if (!fitsRectInPredicate(x, y, w, h, (px,py)=> pointInCircle(px, py, cx, cy, marginR))) { guard++; continue; }
      const rect = { x1: x - w/2, y1: y - h/2, x2: x + w/2, y2: y + h/2 };
      if (overlapsAny(rect, placedRects)) { guard++; continue; }
      placedRects.push(rect);
      nodes.push({ x: Math.round(x), y: Math.round(y), item });
      placed = true;
    }
    if (!placed) break;
  }
  return nodes;
}

function placeNodesInRegion(items, predicate, {W,H, sampler}, placedRects=[]) {
  const nodes = [];
  let attempts = 0;
  for (let i=0; i<items.length; i++) {
    const item = items[i];
    const w = approxTextWidth(item.name); const h = 14;
    let placed = false; let guard=0;
    while(!placed && guard<800) {
      const pt = sampler ? sampler() : [rand(100, W-100), rand(130, H-90)];
      const x = pt[0], y = pt[1];
      if (!predicate(x,y)) { guard++; attempts++; continue; }
      if (!fitsRectInPredicate(x, y, w, h, predicate)) { guard++; attempts++; continue; }
      const rect = { x1: x - w/2, y1: y - h/2, x2: x + w/2, y2: y + h/2 };
      if (overlapsAny(rect, placedRects)) { guard++; attempts++; continue; }
      placedRects.push(rect);
      nodes.push({ x: Math.round(x), y: Math.round(y), item });
      placed = true;
    }
    if (!placed) break;
    if (attempts>25000) break;
  }
  return nodes;
}

// Geometry helpers to determine circle separation that matches overlap fraction
function intersectionAreaEqualR(d, r) {
  if (d >= 2*r) return 0;
  if (d <= 0) return Math.PI * r * r;
  const alpha = 2 * Math.acos(d / (2*r));
  return (r*r * alpha) - (0.5 * d * Math.sqrt(4*r*r - d*d));
}

function overlapFractionForDistanceEqualR(d, r) {
  const A = intersectionAreaEqualR(d, r);
  const union = 2 * Math.PI * r * r - A;
  return union > 0 ? (A / union) : 0;
}

function computeDistanceForOverlapFractionEqualR(f, r) {
  // Binary search d in [0, 2r] s.t. overlapFractionForDistanceEqualR(d, r) ~= f
  let lo = 0, hi = 2*r, mid = hi;
  for (let i=0; i<24; i++) {
    mid = (lo + hi) / 2;
    const fm = overlapFractionForDistanceEqualR(mid, r);
    if (fm > f) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// General circle-circle intersection area for radii r1,r2
function intersectionAreaGeneral(d, r1, r2) {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) * Math.min(r1, r2);
  const alpha = 2 * Math.acos((d*d + r1*r1 - r2*r2) / (2 * d * r1));
  const beta  = 2 * Math.acos((d*d + r2*r2 - r1*r1) / (2 * d * r2));
  const area1 = 0.5 * r1*r1 * (alpha - Math.sin(alpha));
  const area2 = 0.5 * r2*r2 * (beta  - Math.sin(beta));
  return area1 + area2;
}

function overlapFractionForDistanceGeneral(d, r1, r2) {
  const A = intersectionAreaGeneral(d, r1, r2);
  const union = Math.PI * r1*r1 + Math.PI * r2*r2 - A;
  return union > 0 ? (A / union) : 0;
}

function computeDistanceForOverlapFractionGeneral(f, r1, r2) {
  // Binary search d in [0, r1+r2] s.t. overlapFractionForDistanceGeneral(d, r1, r2) ~= f
  let lo = 0, hi = r1 + r2, mid = hi;
  for (let i=0; i<26; i++) {
    mid = (lo + hi) / 2;
    const fm = overlapFractionForDistanceGeneral(mid, r1, r2);
    if (fm > f) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function scaleRadius(count) {
  // Soft scaling: base radius 150 at ~60 artists; clamp to keep readable
  const baseCount = 60; const baseR = 150;
  const r = baseR * Math.sqrt(Math.max(1, count) / baseCount);
  return Math.max(120, Math.min(230, Math.round(r)));
}
