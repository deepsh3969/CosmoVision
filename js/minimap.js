// Canvas navigation radar: player-centred, heading-up, with target + object blips.
export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.visible = true;
    this._sweep = 0;
  }

  setVisible(visible) {
    this.visible = visible;
    this.canvas.style.display = visible ? '' : 'none';
  }

  render({ dt, playerPos, heading, entries, targetId, range, scaleLabel }) {
    if (!this.visible) return;
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(width * dpr)) {
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 6;
    this._sweep = (this._sweep + dt * 0.9) % (Math.PI * 2);

    // Frame
    ctx.strokeStyle = 'rgba(126, 231, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(126, 231, 255, 0.14)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // Sweep
    const sweepX = cx + Math.cos(this._sweep) * radius;
    const sweepY = cy + Math.sin(this._sweep) * radius;
    const grad = ctx.createLinearGradient(cx, cy, sweepX, sweepY);
    grad.addColorStop(0, 'rgba(126,231,255,0)');
    grad.addColorStop(1, 'rgba(126,231,255,0.5)');
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sweepX, sweepY);
    ctx.stroke();

    const cos = Math.cos(-heading);
    const sin = Math.sin(-heading);
    let targetPlotted = false;

    for (const entry of entries) {
      const dx = entry.pos.x - playerPos.x;
      const dz = entry.pos.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > range) continue;
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;
      const px = cx + (rx / range) * radius;
      const py = cy + (rz / range) * radius;
      const isTarget = entry.id === targetId;
      const size = isTarget ? 4.5 : entry.kind === 'star' ? 3.4 : entry.kind === 'wormhole' ? 3 : 2.3;

      ctx.fillStyle = entry.color || '#9fb4d8';
      ctx.globalAlpha = isTarget ? 1 : 0.85;
      if (entry.kind === 'station') {
        ctx.fillRect(px - size, py - size, size * 2, size * 2);
      } else if (isTarget) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(px, py, size + 2.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
        targetPlotted = true;
      } else {
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Player (heading-up triangle)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#7ee7ff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.4, 5.4);
    ctx.lineTo(0, 3);
    ctx.lineTo(-4.4, 5.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Labels
    ctx.fillStyle = 'rgba(151, 162, 196, 0.9)';
    ctx.font = '600 8px ui-monospace, monospace';
    ctx.fillText(scaleLabel || '', 8, height - 8);
    if (!targetPlotted) {
      ctx.fillStyle = 'rgba(151, 162, 196, 0.55)';
      ctx.fillText('NO TARGET IN RANGE', 8, 14);
    }
  }
}
