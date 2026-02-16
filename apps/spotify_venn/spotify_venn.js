const STORAGE_KEY = "spotify_venn_profiles_v1";
// Username workflow removed; settings key no longer used.
const TOKEN_KEY = "spotify_venn_token_v1";
const STATE_KEY = "spotify_venn_oauth_state_v1";
const VERIFIER_KEY = "spotify_venn_oauth_verifier_v1";
const CLIENT_ID_KEY = "spotify_venn_client_id_v1";
const SNAPSHOT_URL_LIMIT = 1800;
const SNAPSHOT_VERSION = 1;

const ui = {
  connectSpotify: document.getElementById("connect-spotify"),
  pullData: document.getElementById("pull-data"),
  saveSnapshot: document.getElementById("save-snapshot"),
  compare: document.getElementById("compare"),
  inviteLink: document.getElementById("invite-link"),
  copyInvite: document.getElementById("copy-invite"),
  shareInvite: document.getElementById("share-invite"),
  authChip: document.getElementById("auth-chip"),
  authStatus: document.getElementById("auth-status"),
  snapshotStatus: document.getElementById("snapshot-status"),
  compareStatus: document.getElementById("compare-status"),
  meSummary: document.getElementById("me-summary"),
  sharedArtists: document.getElementById("shared-artists"),
  sharedTracks: document.getElementById("shared-tracks"),
  venn: document.getElementById("venn"),
  toast: document.getElementById("toast"),
  detectedRedirect: document.getElementById("detected-redirect"),
  detectedClientId: document.getElementById("detected-client-id"),
  copyRedirect: document.getElementById("copy-redirect"),
  copyClientId: document.getElementById("copy-client-id")
};

const state = {
  busy: false,
  mySnapshot: null,
  inviteProfiles: {},
  toastTimer: null,
  spotifyUser: null,
  invitedUsername: null
};

init();

async function init() {
  bindEvents();
  const clientId = bootstrapClientId();
  applyInviteFromUrl();

  const handled = await handleOAuthCallback();
  if (!handled) {
    if (!clientId) {
      setAuthState(
        "error",
        "Server missing client ID. Set <meta name=\"spotify-client-id\"> or open once with ?client_id=YOUR_CLIENT_ID."
      );
    } else if (getToken()) {
      await hydrateSpotifyIdentity();
    } else {
      setAuthState("neutral", "Sign in to fetch your top artists and tracks.");
    }
  }

  updateInviteLink();
  updateCompareButtonState();

  // Populate troubleshooting fields
  if (ui.detectedRedirect) ui.detectedRedirect.value = getRedirectUri();
  if (ui.detectedClientId) ui.detectedClientId.value = getClientId();
}

function bindEvents() {
  ui.connectSpotify.addEventListener("click", startSpotifyAuth);
  ui.pullData.addEventListener("click", loadMyListeningData);
  ui.saveSnapshot.addEventListener("click", saveSnapshotForUsername);
  ui.compare.addEventListener("click", compareUsers);
  ui.copyInvite.addEventListener("click", copyInviteLink);
  ui.shareInvite.addEventListener("click", shareInviteLink);
  if (ui.copyRedirect) ui.copyRedirect.addEventListener("click", async () => {
    const val = (ui.detectedRedirect?.value || getRedirectUri());
    const ok = await copyToClipboard(val);
    toast(ok ? "Redirect URI copied" : "Unable to copy in this browser");
  });
  if (ui.copyClientId) ui.copyClientId.addEventListener("click", async () => {
    const val = (ui.detectedClientId?.value || getClientId());
    const ok = await copyToClipboard(val);
    toast(ok ? "Client ID copied" : "Unable to copy in this browser");
  });
}

