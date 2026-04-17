import { useEffect, useRef, useState } from 'react';
import DinoGame from './DinoGame';
import './App.css';

function App() {
  return (
    <div className="app">
      <h1>Chrome Bikšu spēle</h1>
      <DinoGame />
      <p className="hint">
        Spied <kbd>Space</kbd> vai <kbd>↑</kbd>, lai lēktu. <kbd>↓</kbd>, lai pieliektos. Spied <kbd>Space</kbd>, lai sāktu no jauna.
      </p>
    </div>
  );
}

export default App;
