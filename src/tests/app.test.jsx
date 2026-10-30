import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { configureMockApi, retryNotification } from '../api/mockApi.js';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import { configureTwilioMock } from '../services/twilioMock.js';
import { analytics, expectNoA11yViolations, renderApp } from './utils.jsx';

const silenceLog = () => vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Dashboard', () => {
  it('shows a loading indicator, then metrics computed from data', async () => {
    renderApp('/dashboard');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByText('Active waitlists')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Failed SMS').closest('.stat-card')).toHaveTextContent('1');
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
  });

  it('shows an error banner with Retry when the request fails, then recovers', async () => {
    configureMockApi({ failureRate: 1 });
    const user = userEvent.setup();
    renderApp('/dashboard');
    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(/could not load/i);
    configureMockApi({ failureRate: 0 });
    await user.click(within(banner).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Upcoming sessions')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderApp('/dashboard');
    await screen.findByText('Active waitlists');
    await expectNoA11yViolations(container);
  });
});

describe('Session waitlist', () => {
  it('lists entries in order with masked phone numbers', async () => {
    renderApp('/sessions/session-1/waitlist');
    const row = await screen.findByRole('row', { name: /Priya Nair/ });
    expect(within(row).getByText('1')).toBeInTheDocument();
    expect(row).not.toHaveTextContent('9000');
    expect(within(row).getByText('Waiting')).toBeInTheDocument();
  });

  it('shows a friendly "No data found" state for an empty list', async () => {
    renderApp('/sessions/session-6/waitlist');
    expect(await screen.findByText('No data found')).toBeInTheDocument();
    expect(screen.getByText(/No one is on the waitlist/)).toBeInTheDocument();
  });

  it('shows "No data found" when a search matches nothing, and can clear it', async () => {
    const user = userEvent.setup();
    renderApp('/sessions/session-1/waitlist');
    await screen.findByRole('row', { name: /Priya Nair/ });
    await user.type(screen.getByLabelText('Search'), 'zzzz');
    expect(screen.getByText('No data found')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('row', { name: /Priya Nair/ })).toBeInTheDocument();
  });

  it('shows a loading indicator and an error banner on a failed load', async () => {
    configureMockApi({ failureRate: 1 });
    renderApp('/sessions/session-1/waitlist');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load this waitlist/i);
  });

  it('notify next: shows busy state, sends the SMS and logs analytics', async () => {
    const log = silenceLog();
    configureMockApi({ latencyMin: 150, latencyMax: 150 });
    const user = userEvent.setup();
    renderApp('/sessions/session-1/waitlist');
    const button = await screen.findByRole('button', { name: 'Notify next' });
    await user.click(button);
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByText('Notification sent to Priya Nair.')).toBeInTheDocument();
    expect(log).toHaveBeenCalledWith(analytics('notify next'));
    await waitFor(() => expect(within(screen.getByRole('row', { name: /Priya Nair/ })).getByText('Notified')).toBeInTheDocument());
  });

  it('notify next reports an error toast when nobody is waiting', async () => {
    const user = userEvent.setup();
    renderApp('/sessions/session-6/waitlist');
    await user.click(await screen.findByRole('button', { name: 'Notify next' }));
    expect(await screen.findByText('No members are waiting for this session.')).toBeInTheDocument();
  });

  it('notify single logs analytics', async () => {
    const log = silenceLog();
    const user = userEvent.setup();
    renderApp('/sessions/session-1/waitlist');
    await user.click(await screen.findByRole('button', { name: 'Notify Rohan Mehta' }));
    expect(await screen.findByText('Notification sent to Rohan Mehta.')).toBeInTheDocument();
    expect(log).toHaveBeenCalledWith(analytics('notify single'));
  });

  it('a failed SMS shows an error toast and does not log analytics', async () => {
    const log = silenceLog();
    configureTwilioMock({ failureRate: 1 });
    const user = userEvent.setup();
    renderApp('/sessions/session-1/waitlist');
    await user.click(await screen.findByRole('button', { name: 'Notify Rohan Mehta' }));
    expect(await screen.findByText(/SMS to Rohan Mehta failed/)).toBeInTheDocument();
    expect(log).not.toHaveBeenCalled();
  });

  it('cancel entry logs analytics and updates the row', async () => {
    const log = silenceLog();
    const user = userEvent.setup();
    renderApp('/sessions/session-1/waitlist');
    await user.click(await screen.findByRole('button', { name: 'Cancel Rohan Mehta' }));
    expect(log).toHaveBeenCalledWith(analytics('cancel entry'));
    await waitFor(() => expect(within(screen.getByRole('row', { name: /Rohan Mehta/ })).getByText('Cancelled')).toBeInTheDocument());
  });

  it('confirm entry updates a notified member', async () => {
    const user = userEvent.setup();
    renderApp('/sessions/session-1/waitlist');
    await user.click(await screen.findByRole('button', { name: 'Confirm Aarav Sharma' }));
    await waitFor(() => expect(within(screen.getByRole('row', { name: /Aarav Sharma/ })).getByText('Confirmed')).toBeInTheDocument());
  });
});