function compareUsers() {
  const meKey = normalizeUsername(state.spotifyUser?.id || "");
  const otherUsername = normalizeUsername(state.invitedUsername || "");

  if (!isValidUsername(meKey)) {
    setStatus(ui.compareStatus, "Connect With Spotify and save your snapshot first.");
    return;
  }
  if (!isValidUsername(otherUsername)) {
    setStatus(ui.compareStatus, "Open a valid invite link to compare.");
    return;
  }

  const me = getProfile(meKey);
  const other = getProfile(otherUsername);

  if (!me) {
    setStatus(ui.compareStatus, `No snapshot found for @${meKey}. Pull data and save first.`);
    return;
  }

  if (!other) {
    setStatus(ui.compareStatus, `No snapshot found for @${otherUsername}. Invite them to join Spotify Venn!`);
    return;
  }

  const artistOverlap = findOverlap(me.artists || [], other.artists || [], (item) => item.id);
  const trackOverlap = findOverlap(me.tracks || [], other.tracks || [], (item) => item.id);

  const meUniverse = (me.artists || []).length + (me.tracks || []).length;
  const otherUniverse = (other.artists || []).length + (other.tracks || []).length;
  const sharedCount = artistOverlap.shared.length + trackOverlap.shared.length;

  const mePct = meUniverse ? Math.round((sharedCount / meUniverse) * 100) : 0;
  const otherPct = otherUniverse ? Math.round((sharedCount / otherUniverse) * 100) : 0;

  const meUsername = normalizeUsername(me.spotifyDisplayName || meKey);
  setStatus(ui.compareStatus, `@${meUsername} vs @${otherUsername} · shared ${sharedCount}`);
  renderList(ui.sharedArtists, artistOverlap.shared.map((a) => a.name), "No shared artists.");
  renderList(ui.sharedTracks, trackOverlap.shared.map((t) => `${t.name} - ${t.artists}`), "No shared tracks.");
  renderVenn({ meUsername, otherUsername, mePct, otherPct, sharedCount });
}
function toast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("is-visible");
  if (state.toastTimer) {
    clearTimeout(state.toastTimer);
  }
  state.toastTimer = window.setTimeout(() => {
    ui.toast.classList.remove("is-visible");
  }, 2400);
}

function isReadyToCompare() {
  const meKey = normalizeUsername(state.spotifyUser?.id || "");
  const otherKey = normalizeUsername(state.invitedUsername || "");
  return isValidUsername(meKey) && !!getProfile(meKey) && isValidUsername(otherKey);
}

function updateCompareButtonState() {
  const ready = isReadyToCompare();
  if (ui.compare) {
    ui.compare.disabled = !ready;
    ui.compare.setAttribute("aria-disabled", (!ready).toString());
  }
  if (!ready) {
    if (!state.invitedUsername) {
      setStatus(ui.compareStatus, "Open a friend’s invite link to compare.");
    } else if (!state.mySnapshot) {
      setStatus(ui.compareStatus, `Invite loaded for @${state.invitedUsername}. Connect and pull your data to compare.`);
    }
  } else {
    setStatus(ui.compareStatus, `Invite loaded for @${state.invitedUsername}. Ready to build Venn.`);
  }
}

// Username settings removed

function getClientId() {
  const metaId = document.querySelector('meta[name="spotify-client-id"]')?.content.trim() || "";
  if (metaId) return metaId;
  return localStorage.getItem(CLIENT_ID_KEY) || "";
}

function bootstrapClientId() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = (params.get("client_id") || "").trim();

  if (fromQuery && /^[a-zA-Z0-9]{20,80}$/.test(fromQuery)) {
    localStorage.setItem(CLIENT_ID_KEY, fromQuery);
    params.delete("client_id");
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, document.title, next);
    return fromQuery;
  }

  return getClientId();
}

function getRedirectUri() {
  const configured = document.querySelector('meta[name="spotify-redirect-uri"]')?.content.trim() || "";
  if (configured) {
    return configured;
  }
  return `${window.location.origin}${getCanonicalAppPath()}`;
}

function getInviteBaseUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.pathname = getCanonicalAppPath();
  return url;
}

function getCanonicalAppPath() {
  let path = window.location.pathname;
  if (path.endsWith("/index.html")) {
    path = path.slice(0, -10);
  }
  if (!path.endsWith("/")) {
    path += "/";
  }
  return path;
}

