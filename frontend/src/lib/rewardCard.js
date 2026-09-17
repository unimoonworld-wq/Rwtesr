import { TIER_COLORS } from '../components/RarityTiers';

export const rewardUrl = card => `${process.env.REACT_APP_BACKEND_URL}/rewards/${card.public_id}`;
export async function drawRewardCard(canvas, card) {
  await document.fonts.ready;
  canvas.width = 1000; canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  const color = TIER_COLORS[card.tier] || '#b9f477';
  ctx.fillStyle = '#0b0f0c'; ctx.fillRect(0, 0, 1000, 1200);
  ctx.strokeStyle = '#202a21'; ctx.lineWidth = 1;
  for (let x = 40; x < 1000; x += 46) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1200); ctx.stroke(); }
  for (let y = 30; y < 1200; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1000, y); ctx.stroke(); }
  ctx.fillStyle = '#101710'; ctx.fillRect(45, 45, 910, 1110);
  ctx.strokeStyle = color; ctx.strokeRect(45.5, 45.5, 909, 1109);
  ctx.fillStyle = '#b9f477'; ctx.font = '500 45px Outfit'; ctx.fillText('inc.hood', 88, 117);
  ctx.font = '400 13px "JetBrains Mono"'; ctx.fillStyle = '#8fa184'; ctx.fillText('ALLOCATION RECORD / 01', 652, 104);
  ctx.fillStyle = color; ctx.fillRect(88, 170, 824, 2);
  ctx.font = '500 18px "JetBrains Mono"'; ctx.fillText(`${card.tier.toUpperCase()} / ${card.tier_odds}% DROP RATE`, 88, 218);
  // Architectural facets are artwork, not fabricated cryptographic proof.
  ctx.save(); ctx.translate(750, 390); ctx.strokeStyle = color;
  for (let ring = 0; ring < 5; ring++) { ctx.globalAlpha = .1 + ring * .05; ctx.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * Math.PI / 3 + ring * .05; const r = 75 + ring * 21; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
  ctx.restore(); ctx.fillStyle = '#f2f3ed'; ctx.font = '500 125px Outfit'; ctx.fillText(card.symbol, 80, 397);
  ctx.fillStyle = '#98aa8c'; ctx.font = '400 25px Manrope'; ctx.fillText(card.asset_name, 88, 445);
  ctx.fillStyle = color; ctx.font = '500 108px Outfit'; ctx.fillText(`$${card.amount.toFixed(2)}`, 82, 625);
  ctx.fillStyle = '#829376'; ctx.font = '400 16px "JetBrains Mono"'; ctx.fillText('RWA REWARD VALUE', 88, 667);
  ctx.fillStyle = '#c2ceba'; ctx.font = '400 21px "JetBrains Mono"'; ctx.fillText(`${card.quantity.toFixed(6)} ${card.symbol}`, 88, 718);
  ctx.strokeStyle = '#34452e'; ctx.beginPath(); ctx.moveTo(88, 760); ctx.lineTo(912, 760); ctx.stroke();
  [['COMMITTED', card.inc_committed], ['75% RETURNED', card.inc_returned], ['25% BURNED', card.inc_burned]].forEach(([label, value], i) => {
    const x = 88 + i * 279; ctx.fillStyle = '#879b79'; ctx.font = '400 14px "JetBrains Mono"'; ctx.fillText(label, x, 806);
    ctx.fillStyle = i === 2 ? '#df9872' : '#d5e2cb'; ctx.font = '500 25px "JetBrains Mono"'; ctx.fillText(`${value.toLocaleString('en-US')} INC`, x, 852);
  });
  ctx.fillStyle = '#8fa780'; ctx.font = '400 15px "JetBrains Mono"';
  ctx.fillText(`WALLET  ${card.wallet_label}`, 88, 930);
  ctx.fillText(`CYCLE   ${card.run_id.slice(0, 18).toUpperCase()}`, 88, 967);
  ctx.fillText(new Date(card.claimed_at * 1000).toISOString().slice(0, 10) + ' / 02H CYCLE', 88, 1004);
  ctx.fillStyle = color; ctx.fillRect(88, 1054, 70, 3);
  ctx.font = '400 13px "JetBrains Mono"'; ctx.fillText('REAL-WORLD VALUE. INCUBATED.', 88, 1094);
  ctx.fillStyle = '#667e59'; ctx.fillText(`ID ${card.public_id.slice(0, 10).toUpperCase()}`, 706, 1094);
  return canvas;
}
export const cardBlob = canvas => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Card export unavailable')), 'image/png'));
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}