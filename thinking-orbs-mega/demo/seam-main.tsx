import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SeamDemo } from './SeamDemo';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SeamDemo />
  </StrictMode>
);
