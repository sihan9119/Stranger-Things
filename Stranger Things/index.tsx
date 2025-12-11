import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  // StrictMode can sometimes cause double-initialization issues with complex 3D/Webcam logic in dev mode,
  // but we are handling refs carefully in useEffects to mitigate this.
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
