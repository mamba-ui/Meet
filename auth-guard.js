/* ===== Your Supabase values (public keys, safe in a web page) ===== */
window.MEET_CONFIG={url:'https://dzzqtyghwbqvgyovxvbp.supabase.co',key:'sb_publishable_uNBvZlmwspJDeb236nBTqw_TZ17iBlI'};
/* ========================================================================== */
(function(){
  const cfg=window.MEET_CONFIG,root=document.documentElement,isPublic=root.hasAttribute('data-public');
  const ready=fn=>document.readyState==='loading'?addEventListener('DOMContentLoaded',fn):fn();
  const nextPage=()=>{const n=new URLSearchParams(location.search).get('next');return /^[\w-]+\.html$/.test(n||'')?n:'home.html'};
  if(typeof supabase==='undefined'){ready(()=>{const b=document.createElement('div');b.textContent='Could not load the login system. Check your internet connection and refresh.';b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99;background:#dd2a7b;color:#fff;font:600 13px sans-serif;padding:8px 12px;text-align:center';document.body.appendChild(b)});return}
  if(!isPublic)root.style.visibility='hidden';
  const sb=window.meetSb=supabase.createClient(cfg.url,cfg.key);
  const toLogin=()=>location.replace('login.html?next='+encodeURIComponent(location.pathname.split('/').pop()||'home.html'));
  function personalize(u){
    const name=(u.user_metadata&&u.user_metadata.username)||u.email.split('@')[0];
    document.querySelectorAll('[data-username]').forEach(e=>e.textContent=name);
    document.querySelectorAll('.avatar').forEach(a=>{a.textContent=name[0].toUpperCase();a.style.cursor='pointer';a.title='Click to log out';a.onclick=()=>{if(confirm('Log out of Meet?'))sb.auth.signOut()}});
  }
  sb.auth.getSession().then(({data})=>{
    const s=data.session;
    if(!s&&!isPublic)return toLogin();
    if(s&&isPublic)return location.replace(nextPage());
    root.style.visibility='visible';
    if(s)ready(()=>personalize(s.user));
  }).catch(()=>{if(!isPublic)toLogin()});
  sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT'&&!isPublic)toLogin()});
})();
