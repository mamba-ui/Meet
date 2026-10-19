const $ = id => document.getElementById(id);

function ls(key, value){
  try{
    if(value === undefined) return localStorage.getItem(key);
    if(value === null) localStorage.removeItem(key);
    localStorage.setItem(key, value);
  }catch(e){}
  return null;
}

function getUser(){
  return ls("meetUser");
}

function requireLogin(){
  if(!getUser()) location.replace("index.html");
}

function logout(){
  ls("meetUser", null);
  location.href = "index.html";
}

function initials(name){
  return String(name || "U")
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function escapeHTML(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}

function nowTime(){
  const d = new Date();
  return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
}

const people = [
  {id:1, name:"Amara N.", color:"#9fe8ff", live:true, msgs:[
    ["them","Hi! Are we still on for the 4pm meet-up?","10:02"],
    ["me","Yes, I'll send the link soon.","10:05"]
  ]},
  {id:2, name:"Kigali Hikers", color:"#c9b8ff", live:false, msgs:[
    ["them","Saturday's route is posted.","Yesterday"]
  ]},
  {id:3, name:"Eric M.", color:"#a8f0d8", live:true, msgs:[
    ["me","Can you share the agenda?","Mon"],
    ["them","Sure, tonight.","Mon"]
  ]},
  {id:4, name:"Design Club", color:"#ffc6e0", live:false, msgs:[
    ["them","New members join at 6pm.","Sun"]
  ]}
];

function savePeople(){
  ls("meetPeople", JSON.stringify(people));
}

function loadPeople(){
  const saved = JSON.parse(ls("meetPeople") || "null");
  if(saved){
    saved.forEach(savedPerson => {
      const original = people.find(p => p.id === savedPerson.id);
      if(original) original.msgs = savedPerson.msgs;
    });
  }
}

function personById(id){
  return people.find(p => p.id == id);
}

function renderNav(active){
  const links = [
    ["home.html","🏠","Home"],
    ["meet.html","📹","Meet"],
    ["chat.html","💬","Chat"],
    ["calls.html","📞","Calls"],
    ["people.html","👥","People"],
    ["games.html","🎮","Games"],
    ["account.html","👤","Account"],
    ["settings.html","⚙️","Settings"]
  ];

  return links.map(([href, icon, label]) =>
    `<a href="${href}" class="${href === active ? "on" : ""}">
      <span>${icon}</span>${label}
    </a>`
  ).join("");
}
