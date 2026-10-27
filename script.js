(() => {
  const USERS_KEY = "meet.users";
  const SESSION_KEY = "meet.session";

  const $ = (id) => document.getElementById(id);
  const track = $("track");
  const loginForm = $("loginForm");
  const signupForm = $("signupForm");
  const loginMsg = $("loginMsg");
  const signupMsg = $("signupMsg");

  /* ---------- storage ---------- */
  const readUsers = () => {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
    catch { return {}; }
  };
  const writeUsers = (u) => localStorage.setItem(USERS_KEY, JSON.stringify(u));

  /* ---------- password hashing (salted SHA-256) ---------- */
  async function hash(password, salt) {
    const text = salt + ":" + password;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 5381; // fallback when SubtleCrypto is unavailable
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
    return "fallback-" + h.toString(16);
  }
  function randomHex(bytes) {
    const a = new Uint8Array(bytes);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
  }

  /* ---------- sliding between forms ---------- */
  function show(which) {
    const toSignup = which === "signup";
    track.classList.toggle("show-signup", toSignup);
    loginForm.inert = toSignup;
    signupForm.inert = !toSignup;
    loginMsg.textContent = "";
    signupMsg.textContent = "";
    setTimeout(() => (toSignup ? $("signupName") : $("loginEmail")).focus(), 460);
  }
  document.querySelectorAll("[data-show]").forEach(b =>
    b.addEventListener("click", () => show(b.dataset.show))
  );

  /* ---------- show / hide password ---------- */
  document.querySelectorAll("[data-toggle]").forEach(b =>
    b.addEventListener("click", () => {
      const input = $(b.dataset.toggle);
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      b.textContent = reveal ? "Hide" : "Show";
      b.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    })
  );

  /* ---------- sign up ---------- */
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    signupMsg.className = "msg";

    const name = $("signupName").value.trim();
    const email = $("signupEmail").value.trim().toLowerCase();
    const password = $("signupPassword").value;

    if (!name || !email || !password) return (signupMsg.textContent = "Fill in every field.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return (signupMsg.textContent = "Enter a valid email address.");
    if (password.length < 8) return (signupMsg.textContent = "Password must be at least 8 characters.");
    if (password !== $("signupConfirm").value) return (signupMsg.textContent = "Passwords don't match.");

    const users = readUsers();
    if (users[email]) return (signupMsg.textContent = "That email is already registered. Log in instead.");

    const salt = randomHex(16);
    users[email] = { name, salt, passwordHash: await hash(password, salt) };
    writeUsers(users);

    signupForm.reset();
    show("login");
    $("loginEmail").value = email;
    loginMsg.className = "msg ok";
    loginMsg.textContent = "Account created. Log in to continue.";
  });

  /* ---------- log in ---------- */
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMsg.className = "msg";

    const email = $("loginEmail").value.trim().toLowerCase();
    const user = readUsers()[email];

    if (!user || (await hash($("loginPassword").value, user.salt)) !== user.passwordHash) {
      loginMsg.textContent = "Email or password is incorrect.";
      return;
    }
    sessionStorage.setItem(SESSION_KEY, email);
    loginForm.reset();
    render();
  });

  /* ---------- members-only area ---------- */
  // This markup does not exist in index.html; it is only built for a signed-in member.
  function buildApp(user) {
    const app = $("app");
    app.innerHTML = `
      <header class="bar">
        <div class="logo">Meet</div>
        <div class="who"><span>${escapeHtml(user.name)}</span>
          <button type="button" class="btn ghost" id="logoutBtn">Log out</button></div>
      </header>
      <h1 class="greet">Hi ${escapeHtml(user.name.split(" ")[0])}, ready to meet?</h1>
      <div class="lobby">
        <section class="box">
          <h2>New meeting</h2>
          <p>Create a room and share the code.</p>
          <button type="button" class="btn" id="newMeeting">Start meeting</button>
          <div class="code" id="newCode" hidden></div>
        </section>
        <section class="box">
          <h2>Join a meeting</h2>
          <p>Enter a code like abc-defg-hij.</p>
          <form class="row" id="joinForm" novalidate>
            <input id="joinCode" placeholder="Meeting code" aria-label="Meeting code" autocomplete="off">
            <button type="submit" class="btn">Join</button>
          </form>
          <p class="msg" id="joinMsg" role="alert"></p>
        </section>
      </div>`;

    $("logoutBtn").addEventListener("click", logout);

    $("newMeeting").addEventListener("click", () => {
      const letters = "abcdefghijklmnopqrstuvwxyz";
      const part = (n) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * 26)]).join("");
      const code = `${part(3)}-${part(4)}-${part(3)}`;
      const box = $("newCode");
      box.hidden = false;
      box.textContent = "Room code: " + code;
      // TODO: connect your video/meeting service here and open the room for `code`
    });

    $("joinForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const code = $("joinCode").value.trim().toLowerCase();
      const msg = $("joinMsg");
      if (!/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(code)) {
        msg.className = "msg";
        msg.textContent = "That code isn't valid. Use the format abc-defg-hij.";
        return;
      }
      msg.className = "msg ok";
      msg.textContent = "Joining " + code + "...";
      // TODO: connect your video/meeting service here and join the room for `code`
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    render();
  }

  /* ---------- gate: decide what the visitor sees ---------- */
  function render() {
    const email = sessionStorage.getItem(SESSION_KEY);
    const user = email && readUsers()[email];

    if (user) {
      $("gate").hidden = true;
      buildApp(user);
      $("app").hidden = false;
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      $("app").hidden = true;
      $("app").innerHTML = "";
      $("gate").hidden = false;
      show("login");
    }
  }

  render();
})();
