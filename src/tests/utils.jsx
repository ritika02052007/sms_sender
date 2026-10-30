import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { expect } from 'vitest';
import App from '../App.jsx';

export function renderApp(route = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

export async function expectNoA11yViolations(container) {
  expect(await axe(container)).toHaveNoViolations();
}

// Exact string required by the TRD (kept literal on purpose).
export const analytics = (action) =>
  `[Analytics] User interacted with Class Waitlist SMS Notification Job (Twilio Mock): ${action}`;