function validateAuthPreflight(clientId) {
  const redirectUri = getRedirectUri();
  let parsedRedirect;

  try {
    parsedRedirect = new URL(redirectUri);
  } catch {
    return `Invalid redirect URI: ${redirectUri}`;
  }

  if (!clientId) {
    return `Server missing client ID. Set <meta name="spotify-client-id"> or open once with ?client_id=YOUR_CLIENT_ID. Redirect URI: ${redirectUri}`;
  }

  if (!/^[a-zA-Z0-9]{20,80}$/.test(clientId)) {
    return "Client ID format looks invalid. Check your Spotify app client ID.";
  }

  const isLoopback = parsedRedirect.hostname === "127.0.0.1" || parsedRedirect.hostname === "[::1]";
  if (parsedRedirect.protocol !== "https:" && !isLoopback) {
    return `Spotify OAuth requires HTTPS or loopback (127.0.0.1). Current redirect URI: ${redirectUri}`;
  }

  return "";
}

async function startSpotifyAuth() {
  if (state.busy) return;

  const clientId = getClientId();
  const preflightError = validateAuthPreflight(clientId);
  if (preflightError) {
    setAuthState("error", preflightError);
    return;
  }

  setBusy(true);
  try {
    const redirectUri = getRedirectUri();
    const stateToken = randomString(18);
    const verifier = randomString(64);
    let challenge = verifier;
    let challengeMethod = "plain";
    try {
      challenge = await pkceChallenge(verifier);
      challengeMethod = "S256";
    } catch {
      // Fallback to 'plain' for environments without crypto.subtle (non-secure HTTP contexts)
      challenge = verifier;
      challengeMethod = "plain";
    }

    localStorage.setItem(STATE_KEY, stateToken);
    localStorage.setItem(VERIFIER_KEY, verifier);

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "user-read-private user-top-read");
    authUrl.searchParams.set("show_dialog", "true");
  authUrl.searchParams.set("code_challenge_method", challengeMethod);
  authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("state", stateToken);

  const urlString = authUrl.toString();
    setAuthState("neutral", `Redirecting to Spotify...`);
    // Populate debug link as a fallback
    if (ui.detectedRedirect) ui.detectedRedirect.value = redirectUri;
    if (ui.detectedClientId) ui.detectedClientId.value = clientId;
    const debugLink = document.getElementById("auth-debug-link");
    if (debugLink) {
      debugLink.href = urlString;
      debugLink.style.display = "inline";
    }
    // Try multiple navigation methods for robustness
    try { window.open(urlString, "_blank"); } catch {}
    window.location.href = urlString;
    setTimeout(() => {
      try { window.location.assign(urlString); } catch {}
      try { window.location.replace(urlString); } catch {}
    }, 50);
  } finally {
    setBusy(false);
  }
}

async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const incomingState = params.get("state");
  const error = params.get("error");

  if (!code && !error) return false;

  if (error) {
    clearAuthArtifacts();
    setAuthState("error", `Spotify auth failed: ${error}`);
    clearOAuthParams();
    return true;
  }

  const expectedState = localStorage.getItem(STATE_KEY);
  const verifier = localStorage.getItem(VERIFIER_KEY);

  if (!incomingState || incomingState !== expectedState || !verifier) {
    clearAuthArtifacts();
    setAuthState("error", "Authentication state mismatch. Connect again.");
    clearOAuthParams();
    return true;
  }

  const clientId = getClientId();
  if (!clientId) {
    clearAuthArtifacts();
    setAuthState(
      "error",
      "Server missing client ID. Set <meta name=\"spotify-client-id\"> or open once with ?client_id=YOUR_CLIENT_ID."
    );
    clearOAuthParams();
    return true;
  }

  try {
    setBusy(true);

    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
      code_verifier: verifier
    });

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    if (!res.ok) {
      throw new Error(`Token exchange failed (${res.status})`);
    }

    const tokenData = await res.json();
    storeToken(tokenData);
    await hydrateSpotifyIdentity();
    toast("Spotify connected");
  } catch (err) {
    clearToken();
    setAuthState("error", err.message || "Authentication failed");
  } finally {
    clearAuthArtifacts();
    clearOAuthParams();
    setBusy(false);
  }

  return true;
}

async function hydrateSpotifyIdentity() {
  try {
    const profile = await spotifyGet("/me");
    state.spotifyUser = {
      id: profile.id,
      displayName: profile.display_name || profile.id
    };
    setAuthState("connected", `Connected as ${state.spotifyUser.displayName}`);
  } catch {
    clearToken();
    state.spotifyUser = null;
    setAuthState("error", "Session expired. Sign in with Spotify.");
  }
}

function clearOAuthParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
}

function clearAuthArtifacts() {
  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(VERIFIER_KEY);
}

function storeToken(tokenData) {
  const expiresAt = Date.now() + Math.max((tokenData.expires_in || 3600) - 60, 60) * 1000;
  localStorage.setItem(
    TOKEN_KEY,
    JSON.stringify({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt
    })
  );
}

function getToken() {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;

  try {
    const token = JSON.parse(raw);
    if (!token.accessToken || !token.expiresAt) return null;
    return token;
  } catch {
    return null;
  }
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function getValidAccessToken() {
  const token = getToken();
  if (!token) return null;
  if (Date.now() < token.expiresAt) return token.accessToken;

  if (!token.refreshToken) return null;

  const clientId = getClientId();
  if (!clientId) {
    setAuthState("error", "Server missing client ID");
    return null;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: token.refreshToken
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!res.ok) {
    clearToken();
    throw new Error(`Session refresh failed (${res.status}). Please reconnect.`);
  }

  const refreshed = await res.json();
  localStorage.setItem(
    TOKEN_KEY,
    JSON.stringify({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || token.refreshToken,
      expiresAt: Date.now() + Math.max((refreshed.expires_in || 3600) - 60, 60) * 1000
    })
  );

  return refreshed.access_token;
}

async function spotifyGet(path) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error("Session expired. Reconnect Spotify.");
  }

  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (res.status === 401) {
    clearToken();
    setAuthState("error", "Session expired. Reconnect Spotify.");
    throw new Error("Session expired. Reconnect Spotify.");
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    const suffix = retryAfter ? ` (retry in ${retryAfter}s)` : "";
    throw new Error(`Rate limited, try again shortly${suffix}`);
  }

  if (!res.ok) {
    throw new Error(`Spotify request failed (${res.status})`);
  }

  return res.json();
}

async function loadMyListeningData() {
  if (state.busy) return;

  setBusy(true);
  setStatus(ui.snapshotStatus, "Loading your listening data...");

  try {
    const [profile, topArtists, topTracks] = await Promise.all([
      spotifyGet("/me"),
      spotifyGet("/me/top/artists?limit=50&time_range=medium_term"),
      spotifyGet("/me/top/tracks?limit=50&time_range=medium_term")
    ]);

    const artists = (topArtists.items || []).map((a) => ({ id: a.id, name: a.name }));
    const tracks = (topTracks.items || []).map((t) => ({
      id: t.id,
      name: t.name,
      artists: (t.artists || []).map((a) => a.name).join(", ")
    }));

    state.mySnapshot = {
      spotifyUserId: profile.id,
      spotifyDisplayName: profile.display_name || profile.id,
      capturedAt: new Date().toISOString(),
      artists,
      tracks
    };

    renderMeSummary(state.mySnapshot);

    if (!artists.length && !tracks.length) {
      setStatus(ui.snapshotStatus, "Spotify returned empty top lists for this account.");
    } else {
      setStatus(ui.snapshotStatus, `Loaded ${artists.length} artists and ${tracks.length} tracks.`);
    }

    setAuthState("connected", "Spotify connected.");
  } catch (err) {
    setStatus(ui.snapshotStatus, err.message || "Could not load listening data.");
  } finally {
    setBusy(false);
    updateCompareButtonState();
  }
}

function renderMeSummary(snapshot) {
  const artistPreview = snapshot.artists.length
    ? snapshot.artists.slice(0, 5).map((a) => escapeHtml(a.name)).join(", ")
    : "No top artists available";

  const trackPreview = snapshot.tracks.length
    ? snapshot.tracks.slice(0, 5).map((t) => escapeHtml(t.name)).join(", ")
    : "No top tracks available";

  ui.meSummary.innerHTML = [
    `<div class="list-item"><strong>Spotify profile:</strong> ${escapeHtml(snapshot.spotifyDisplayName)}</div>`,
    `<div class="list-item"><strong>Top artists:</strong> ${artistPreview}</div>`,
    `<div class="list-item"><strong>Top tracks:</strong> ${trackPreview}</div>`
  ].join("");
}