describe('Add to waitlist modal', () => {
  async function openModal(user) {
    renderApp('/sessions/session-1/waitlist');
    await user.click(await screen.findByRole('button', { name: 'Add to waitlist' }));
    return screen.getByRole('dialog', { name: 'Add to waitlist' });
  }

  it('blocks invalid submissions and highlights fields in red', async () => {
    const user = userEvent.setup();
    const dialog = await openModal(user);
    const before = JSON.parse(localStorage.getItem('waitlist')).length;
    await user.click(within(dialog).getByRole('button', { name: 'Join waitlist' }));

    for (const label of ['Full name', 'Phone number', 'Email']) {
      const input = within(dialog).getByLabelText(label);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveClass('input--error');
    }
    expect(within(dialog).getByText('Name is required.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('waitlist'))).toHaveLength(before);
    expect(within(dialog).getByLabelText('Full name')).toHaveFocus();
  });

  it('flags only the malformed fields', async () => {
    const user = userEvent.setup();
    const dialog = await openModal(user);
    fireEvent.change(within(dialog).getByLabelText('Full name'), { target: { value: 'Test User' } });
    fireEvent.change(within(dialog).getByLabelText('Phone number'), { target: { value: '123' } });
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'bad' } });
    await user.click(within(dialog).getByRole('button', { name: 'Join waitlist' }));
    expect(within(dialog).getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'false');
    expect(within(dialog).getByLabelText('Phone number')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sanitizes XSS payloads before they reach state', async () => {
    const user = userEvent.setup();
    const dialog = await openModal(user);
    const name = within(dialog).getByLabelText('Full name');
    fireEvent.change(name, { target: { value: '<script>alert(1)</script>Meera' } });
    expect(name).toHaveValue('Meera');
    fireEvent.change(name, { target: { value: '<img src=x onerror=alert(1)>Asha' } });
    expect(name).toHaveValue('Asha');
  });

  it('submits valid data, logs analytics and shows the new member', async () => {
    const log = silenceLog();
    const user = userEvent.setup();
    const dialog = await openModal(user);
    fireEvent.change(within(dialog).getByLabelText('Full name'), { target: { value: 'Test Member' } });
    fireEvent.change(within(dialog).getByLabelText('Phone number'), { target: { value: '+91 98765 43210' } });
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'test.member@example.com' } });
    await user.click(within(dialog).getByRole('button', { name: 'Join waitlist' }));

    expect(await screen.findByText('Test Member was added to the waitlist.')).toBeInTheDocument();
    expect(log).toHaveBeenCalledWith(analytics('join waitlist'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('row', { name: /Test Member/ })).toBeInTheDocument();
  });

  it('shows a field error for a duplicate member', async () => {
    const user = userEvent.setup();
    const dialog = await openModal(user);
    fireEvent.change(within(dialog).getByLabelText('Full name'), { target: { value: 'Priya Nair' } });
    fireEvent.change(within(dialog).getByLabelText('Phone number'), { target: { value: '+919876543210' } });
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'priya.nair@example.com' } });
    await user.click(within(dialog).getByRole('button', { name: 'Join waitlist' }));
    expect(await within(dialog).findByText(/already on the waitlist/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await openModal(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to waitlist' })).toHaveFocus();
  });

  it('traps keyboard focus inside the dialog', async () => {
    const user = userEvent.setup();
    const dialog = await openModal(user);
    within(dialog).getByRole('button', { name: 'Join waitlist' }).focus();
    await user.tab();
    expect(within(dialog).getByRole('button', { name: 'Close dialog' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(within(dialog).getByRole('button', { name: 'Join waitlist' })).toHaveFocus();
  });

  it('has no accessibility violations on the page, with the modal open and with errors shown', async () => {
    const user = userEvent.setup();
    const { container } = renderApp('/sessions/session-1/waitlist');
    await screen.findByRole('row', { name: /Priya Nair/ });
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole('button', { name: 'Add to waitlist' }));
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole('button', { name: 'Join waitlist' }));
    await expectNoA11yViolations(container);
  });
});

