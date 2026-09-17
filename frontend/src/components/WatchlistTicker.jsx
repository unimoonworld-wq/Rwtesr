import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';

// Render the scrolling strip within one bounded canvas: no duplicated,
// off-screen links, horizontal document overflow, or seam at loop boundaries.
export const WatchlistTicker = ({ assets }) => {
  const canvasRef = useRef(null);
  const offset = useRef(0);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas.parentElement;
    const context = canvas.getContext('2d');
    if (!context || !assets.length) return;
    let frame;
    let previous = 0;
    let width = 0;
    let height = 0;
    let itemWidth = 218;

    const paint = () => {
      context.clearRect(0, 0, width, height);
      const cycle = assets.length * itemWidth;
      const origin = -(offset.current % cycle);
      context.textBaseline = 'middle';
      for (let start = origin; start < width; start += cycle) {
        assets.forEach((asset, index) => {
          const x = start + index * itemWidth;
          if (x + itemWidth < 0 || x > width) return;
          const y = height / 2;
          context.fillStyle = asset.color;
          context.font = '600 11px "JetBrains Mono", monospace';
          context.fillText(asset.symbol === 'GLD' ? '▰' : asset.symbol.charAt(0), x + 5, y);
          context.fillStyle = '#dce2d7';
          context.font = '500 10px "JetBrains Mono", monospace';
          context.fillText(asset.symbol, x + 26, y);
          context.fillStyle = '#a2ad99';
          context.font = '400 10px "JetBrains Mono", monospace';
          context.fillText(`$${asset.price.toFixed(2)}`, x + 74, y);
          context.fillStyle = asset.change < 0 ? '#ed8581' : '#b9f477';
          context.fillText(`${asset.change > 0 ? '+' : ''}${asset.change.toFixed(2)}%`, x + 139, y);
          context.fillStyle = '#414c38';
          context.fillRect(x + itemWidth - 14, y - 4, 1, 8);
        });
      }
      canvas.dataset.offset = offset.current.toFixed(2);
      canvas.dataset.renderReady = 'true';
    };
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = host.clientWidth;
      height = host.clientHeight;
      itemWidth = window.innerWidth <= 760 ? 200 : 218;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const animate = timestamp => {
      const elapsed = previous ? Math.min(timestamp - previous, 80) : 0;
      previous = timestamp;
      if (!paused && !document.hidden) offset.current = (offset.current + elapsed * .035) % (assets.length * itemWidth);
      paint();
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [assets, paused]);

  return <div className="ticker-band" data-testid="rwa-watchlist">
    <div className="ticker-inner">
      <span className="ticker-label" data-testid="ticker-label"><span className="tiny-dot"/>RWA WATCHLIST</span>
      <Link to="/assets" className="ticker-viewport" data-testid="watchlist-assets-link" aria-label={`Open RWA pool. ${assets.map(a => `${a.symbol} $${a.price.toFixed(2)}, ${a.change > 0 ? '+' : ''}${a.change}%`).join('; ')}`}>
        <canvas ref={canvasRef} className="ticker-canvas" data-testid="watchlist-canvas" data-animation-state={paused ? 'paused' : 'running'} aria-hidden="true"/>
        <span className="sr-only" data-testid="watchlist-accessible-quotes">{assets.map(a => `${a.symbol} $${a.price.toFixed(2)} ${a.change > 0 ? '+' : ''}${a.change}%`).join(' · ')}</span>
      </Link>
      <button type="button" className="ticker-playback" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Resume watchlist' : 'Pause watchlist'} title={paused ? 'Resume watchlist' : 'Pause watchlist'} aria-pressed={paused} data-testid="watchlist-playback-button">{paused ? <Play size={12}/> : <Pause size={12}/>}</button>
    </div>
  </div>;
};