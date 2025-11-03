
export function colorForId(id){
  const palette = ["#f97316","#06b6d4","#f43f5e","#60a5fa","#34d399","#a78bfa","#fb7185","#f59e0b"];
  let h = 0; for(let i=0;i<id.length;i++) h+=id.charCodeAt(i);
  return palette[h % palette.length];
}
export function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
export function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
