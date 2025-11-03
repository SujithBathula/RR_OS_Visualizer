
import { simulateRR } from './algorithms/rr.js';
import { colorForId, clamp, easeOutCubic } from './utils.js';

const elements = {
  canvas: document.getElementById('canvas'),
  procTable: document.getElementById('procTable'),
  addProcBtn: document.getElementById('addProcBtn'),
  clearProcsBtn: document.getElementById('clearProcsBtn'),
  loadPdfExampleBtn: document.getElementById('loadPdfExampleBtn'),
  quantum: document.getElementById('quantum'),
  generateBtn: document.getElementById('generateBtn'),
  playPauseBtn: document.getElementById('playPauseBtn'),
  stepFwdBtn: document.getElementById('stepFwdBtn'),
  stepBackBtn: document.getElementById('stepBackBtn'),
  resetBtn: document.getElementById('resetBtn'),
  timeline: document.getElementById('timeline'),
  timeLabel: document.getElementById('timeLabel'),
  speed: document.getElementById('speed'),
  speedLabel: document.getElementById('speedLabel'),
  screenshotBtn: document.getElementById('screenshotBtn'),
  exportTraceBtn: document.getElementById('exportTraceBtn'),
  statTotal: document.getElementById('statTotal'),
  statBusy: document.getElementById('statBusy'),
  statIdle: document.getElementById('statIdle'),
  statTurn: document.getElementById('statTurn'),
  statWait: document.getElementById('statWait'),
};

let processes = [];
let trace = [];
let stats = [];
let totals = {totalTime:0, busyTime:0, idleTime:0};
let currentStep = 0;
let playing = false;
let animState = null;
let lastTimestamp = 0;
let speed = 1;
const visualQueue = [];

function addProcess(arrival=0, burst=1){
  const id = 'P' + (processes.length+1);
  processes.push({id, arrival: Number(arrival), burst: Number(burst)});
  renderProcTable();
}

function clearProcesses(){ processes = []; renderProcTable(); }

