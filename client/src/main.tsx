import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Socket connection is deferred until the user submits their nickname (App.tsx).
// React.StrictMode intentionally omitted to prevent double Phaser instantiation.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