function saveSnapshotForUsername() {
  if (!state.spotifyUser) {
    setStatus(ui.snapshotStatus, "Connect with Spotify first.");
    return;
  }
  if (!state.mySnapshot) {
    setStatus(ui.snapshotStatus, "Pull listening data first.");
    return;
  }
  const myKey = normalizeUsername(state.spotifyUser.id);
  const profiles = readProfiles();
  profiles[myKey] = state.mySnapshot;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  updateInviteLink();
  setStatus(ui.snapshotStatus, `Snapshot saved for @${myKey}.`);
  toast("Snapshot saved");
  updateCompareButtonState();
  const otherKey = normalizeUsername(state.invitedUsername || "");
  if (isValidUsername(otherKey) && getProfile(otherKey)) {
    toast("Auto-building Venn overlap...");
    compareUsers();
  }
}

function getProfile(username) {
  const profiles = readProfiles();
  if (profiles[username]) return profiles[username];
  if (state.inviteProfiles[username]) return state.inviteProfiles[username];
  const myKey = normalizeUsername(state.spotifyUser?.id || "");
  if (state.mySnapshot && username === myKey) {
    return state.mySnapshot;
  }
  return null;
}

function compareUsers() {
  const otherUsername = normalizeUsername(ui.otherUsername.value);
  const meKey = normalizeUsername(state.spotifyUser?.id || "");
  if (!isValidUsername(meKey) || !isValidUsername(otherUsername)) {
    setStatus(ui.compareStatus, "Connect Spotify and enter a valid other username.");
    return;
  }
  const me = getProfile(meKey);
  const other = getProfile(otherUsername);
  if (!me) {
    setStatus(ui.compareStatus, `No snapshot found for @${meKey}. Pull data and save first.`);
    return;
  }
  if (!other) {
    setStatus(ui.compareStatus, `No snapshot found for @${otherUsername}. Invite them to join Spotify Venn!`);
    return;
  }
  const artistOverlap = findOverlap(me.artists || [], other.artists || [], (item) => item.id);
  const trackOverlap = findOverlap(me.tracks || [], other.tracks || [], (item) => item.id);
  const meUniverse = (me.artists || []).length + (me.tracks || []).length;
  const otherUniverse = (other.artists || []).length + (other.tracks || []).length;
  const sharedCount = artistOverlap.shared.length + trackOverlap.shared.length;
  const mePct = meUniverse ? Math.round((sharedCount / meUniverse) * 100) : 0;
  const otherPct = otherUniverse ? Math.round((sharedCount / otherUniverse) * 100) : 0;
  const meUsername = normalizeUsername(me.spotifyDisplayName || meKey);
  setStatus(ui.compareStatus, `@${meUsername} vs @${otherUsername} · shared ${sharedCount}`);
  renderList(ui.sharedArtists, artistOverlap.shared.map((a) => a.name), "No shared artists.");
  renderList(ui.sharedTracks, trackOverlap.shared.map((t) => `${t.name} - ${t.artists}`), "No shared tracks.");
  renderVenn({ meUsername, otherUsername, mePct, otherPct, sharedCount });
}

function findOverlap(left, right, idSelector) {
  const rightIds = new Set(right.map(idSelector));
  const shared = left.filter((item) => rightIds.has(idSelector(item)));
  return { shared };
}