function renderProcTable(){
  const tbody = elements.procTable.querySelector('tbody');
  tbody.innerHTML = '';
  processes.forEach((p,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.id}</td>
      <td><input class='arrival' data-idx='${i}' value='${p.arrival}'></td>
      <td><input class='burst' data-idx='${i}' value='${p.burst}'></td>
      <td><button class='remove' data-idx='${i}'>Remove</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.arrival').forEach(inp=>inp.addEventListener('change', (ev)=>{ processes[ev.target.dataset.idx].arrival = Number(ev.target.value); }));
  tbody.querySelectorAll('.burst').forEach(inp=>inp.addEventListener('change', (ev)=>{ processes[ev.target.dataset.idx].burst = Number(ev.target.value); }));
  tbody.querySelectorAll('.remove').forEach(b=>b.addEventListener('click', (ev)=>{ processes.splice(Number(ev.target.dataset.idx),1); renderProcTable(); }));
}

elements.addProcBtn.addEventListener('click', ()=>{ addProcess(0,1); });
elements.clearProcsBtn.addEventListener('click', ()=>{ clearProcesses(); });
elements.loadPdfExampleBtn.addEventListener('click', ()=>{ loadExample(); });

elements.generateBtn.addEventListener('click', ()=>{ generateTrace(); });
elements.playPauseBtn.addEventListener('click', ()=>{ togglePlay(); });
elements.stepFwdBtn.addEventListener('click', ()=>{ stepForward(); });
elements.stepBackBtn.addEventListener('click', ()=>{ stepBack(); });
elements.resetBtn.addEventListener('click', ()=>{ reset(); });
elements.speed.addEventListener('input', ev=>{ speed = parseFloat(ev.target.value); elements.speedLabel.textContent = speed + 'x'; });
elements.timeline.addEventListener('input', ev=>{ seek(Number(ev.target.value)); });

elements.screenshotBtn.addEventListener('click', ()=>{ const url = elements.canvas.toDataURL('image/png'); const a = document.createElement('a'); a.href=url; a.download = `rr-step-${currentStep}.png`; a.click(); });

elements.exportTraceBtn.addEventListener('click', ()=>{ const blob = new Blob([JSON.stringify({trace, stats, totals},null,2)],{type:'application/json'}); const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=u; a.download='rr-trace.json'; a.click(); });

function loadExample(){
  processes = [
    {id:'P1', arrival:0, burst:5},
    {id:'P2', arrival:2, burst:3},
    {id:'P3', arrival:4, burst:4},
    {id:'P4', arrival:6, burst:6},
    {id:'P5', arrival:8, burst:2},
  ];
  elements.quantum.value = 2;
  renderProcTable();
  generateTrace();
}

function generateTrace(){
  if(processes.length===0){ alert('Add at least one process'); return; }
  const q = Math.max(1, Math.floor(Number(elements.quantum.value) || 1));
  const input = processes.map(p=>({id:p.id, arrival:Number(p.arrival), burst:Number(p.burst)}));
  const res = simulateRR(input, q);
  trace = res.trace; stats = res.stats; totals = res.totals;
  elements.timeline.max = Math.max(0, trace.length-1);
  currentStep = 0;
  prepareVisuals();
  renderStats();
  seek(0);
}

function renderStats(){
  elements.statTotal.textContent = totals.totalTime;
  elements.statBusy.textContent = totals.busyTime;
  elements.statIdle.textContent = totals.idleTime;
  elements.statTurn.textContent = (stats.length? (stats.reduce((s,x)=>s+x.turnaround,0)/stats.length).toFixed(2) : '—');
  elements.statWait.textContent = (stats.length? (stats.reduce((s,x)=>s+x.waiting,0)/stats.length).toFixed(2) : '—');
}

function prepareVisuals(){
  visualQueue.length = 0;
  const leftX = 30, baseY = 80;
  processes.forEach((p,i)=>{
    visualQueue.push({id:p.id, x:leftX - 250, y: baseY + i*36, tx:leftX, ty: baseY + i*36, color: colorForId(p.id)});
  });
}

function seek(stepIndex){
  currentStep = clamp(stepIndex, 0, Math.max(0, trace.length-1));
  elements.timeline.value = currentStep;
  elements.timeLabel.textContent = `Step: ${currentStep} / ${Math.max(0, trace.length-1)}`;
  const s = trace[currentStep];
  updateTargets(s.ready || []);
  renderCanvasInstant();
}

function updateTargets(queueIds){
  const leftX = 30;
  queueIds.forEach((pid, idx)=>{
    const v = visualQueue.find(x=>x.id===pid);
    if(v){ v.tx = leftX + 10 + (idx%4)*76; v.ty = 80 + Math.floor(idx/4)*40; }
  });
  visualQueue.forEach(v=>{ if(!queueIds.includes(v.id)){ v.tx = -220; } });
}

function togglePlay(){ playing = !playing; elements.playPauseBtn.textContent = playing ? 'Pause' : 'Play'; if(playing) startAnim(); else stopAnim(); }
function startAnim(){ lastTimestamp = performance.now(); animState = null; requestAnimationFrame(loop); }
function stopAnim(){ playing = false; elements.playPauseBtn.textContent = 'Play'; animState = null; }

function stepForward(){ if(currentStep < trace.length - 1) seek(currentStep + 1); }
function stepBack(){ if(currentStep > 0) seek(currentStep - 1); }
function reset(){ stopAnim(); seek(0); }

function loop(ts){
  const dt = (ts - lastTimestamp) / 1000; lastTimestamp = ts;
  if(playing){
    if(!animState){ animState = {from: currentStep, to: Math.min(currentStep+1, trace.length-1), prog:0, dur: 0.8 / speed}; }
    animState.prog += dt;
    const t = clamp(animState.prog / animState.dur, 0, 1);
    const eased = easeOutCubic(t);
    visualQueue.forEach(v=>{ v.x += (v.tx - v.x) * eased * 0.9; v.y += (v.ty - v.y) * eased * 0.9; });
    if(t >= 1){
      currentStep = animState.to;
      elements.timeline.value = currentStep;
      elements.timeLabel.textContent = `Step: ${currentStep} / ${Math.max(0, trace.length-1)}`;
      animState = null;
      if(currentStep < trace.length - 1){ animState = {from: currentStep, to: currentStep+1, prog:0, dur: 0.8 / speed}; updateTargets(trace[currentStep+1].ready || []); }
      else { stopAnim(); }
    }
  } else {
    visualQueue.forEach(v=>{ v.x += (v.tx - v.x) * 0.25; v.y += (v.ty - v.y) * 0.25; });
  }
  renderCanvas();
  if(playing) requestAnimationFrame(loop);
}

function renderCanvas(){
  const c = elements.canvas; const ctx = c.getContext('2d');
  const DPR = window.devicePixelRatio || 1;
  c.width = c.clientWidth * DPR; c.height = c.clientHeight * DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0,0,c.clientWidth,c.clientHeight);
  ctx.fillStyle = '#021827'; ctx.fillRect(0,0,c.clientWidth,c.clientHeight);
  const cpuBox = {x: c.clientWidth*0.56, y: 110, w: 350, h: 120};
  const readyArea = {x: 20, y: 30, w: 440, h: 200};
  const gantt = {x:20, y: 260, w: c.clientWidth-40, h: 360};
  ctx.fillStyle = '#06222b'; roundRect(ctx, readyArea.x, readyArea.y, readyArea.w, readyArea.h, 12, true);
  ctx.fillStyle = '#9bdff7'; ctx.font = '14px Inter, Arial'; ctx.fillText('Ready Queue (head → tail)', readyArea.x+12, readyArea.y+26);
  ctx.fillStyle = '#082433'; roundRect(ctx, cpuBox.x, cpuBox.y, cpuBox.w, cpuBox.h, 12, true);
  ctx.fillStyle = '#cfeefb'; ctx.font='14px Inter, Arial'; ctx.fillText('CPU', cpuBox.x+12, cpuBox.y+26);
  ctx.fillStyle = '#021f29'; ctx.fillRect(gantt.x, gantt.y, gantt.w, gantt.h);
  ctx.fillStyle = '#cfeefb'; ctx.fillText('Gantt Timeline (each unit = 1 time)', gantt.x+8, gantt.y+22);
  if(!trace || trace.length===0){ ctx.fillStyle='#9fb8c7'; ctx.fillText('No trace. Add processes, set quantum, and click Generate.', 30, 320); return; }
  visualQueue.forEach(v=>{
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(ctx, v.x+3, v.y+3, 76, 34, 8, true);
    ctx.fillStyle = v.color; roundRect(ctx, v.x, v.y, 76, 34, 8, true);
    ctx.fillStyle = '#00161a'; ctx.font = '12px Inter, Arial'; ctx.fillText(v.id, v.x+24, v.y+21);
  });
  const step = trace[Math.max(0, Math.min(trace.length-1, currentStep))];
  if(step.running){
    const col = colorForId(step.running);
    ctx.fillStyle = col; roundRect(ctx, cpuBox.x+20, cpuBox.y+44, cpuBox.w-56, cpuBox.h-68, 8, true);
    ctx.fillStyle = '#00161a'; ctx.font='13px Inter, Arial'; ctx.fillText('Running: ' + step.running, cpuBox.x+28, cpuBox.y+78);
  } else {
    ctx.fillStyle = '#0b2630'; ctx.fillText('CPU idle', cpuBox.x+28, cpuBox.y+78);
  }
  const total = trace.length;
  const blockW = Math.max(6, Math.floor((gantt.w - 20) / Math.max(1, total)));
  const xOff = gantt.x + 10;
  for(let i=0;i<=currentStep;i++){
    const s = trace[i];
    const pid = s.running;
    const color = pid ? colorForId(pid) : '#26313a';
    ctx.fillStyle = color;
    ctx.fillRect(xOff + i*blockW, gantt.y+34, blockW-1, 48);
    if(blockW>22){ ctx.fillStyle='#00161a'; ctx.font='11px Inter, Arial'; ctx.fillText(pid||'idle', xOff + i*blockW + 4, gantt.y+66); }
  }
  ctx.fillStyle='rgba(255,255,255,0.03)'; roundRect(ctx, c.clientWidth-372, 12, 348, 96, 8, true);
  ctx.fillStyle='#cfeefb'; ctx.font='12px Inter, Arial'; ctx.fillText(`Time: ${step.time}`, c.clientWidth-360, 34);
  ctx.fillText(`CPU Busy: ${totals.busyTime}  Idle: ${totals.idleTime}`, c.clientWidth-360, 56);
  ctx.fillText(`Avg Turnaround: ${(stats.length? (stats.reduce((s,x)=>s+x.turnaround,0)/stats.length).toFixed(2) : '—')}`, c.clientWidth-360, 78);
  ctx.fillText(`Avg Waiting: ${(stats.length? (stats.reduce((s,x)=>s+x.waiting,0)/stats.length).toFixed(2) : '—')}`, c.clientWidth-360, 100);
}

function roundRect(ctx,x,y,w,h,r,fill){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); if(fill) ctx.fill(); }

// initial demo
addProcess(0,5); addProcess(2,3); addProcess(4,4); addProcess(6,6); addProcess(8,2);
renderProcTable();
generateTrace();
seek(0);
