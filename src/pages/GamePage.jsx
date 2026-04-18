import DinoGame from '../DinoGame';

export default function GamePage() {
  return (
    <div className="app page-game">
      <h1>Briesmīgais pingvīns</h1>
      <DinoGame />
      <p className="hint">
        Spied <kbd>Space</kbd> vai <kbd>↑</kbd>, lai lēktu. <kbd>↓</kbd>, lai
        pieliektos. Spied <kbd>Space</kbd>, lai sāktu no jauna.
      </p>
    </div>
  );
}