function renderList(el, items, emptyMessage) {
  if (!items.length) {
    el.innerHTML = `<div class="list-item">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  el.innerHTML = items
    .slice(0, 30)
    .map((item) => `<div class="list-item">${escapeHtml(item)}</div>`)
    .join("");
}

function renderVenn({ meUsername, otherUsername, mePct, otherPct, sharedCount }) {
  ui.venn.innerHTML = `
    <svg class="venn-svg" viewBox="0 0 620 280" aria-labelledby="venn-title venn-desc">
      <title id="venn-title">Listening overlap between @${escapeHtml(meUsername)} and @${escapeHtml(otherUsername)}</title>
      <desc id="venn-desc">Shared ${sharedCount} items. ${mePct}% overlap for ${escapeHtml(meUsername)} and ${otherPct}% for ${escapeHtml(otherUsername)}.</desc>
      <rect x="0" y="0" width="620" height="280" rx="16" class="venn-bg"></rect>
      <circle class="venn-circle venn-left" cx="250" cy="146" r="102"></circle>
      <circle class="venn-circle venn-right" cx="370" cy="146" r="102"></circle>
      <text class="venn-label venn-user-left" x="136" y="46">@${escapeHtml(meUsername)}</text>
      <text class="venn-label venn-user-right" x="382" y="46">@${escapeHtml(otherUsername)}</text>
      <text class="venn-label venn-pct-left" x="194" y="146">${mePct}%</text>
      <text class="venn-label venn-pct-right" x="338" y="146">${otherPct}%</text>
      <text class="venn-label venn-shared" x="287" y="146">${sharedCount}</text>
      <text class="venn-label venn-shared-sub" x="267" y="168">shared</text>
    </svg>
  `;

  requestAnimationFrame(() => {
    const svg = ui.venn.querySelector(".venn-svg");
    if (svg) {
      svg.classList.add("is-ready");
    }
  });
}

function updateInviteLink() {
  const myKey = normalizeUsername(state.spotifyUser?.id || "");
  if (!isValidUsername(myKey)) {
    ui.inviteLink.value = "";
    return;
  }
  const snapshot = getProfile(myKey);
  const base = getInviteBaseUrl();
  base.searchParams.set("invite", myKey);
  if (!snapshot) {
    ui.inviteLink.value = base.toString();
    return;
  }
  const encoded = encodeSnapshotForUrl(snapshot);
  if (encoded) {
    const withPayload = new URL(base.toString());
    withPayload.searchParams.set("snapshot", encoded);
    if (withPayload.toString().length <= SNAPSHOT_URL_LIMIT) {
      ui.inviteLink.value = withPayload.toString();
      return;
    }
  }
  ui.inviteLink.value = base.toString();
}

function encodeSnapshotForUrl(snapshot) {
  try {
    const minimal = {
      v: SNAPSHOT_VERSION,
      snapshot: {
        spotifyUserId: snapshot.spotifyUserId || "",
        spotifyDisplayName: snapshot.spotifyDisplayName || "",
        capturedAt: snapshot.capturedAt || new Date().toISOString(),
        artists: (snapshot.artists || []).slice(0, 50).map((a) => ({ id: a.id, name: a.name })),
        tracks: (snapshot.tracks || []).slice(0, 50).map((t) => ({ id: t.id, name: t.name, artists: t.artists || "" }))
      }
    };
    return LZString.compressToEncodedURIComponent(JSON.stringify(minimal));
  } catch {
    return "";
  }
}

function decodeSnapshotFromUrl(encoded) {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(encoded);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== SNAPSHOT_VERSION || !parsed.snapshot) return null;

    return sanitizeSnapshot(parsed.snapshot);
  } catch {
    return null;
  }
}

function applyInviteFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const invited = normalizeUsername(params.get("invite") || "");
  const encodedSnapshot = params.get("snapshot") || "";

  if (!isValidUsername(invited)) return;
  state.invitedUsername = invited;

  if (!encodedSnapshot) {
    setStatus(ui.compareStatus, `Invite loaded for @${invited}. Click Build Venn to compare.`);
    updateCompareButtonState();
    const meKey = normalizeUsername(state.spotifyUser?.id || "");
    if (isValidUsername(meKey) && getProfile(meKey)) {
      // other side may not have a snapshot yet; just enable button
    }
    return;
  }

  const decoded = decodeSnapshotFromUrl(encodedSnapshot);
  if (!decoded) {
    setStatus(ui.compareStatus, `Invite loaded for @${invited}, but snapshot import failed.`);
    return;
  }

  // Keep invite snapshot in-memory only; do not mutate localStorage.
  state.inviteProfiles[invited] = decoded;
  setStatus(ui.compareStatus, `Invite loaded for @${invited}. Snapshot ready. Click Build Venn to compare.`);
  updateCompareButtonState();
  const meKey = normalizeUsername(state.spotifyUser?.id || "");
  if (isValidUsername(meKey) && getProfile(meKey)) {
    toast("Auto-building Venn overlap...");
    compareUsers();
  }
}

async function copyInviteLink() {
  const invite = ui.inviteLink.value.trim();
  if (!invite) {
    toast("Save your snapshot first");
    return;
  }

  const ok = await copyToClipboard(invite);
  if (ok) {
    toast("Invite link copied");
  } else {
    toast("Unable to copy link in this browser");
  }
}

async function shareInviteLink() {
  const invite = ui.inviteLink.value.trim();
  if (!invite) {
    toast("Save your snapshot first");
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Spotify Venn",
        text: "Compare with me",
        url: invite
      });
      return;
    } catch {
      // Continue to clipboard fallback.
    }
  }

  await copyInviteLink();
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to execCommand fallback
    }
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "absolute";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const successful = document.execCommand("copy");
  area.remove();
  return successful;
}

function readProfiles() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function sanitizeSnapshot(snapshot) {
  return {
    spotifyUserId: String(snapshot.spotifyUserId || ""),
    spotifyDisplayName: String(snapshot.spotifyDisplayName || ""),
    capturedAt: String(snapshot.capturedAt || new Date().toISOString()),
    artists: Array.isArray(snapshot.artists)
      ? snapshot.artists
          .filter((item) => item && item.id && item.name)
          .map((item) => ({ id: String(item.id), name: String(item.name) }))
      : [],
    tracks: Array.isArray(snapshot.tracks)
      ? snapshot.tracks
          .filter((item) => item && item.id && item.name)
          .map((item) => ({
            id: String(item.id),
            name: String(item.name),
            artists: String(item.artists || "")
          }))
      : []
  };
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

function isValidUsername(value) {
  return /^[a-z0-9_-]+$/.test(value);
}

function randomString(length) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => alphabet[b % alphabet.length])
    .join("");
}

async function pkceChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Minimal embedded LZ-string implementation for URL-safe compression.
// Source algorithm: LZ-based dictionary compression adapted for static client apps.
const LZString = (function () {
  const keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
  const baseReverseDic = {};

  function getBaseValue(alphabet, character) {
    if (!baseReverseDic[alphabet]) {
      baseReverseDic[alphabet] = {};
      for (let i = 0; i < alphabet.length; i += 1) {
        baseReverseDic[alphabet][alphabet.charAt(i)] = i;
      }
    }
    return baseReverseDic[alphabet][character];
  }

  function compressToEncodedURIComponent(input) {
    if (input == null) return "";
    return _compress(input, 6, function (a) {
      return keyStrUriSafe.charAt(a);
    });
  }

  function decompressFromEncodedURIComponent(input) {
    if (input == null) return "";
    if (input === "") return null;
    input = input.replace(/ /g, "+");
    return _decompress(input.length, 32, function (index) {
      return getBaseValue(keyStrUriSafe, input.charAt(index));
    });
  }

  function _compress(uncompressed, bitsPerChar, getCharFromInt) {
    if (uncompressed == null) return "";

    let i;
    let value;
    const context_dictionary = {};
    const context_dictionaryToCreate = {};
    let context_c = "";
    let context_wc = "";
    let context_w = "";
    let context_enlargeIn = 2;
    let context_dictSize = 3;
    let context_numBits = 2;
    const context_data = [];
    let context_data_val = 0;
    let context_data_position = 0;

    for (let ii = 0; ii < uncompressed.length; ii += 1) {
      context_c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
        context_dictionary[context_c] = context_dictSize;
        context_dictSize += 1;
        context_dictionaryToCreate[context_c] = true;
      }

      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
        context_w = context_wc;
      } else {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
          if (context_w.charCodeAt(0) < 256) {
            for (i = 0; i < context_numBits; i += 1) {
              context_data_val = context_data_val << 1;
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position += 1;
              }
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 8; i += 1) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position += 1;
              }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i = 0; i < context_numBits; i += 1) {
              context_data_val = (context_data_val << 1) | value;
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position += 1;
              }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 16; i += 1) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position += 1;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn -= 1;
          if (context_enlargeIn === 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits += 1;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i = 0; i < context_numBits; i += 1) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position += 1;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn -= 1;
        if (context_enlargeIn === 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits += 1;
        }
        context_dictionary[context_wc] = context_dictSize;
        context_dictSize += 1;
        context_w = String(context_c);
      }
    }

    if (context_w !== "") {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
        if (context_w.charCodeAt(0) < 256) {
          for (i = 0; i < context_numBits; i += 1) {
            context_data_val = context_data_val << 1;
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position += 1;
            }
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 8; i += 1) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position += 1;
            }
            value = value >> 1;
          }
        } else {
          value = 1;
          for (i = 0; i < context_numBits; i += 1) {
            context_data_val = (context_data_val << 1) | value;
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position += 1;
            }
            value = 0;
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 16; i += 1) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position += 1;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn -= 1;
        if (context_enlargeIn === 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits += 1;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i = 0; i < context_numBits; i += 1) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position === bitsPerChar - 1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position += 1;
          }
          value = value >> 1;
        }
      }
      context_enlargeIn -= 1;
      if (context_enlargeIn === 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits += 1;
      }
    }

    value = 2;
    for (i = 0; i < context_numBits; i += 1) {
      context_data_val = (context_data_val << 1) | (value & 1);
      if (context_data_position === bitsPerChar - 1) {
        context_data_position = 0;
        context_data.push(getCharFromInt(context_data_val));
        context_data_val = 0;
      } else {
        context_data_position += 1;
      }
      value = value >> 1;
    }

    while (true) {
      context_data_val = context_data_val << 1;
      if (context_data_position === bitsPerChar - 1) {
        context_data.push(getCharFromInt(context_data_val));
        break;
      }
      context_data_position += 1;
    }

    return context_data.join("");
  }

  function _decompress(length, resetValue, getNextValue) {
    const dictionary = [];
    let next;
    let enlargeIn = 4;
    let dictSize = 4;
    let numBits = 3;
    let entry = "";
    const result = [];
    let i;
    let w;
    let bits;
    let resb;
    let maxpower;
    let power;
    let c;

    const data = {
      val: getNextValue(0),
      position: resetValue,
      index: 1
    };

    for (i = 0; i < 3; i += 1) {
      dictionary[i] = i;
    }

    bits = 0;
    maxpower = Math.pow(2, 2);
    power = 1;
    while (power !== maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) {
        data.position = resetValue;
        data.val = getNextValue(data.index);
        data.index += 1;
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }

    switch (bits) {
      case 0:
        bits = 0;
        maxpower = Math.pow(2, 8);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index);
            data.index += 1;
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 1:
        bits = 0;
        maxpower = Math.pow(2, 16);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index);
            data.index += 1;
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 2:
        return "";
      default:
        c = "";
    }

    dictionary[3] = c;
    w = c;
    result.push(c);

    while (true) {
      if (data.index > length) {
        return "";
      }

      bits = 0;
      maxpower = Math.pow(2, numBits);
      power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index);
          data.index += 1;
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }

      const cc = bits;
      if (cc === 0) {
        bits = 0;
        maxpower = Math.pow(2, 8);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index);
            data.index += 1;
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        dictionary[dictSize] = String.fromCharCode(bits);
        dictSize += 1;
        next = dictSize - 1;
        enlargeIn -= 1;
      } else if (cc === 1) {
        bits = 0;
        maxpower = Math.pow(2, 16);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index);
            data.index += 1;
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        dictionary[dictSize] = String.fromCharCode(bits);
        dictSize += 1;
        next = dictSize - 1;
        enlargeIn -= 1;
      } else if (cc === 2) {
        return result.join("");
      } else {
        next = cc;
      }

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits += 1;
      }

      if (dictionary[next]) {
        entry = dictionary[next];
      } else if (next === dictSize) {
        entry = w + w.charAt(0);
      } else {
        return null;
      }

      result.push(entry);

      dictionary[dictSize] = w + entry.charAt(0);
      dictSize += 1;
      enlargeIn -= 1;

      w = entry;

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits += 1;
      }
    }
  }

  return {
    compressToEncodedURIComponent,
    decompressFromEncodedURIComponent
  };
})();

// TODO: Replace localStorage profile storage with serverless KV for truly global cross-user comparison.
