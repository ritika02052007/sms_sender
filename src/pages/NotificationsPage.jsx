import { useState } from 'react';
import { getNotifications, retryNotification } from '../api/mockApi.js';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TableWrap from '../components/TableWrap.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { useApi } from '../hooks/useApi.js';
import { trackAction } from '../utils/analytics.js';
import { getErrorMessage } from '../utils/errors.js';
import { formatDateTime } from '../utils/format.js';
import './NotificationsPage.css';

export default function NotificationsPage() {
  const { addToast } = useToast();
  const { data, loading, error, execute } = useApi(getNotifications);
  const [pending, setPending] = useState(null);

  async function handleRetry(notification) {
    setPending(notification.id);
    try {
      await retryNotification(notification.id);
      trackAction('retry sms');
      addToast(`SMS to ${notification.memberName} was re-sent.`, 'success');
    } catch (failure) {
      addToast(getErrorMessage(failure), 'error');
    } finally {
      setPending(null);
    }
    await execute();
  }

  return (
    <>
      <PageHeader title="Notifications" description="Every SMS the waitlist job has attempted, newest first." />
      {error && (
        <ErrorBanner
          message="We could not load notifications. Check your connection and try again."
          onRetry={() => execute()}
          retrying={loading}
        />
      )}
      {!data && loading && <LoadingState label="Loading notifications" />}
      {data && data.length === 0 && <EmptyState message="No SMS notifications have been sent yet." />}
      {data && data.length > 0 && (
        <TableWrap label="SMS notification log">
          <table className="table">
            <caption className="sr-only">SMS notification log</caption>
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Message</th>
                <th scope="col">Status</th>
                <th scope="col">Attempts</th>
                <th scope="col">Last attempt</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((notification) => (
                <tr key={notification.id}>
                  <td className="table__strong">{notification.memberName}</td>
                  <td className="notification__body">{notification.body}</td>
                  <td>
                    <StatusBadge status={notification.status} />
                    {notification.errorMessage && <p className="notification__error">{notification.errorMessage}</p>}
                  </td>
                  <td>{notification.attempts}</td>
                  <td>{formatDateTime(notification.sentAt)}</td>
                  <td>
                    {notification.canRetry && (
                      <Button
                        aria-label={`Retry SMS to ${notification.memberName}`}
                        loading={pending === notification.id}
                        disabled={pending !== null}
                        onClick={() => handleRetry(notification)}
                      >
                        Retry
                      </Button>
                    )}
                    {notification.status === 'failed' && !notification.canRetry && (
                      <span className="table__muted">No retry available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}
