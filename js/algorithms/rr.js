
export function simulateRR(processes, quantum){
  // simplified per-unit trace: {time, running, ready}
  const procs = processes.map(p=>({...p, remaining:p.burst, completion:null})).sort((a,b)=>a.arrival-b.arrival);
  const trace = [];
  let time = 0, idxArrival = 0;
  const ready = [];
  const completed = [];
  function snapshot(runningPid){
    trace.push({time, running: runningPid, ready: ready.map(r=>r.id)});
  }
  // initial arrivals at time 0
  while(idxArrival<procs.length && procs[idxArrival].arrival<=time){ ready.push(procs[idxArrival]); idxArrival++; }
  // if nothing ready fast-forward to first arrival
  if(ready.length===0 && idxArrival<procs.length){ time = procs[idxArrival].arrival; while(idxArrival<procs.length && procs[idxArrival].arrival<=time){ ready.push(procs[idxArrival]); idxArrival++; } }
  // simulation loop: take head, run for min(quantum, remaining), but record each unit's running pid (or null if idle)
  while(completed.length < procs.length){
    if(ready.length===0){
      // CPU idle until next arrival: record idle per unit
      if(idxArrival<procs.length){
        const nextA = procs[idxArrival].arrival;
        while(time < nextA){
          snapshot(null);
          time += 1;
          while(idxArrival<procs.length && procs[idxArrival].arrival<=time){ ready.push(procs[idxArrival]); idxArrival++; }
        }
        continue;
      }
    }
    const cur = ready.shift();
    const runFor = Math.min(cur.remaining, quantum);
    for(let u=0; u<runFor; u++){
      // execute 1 unit
      snapshot(cur.id);
      cur.remaining -= 1;
      time += 1;
      // arrivals at this time
      while(idxArrival<procs.length && procs[idxArrival].arrival<=time){ ready.push(procs[idxArrival]); idxArrival++; }
    }
    if(cur.remaining === 0){
      cur.completion = time;
      completed.push(cur);
    } else {
      ready.push(cur);
    }
  }
  // compute totals and per-process stats
  const totalTime = trace.length>0 ? trace[trace.length-1].time : time;
  const busyTime = trace.filter(s=>s.running !== null).length;
  const idleTime = trace.filter(s=>s.running === null).length;
  const stats = procs.map(p=>({id:p.id, arrival:p.arrival, burst:p.burst, completion:p.completion, turnaround: p.completion - p.arrival, waiting: (p.completion - p.arrival) - p.burst}));
  const avgWait = stats.reduce((s,x)=>s+x.waiting,0)/stats.length;
  const avgTurn = stats.reduce((s,x)=>s+x.turnaround,0)/stats.length;
  return {trace, stats, totals: {totalTime, busyTime, idleTime}, avgWait, avgTurn};
}
