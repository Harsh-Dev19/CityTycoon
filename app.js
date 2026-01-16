/* City Tycoon — Web (client-side)
   Single-file game logic and UI wiring.
   Author: ChatGPT (adapted)
*/

async function fetchGameState() {
  const res = await fetch('http://127.0.0.1:5000/state');
  const data = await res.json();
  console.log("Game State:", data);
}

async function updateGameState(newState) {
  const res = await fetch('http://127.0.0.1:5000/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newState)
  });
  const data = await res.json();
  console.log("Updated:", data);
}



(() => {
  // Config
  const CELL = 64;
  const GRID_W = 10;
  const GRID_H = 7;
  const CANVAS_W = CELL * GRID_W;
  const CANVAS_H = CELL * GRID_H;
  const TICK_INTERVAL = 1000; // ms

  // Building definitions (id matches index)
  const BUILDINGS = [
    { id: 1, name: "House", cost: 100, upkeep: 0, income: 2, pop: 2, energy: -1, happiness: 0.05, cls: "green", emoji: "🏠" },
    { id: 2, name: "Shop", cost: 200, upkeep: 1, income: 8, pop: 0, energy: -2, happiness: 0.02, cls: "orange", emoji: "🏬" },
    { id: 3, name: "Farm", cost: 150, upkeep: 0, income: 3, pop: 0, energy: 0, happiness: 0.03, cls: "brown", emoji: "🌾" },
    { id: 4, name: "Power Plant", cost: 400, upkeep: 2, income: 0, pop: 0, energy: 8, happiness: -0.12, cls: "gray", emoji: "⚡" },
  ];
  const BUILD_MAP = {};
  BUILDINGS.forEach(b => BUILD_MAP[b.id] = b);

  // Game state
  const state = {
    money: 500,
    population: 0,
    happiness: 0.6,
    energy: 0,
    grid: Array.from({length: GRID_W}, () => Array(GRID_H).fill(null)),
    buildings: [],
    running: true,
    selectedBuilding: 1,
    lastTick: Date.now(),
    msg: "Welcome!",
  };

  // DOM
  const canvas = document.getElementById("city-canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d", { alpha: false });

  const moneyEl = document.getElementById("money");
  const popEl = document.getElementById("population");
  const hapEl = document.getElementById("happiness");
  const energyEl = document.getElementById("energy");
  const tickStatusEl = document.getElementById("tick-status");
  const msgEl = document.getElementById("msg");
  const buildList = document.getElementById("build-list");
  const btnPause = document.getElementById("btn-pause");
  const btnSave = document.getElementById("btn-save");
  const btnLoad = document.getElementById("btn-load");
  const btnReset = document.getElementById("btn-reset");

  // Utilities
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function formatMoney(n){ return `$${n}`; }
  function setMsg(text, t=2000){ state.msg = text; msgEl.textContent = text;
    if (t>0) setTimeout(()=>{ if (msgEl.textContent === text) msgEl.textContent = ""; }, t);
  }

  // UI setup: building list
  function renderBuildList(){
    buildList.innerHTML = "";
    BUILDINGS.forEach(b => {
      const item = document.createElement("div");
      item.className = `build-item ${state.selectedBuilding === b.id ? "selected" : ""}`;
      item.dataset.bid = b.id;
      const icon = document.createElement("div");
      icon.className = `icon ${b.cls}`;
      icon.textContent = b.emoji;
      const meta = document.createElement("div");
      meta.className = "build-meta";
      meta.innerHTML = `<div class="title">${b.id}. ${b.name} <span class="build-cost">$${b.cost}</span></div>
                        <div class="sub">Income:${b.income}/s Upkeep:${b.upkeep} Pop:+${b.pop} E:${b.energy}</div>`;
      item.appendChild(icon);
      item.appendChild(meta);
      item.onclick = () => { state.selectedBuilding = b.id; renderBuildList(); };
      buildList.appendChild(item);
    });
  }

  // Place, demolish
  function canPlace(x,y){ return (x>=0 && x<GRID_W && y>=0 && y<GRID_H && !state.grid[x][y]); }
  function placeAt(x,y,bid){
    if (!canPlace(x,y)) { setMsg("Cannot place there"); return false; }
    const b = BUILD_MAP[bid];
    if (state.money < b.cost){ setMsg("Not enough money"); return false; }
    state.money -= b.cost;
    const pb = { bid, x, y, placedAt: Date.now() };
    state.buildings.push(pb);
    state.grid[x][y] = pb;
    state.population += b.pop;
    state.energy += b.energy;
    state.happiness = clamp(state.happiness + b.happiness*0.5, 0, 1);
    setMsg(`Placed ${b.name}`);
    return true;
  }
  function demolishAt(x,y){
    if (!(x>=0 && x<GRID_W && y>=0 && y<GRID_H)) return false;
    const pb = state.grid[x][y];
    if (!pb) { setMsg("Empty"); return false; }
    const b = BUILD_MAP[pb.bid];
    const refund = Math.floor(b.cost * 0.5);
    state.money += refund;
    state.population = Math.max(0, state.population - b.pop);
    state.energy -= b.energy;
    state.happiness = clamp(state.happiness - b.happiness*0.5, 0, 1);
    state.grid[x][y] = null;
    state.buildings = state.buildings.filter(it => it !== pb);
    setMsg(`Demolished ${b.name} (+$${refund})`);
    return true;
  }

  // Tick logic (called every second)
  function tick(){
    // sum up
    let totalIncome = 0, totalUpkeep = 0, producedEnergy = 0, reqEnergy = 0, popFromHouses = 0;
    for (const pb of state.buildings){
      const b = BUILD_MAP[pb.bid];
      if (b.energy > 0) producedEnergy += b.energy;
      else if (b.energy < 0) reqEnergy += -b.energy;
      totalIncome += b.income;
      totalUpkeep += b.upkeep;
      popFromHouses += b.pop;
    }
    state.population = Math.max(0, state.population);
    state.energy = producedEnergy - reqEnergy;

    const popEffect = clamp(0.02 - (state.population * 0.001), -0.3, 0.05);
    const energyEffect = state.energy >= 0 ? 0.05 : -0.12;
    state.happiness = clamp(state.happiness + popEffect + energyEffect * 0.02, 0, 1);

    const happinessMult = 0.8 + state.happiness * 0.8;
    const energyMult = state.energy >= 0 ? 1.0 : 0.6;
    const popBonus = 1.0 + Math.min(state.population / 50.0, 0.5);

    let gained = Math.floor((totalIncome - totalUpkeep) * happinessMult * energyMult * popBonus);
    gained = Math.max(-50, gained);
    state.money += gained;

    if (popFromHouses > 0 && state.happiness > 0.5){
      const growth = Math.floor(popFromHouses * 0.02);
      state.population += growth;
    }

    // UI update feedback
    setMsg(`Tick: ${gained>=0?'+':'-'}$${Math.abs(gained)}  pop:${state.population}  E:${state.energy}`, 1800);
  }

  // Rendering
  function draw(){
    // background
    ctx.fillStyle = "#07101a";
    ctx.fillRect(0,0,CANVAS_W,CANVAS_H);

    // draw grid floor
    for (let gx=0; gx<GRID_W; gx++){
      for (let gy=0; gy<GRID_H; gy++){
        const x = gx * CELL, y = gy * CELL;
        // base tile
        ctx.fillStyle = ( (gx+gy) % 2 === 0 ) ? "#0d1620" : "#0b131b";
        ctx.fillRect(x, y, CELL, CELL);
        // inner panel
        ctx.fillStyle = "#08101a";
        ctx.fillRect(x+4, y+4, CELL-8, CELL-8);
        // border
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.strokeRect(x, y, CELL, CELL);
      }
    }

    // draw buildings
    for (const pb of state.buildings){
      const b = BUILD_MAP[pb.bid];
      const x = pb.x * CELL, y = pb.y * CELL;
      // colored rect
      ctx.fillStyle = {
        1: "#22c55e", 2: "#fb923c", 3: "#d97706", 4: "#94a3b8"
      }[pb.bid] || "#777";
      roundRect(ctx, x+10, y+10, CELL-20, CELL-20, 8, true, false);
      // emoji/icon
      ctx.font = "26px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#07101a";
      ctx.fillText(b.emoji, x + CELL/2, y + CELL/2);
    }

    // draw hover preview
    if (mouse.hover && mouse.onGrid){
      const { gx, gy } = mouse;
      ctx.strokeStyle = canPlace(gx,gy) ? "rgba(96,165,250,0.9)" : "rgba(240,72,72,0.9)";
      ctx.lineWidth = 3;
      ctx.strokeRect(gx*CELL+2, gy*CELL+2, CELL-4, CELL-4);
      // cost preview
      const b = BUILD_MAP[state.selectedBuilding];
      ctx.font = "14px Inter, Arial";
      ctx.fillStyle = state.money >= b.cost && canPlace(gx,gy) ? "#9be7ff" : "#ffb3b3";
      ctx.textAlign = "left";
      ctx.fillText(`${b.name} - $${b.cost}`, 8, CANVAS_H - 10);
    }

    // grid lines subtle
    ctx.strokeStyle = "rgba(255,255,255,0.02)";
    ctx.lineWidth = 1;
    for (let gx=1; gx<GRID_W; gx++){
      ctx.beginPath(); ctx.moveTo(gx*CELL,0); ctx.lineTo(gx*CELL,CANVAS_H); ctx.stroke();
    }
    for (let gy=1; gy<GRID_H; gy++){
      ctx.beginPath(); ctx.moveTo(0,gy*CELL); ctx.lineTo(CANVAS_W,gy*CELL); ctx.stroke();
    }

    // small drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, CANVAS_H-6, CANVAS_W, 6);
  }

  // helper to draw rounded rect
  function roundRect(ctx, x, y, w, h, r, fill, stroke){
    if (typeof r === "undefined") r = 5;
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // Mouse handling
  const mouse = { x:0, y:0, gx:0, gy:0, onGrid:false, hover:false };
  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    mouse.x = mx; mouse.y = my;
    mouse.gx = Math.floor(mx / CELL);
    mouse.gy = Math.floor(my / CELL);
    mouse.onGrid = mx >= 0 && my >= 0 && mx < CANVAS_W && my < CANVAS_H;
    mouse.hover = true;
  });
  canvas.addEventListener("mouseleave", () => { mouse.hover = false; mouse.onGrid=false; });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const gx = Math.floor(mx / CELL), gy = Math.floor(my / CELL);
    if (e.button === 0){ // left
      placeAt(gx, gy, state.selectedBuilding);
      renderAll();
    } else if (e.button === 2){ // right
      demolishAt(gx, gy);
      renderAll();
    }
  });

  // Keyboard
  window.addEventListener("keydown", (e) => {
    if (e.key === " "){ state.running = !state.running; updateControls(); e.preventDefault(); }
    if (["1","2","3","4"].includes(e.key)){ state.selectedBuilding = parseInt(e.key); renderBuildList(); renderAll(); }
    if (e.key.toLowerCase() === "s"){ saveGame(); setMsg("Saved to localStorage"); }
    if (e.key.toLowerCase() === "l"){ loadGame(); setMsg("Loaded"); renderAll(); }
    if (e.key.toLowerCase() === "r"){ resetGame(); renderAll(); setMsg("Reset"); }
  });

  // Buttons
  btnPause.addEventListener("click", ()=> { state.running = !state.running; updateControls(); });
  btnSave.addEventListener("click", ()=> { saveGame(); setMsg("Saved"); });
  btnLoad.addEventListener("click", ()=> { loadGame(); renderAll(); setMsg("Loaded"); });
  btnReset.addEventListener("click", ()=> { resetGame(); renderAll(); setMsg("Reset"); });

  function updateControls(){
    tickStatusEl.textContent = state.running ? "Running" : "Paused";
    btnPause.textContent = state.running ? "Pause" : "Resume";
  }

  // Save / Load via localStorage
  const SAVE_KEY = "city_tycoon_save_v1";
  function saveGame(){
    const payload = {
      money: state.money,
      population: state.population,
      happiness: state.happiness,
      buildings: state.buildings,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  }
  function loadGame(){
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { setMsg("No save found"); return false; }
    try {
      const data = JSON.parse(raw);
      state.money = data.money || 0;
      state.population = data.population || 0;
      state.happiness = typeof data.happiness === "number" ? data.happiness : 0.6;
      // restore buildings
      state.grid = Array.from({length: GRID_W}, () => Array(GRID_H).fill(null));
      state.buildings = [];
      (data.buildings || []).forEach(pb=>{
        if (pb && typeof pb.x === "number"){
          state.buildings.push(pb);
          if (pb.x>=0 && pb.x<GRID_W && pb.y>=0 && pb.y<GRID_H) state.grid[pb.x][pb.y] = pb;
        }
      });
      // recalc energy
      state.energy = state.buildings.reduce((acc,pb)=> acc + (BUILD_MAP[pb.bid].energy||0), 0);
      return true;
    } catch (err){
      console.error(err); setMsg("Failed to load save"); return false;
    }
  }

  function resetGame(){
    state.money = 500; state.population=0; state.happiness=0.6; state.energy=0;
    state.grid = Array.from({length: GRID_W}, () => Array(GRID_H).fill(null));
    state.buildings = [];
    state.running = true;
    state.selectedBuilding = 1;
    setMsg("City reset");
  }

  // Main loop
  function renderAll(){
    // draw canvas
    draw();
    // update stats
    moneyEl.textContent = formatMoney(state.money);
    popEl.textContent = state.population;
    hapEl.textContent = `${Math.round(state.happiness * 100)}%`;
    energyEl.textContent = state.energy;
    tickStatusEl.textContent = state.running ? "Running" : "Paused";
    msgEl.textContent = state.msg || "";
    renderBuildList();
  }

  // tick timer
  setInterval(() => {
    if (state.running) tick();
    renderAll();
  }, TICK_INTERVAL);

  // animate - keep drawing for hover preview and smoothness
  function loop(){
    renderAll();
    requestAnimationFrame(loop);
  }

  // initial
  renderBuildList();
  updateControls();
  renderAll();
  loop();

  // expose some for console tinkering
  window.ct = { state, saveGame, loadGame, resetGame, placeAt, demolishAt };

})();
