/* ===== Your Supabase values (public keys, safe in a web page) ===== */
window.MEET_CONFIG = {
  url: 'https://abcdxyz.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...'
};
/* ================================================================== */

(async function () {
  const cfg = window.MEET_CONFIG;
  const root = document.documentElement;
  const isPublic = root.hasAttribute('data-public');

  const ready = (fn) =>
    document.readyState === 'loading'
      ? addEventListener('DOMContentLoaded', fn)
      : fn();

  const nextPage = () => {
    const n = new URLSearchParams(location.search).get('next');
    return /^[\w-]+\.html$/.test(n || '') ? n : 'home.html';
  };

  // Load Supabase from CDN
  let createClient;

  try {
    const module = await import('https://esm.sh/@supabase/supabase-js@2');
    createClient = module.createClient;
  } catch (error) {
    console.error(error);
    ready(() => {
      const banner = document.createElement('div');
      banner.textContent = 'Could not load the login system. Check your internet connection and refresh.';
      banner.style.cssText =
        'position:fixed;top:0;left:0;right:0;z-index:99;background:#dd2a7b;color:#fff;font:600 13px sans-serif;padding:8px 12px;text-align:center';
      document.body.appendChild(banner);
    });
    return;
  }

  // Create the Supabase client
  const supabase = createClient(cfg.url, cfg.key);

  const toLogin = () => {
    const currentPage = location.pathname.split('/').pop() || 'home.html';
    location.replace('login.html?next=' + encodeURIComponent(currentPage));
  };

  function personalize(user) {
    const name =
      (user.user_metadata && user.user_metadata.username) ||
      user.email.split('@')[0];

    document.querySelectorAll('[data-username]').forEach((element) => {
      element.textContent = name;
    });

    document.querySelectorAll('.avatar').forEach((avatar) => {
      avatar.textContent = name[0].toUpperCase();
      avatar.style.cursor = 'pointer';
      avatar.title = 'Click to log out';

      avatar.onclick = async () => {
        if (confirm('Log out of Meet?')) {
          await supabase.auth.signOut();
        }
      };
    });
  }

  const { data, error } = await supabase.auth.getSession();
  const session = data.session;

  if (error) {
    console.error(error);
    if (!isPublic) toLogin();
    return;
  }

  if (!session && !isPublic) {
    toLogin();
    return;
  }

  if (session && isPublic) {
    location.replace(nextPage());
    return;
  }

  root.style.visibility = 'visible';

  if (session) {
    ready(() => personalize(session.user));
  }

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && !isPublic) {
      toLogin();
    }
  });
})();