describe('Notifications page', () => {
  it('lists the SMS log and retries a failed message', async () => {
    const log = silenceLog();
    const user = userEvent.setup();
    renderApp('/notifications');
    expect(await screen.findByText('Mock Twilio failure')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry SMS to Vikram Singh' }));
    expect(await screen.findByText('SMS to Vikram Singh was re-sent.')).toBeInTheDocument();
    expect(log).toHaveBeenCalledWith(analytics('retry sms'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Retry SMS to Vikram Singh' })).not.toBeInTheDocument());
  });

  it('shows an error toast when a retry fails again', async () => {
    const log = silenceLog();
    configureTwilioMock({ failureRate: 1 });
    const user = userEvent.setup();
    renderApp('/notifications');
    await user.click(await screen.findByRole('button', { name: 'Retry SMS to Vikram Singh' }));
    expect(await screen.findByText(/SMS to Vikram Singh failed \(attempt 2\)/)).toBeInTheDocument();
    expect(log).not.toHaveBeenCalled();
  });

  it('hides Retry once the maximum number of attempts is reached', async () => {
    configureTwilioMock({ failureRate: 1 });
    await retryNotification('notif-seed-2').catch(() => {});
    await retryNotification('notif-seed-2').catch(() => {});
    renderApp('/notifications');
    expect(await screen.findByText('No retry available')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retry SMS/ })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderApp('/notifications');
    await screen.findByText('Mock Twilio failure');
    await expectNoA11yViolations(container);
  });
});

describe('Settings page', () => {
  it('blocks invalid values and highlights the fields', async () => {
    const user = userEvent.setup();
    renderApp('/settings');
    const windowInput = await screen.findByLabelText('Confirmation window (minutes)');
    fireEvent.change(windowInput, { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Max SMS attempts'), { target: { value: 'abc' } });
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(windowInput).toHaveAttribute('aria-invalid', 'true');
    expect(windowInput).toHaveClass('input--error');
    expect(screen.getByLabelText('Max SMS attempts')).toHaveAttribute('aria-invalid', 'true');
    expect(JSON.parse(localStorage.getItem('settings')).confirmationWindowMinutes).toBe(15);
  });

  it('saves valid values and logs analytics', async () => {
    const log = silenceLog();
    const user = userEvent.setup();
    renderApp('/settings');
    fireEvent.change(await screen.findByLabelText('Confirmation window (minutes)'), { target: { value: '30' } });
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Settings saved.')).toBeInTheDocument();
    expect(log).toHaveBeenCalledWith(analytics('save settings'));
    expect(JSON.parse(localStorage.getItem('settings')).confirmationWindowMinutes).toBe(30);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderApp('/settings');
    await screen.findByLabelText('Max SMS attempts');
    await expectNoA11yViolations(container);
  });
});

describe('App shell', () => {
  it('renders a 404 page for unknown routes with no accessibility violations', async () => {
    const { container } = renderApp('/does-not-exist');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('marks the current page in the sidebar and offers a skip link', async () => {
    renderApp('/notifications');
    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
    await screen.findByText('Mock Twilio failure');
  });

  it('shows an offline banner when the connection drops and hides it when it returns', async () => {
    renderApp('/dashboard');
    await screen.findByText('Active waitlists');
    expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(await screen.findByText(/You are offline/)).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument();
  });

  it('contains render errors with the error boundary', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Boom() {
      throw new Error('boom');
    }
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
  });
});
