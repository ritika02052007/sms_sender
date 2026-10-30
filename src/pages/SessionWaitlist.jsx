import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addWaitlistEntry, deleteWaitlistEntry, getSessions, getWaitlist,
  notifyEntry, notifyNext, updateWaitlistEntry,
} from '../api/mockApi.js';
import AddToWaitlistModal from '../components/AddToWaitlistModal.jsx';
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
import { maskPhone } from '../utils/maskPhone.js';
import { sanitizeText } from '../utils/sanitize.js';
import './SessionWaitlist.css';

const STATUS_FILTERS = ['all', 'waiting', 'notified', 'confirmed', 'expired', 'cancelled'];

function SessionWaitlistView({ sessionId }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data, loading, error, execute } = useApi(() => Promise.all([getSessions(), getWaitlist(sessionId)]));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState(null);

  const closeModal = useCallback(() => setModalOpen(false), []);
  const [sessions, entries] = data ?? [[], []];
  const session = sessions.find((item) => item.id === sessionId);
  const query = search.trim().toLowerCase();
  const visible = entries.filter(
    (entry) =>
      (statusFilter === 'all' || entry.status === statusFilter) &&
      (!query || [entry.name, entry.email, entry.phone].some((field) => field.toLowerCase().includes(query))),
  );

  async function runAction(key, task, { action, success }) {
    setPending(key);
    try {
      const result = await task();
      trackAction(action);
      addToast(success(result), 'success');
    } catch (failure) {
      addToast(getErrorMessage(failure), 'error');
    } finally {
      setPending(null);
    }
    await execute();
  }

  async function handleAdd(values) {
    await addWaitlistEntry(sessionId, values);
    trackAction('join waitlist');
    addToast(`${values.name} was added to the waitlist.`, 'success');
    setModalOpen(false);
    await execute();
  }

  const busy = pending !== null;
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  return (
    <>
      <PageHeader
        title="Session waitlist"
        description={session ? `${session.className} · ${formatDateTime(session.startTime)} · ${session.seatsTaken}/${session.totalSeats} seats taken` : undefined}
      />
      {error && (
        <ErrorBanner
          message="We could not load this waitlist. Check your connection and try again."
          onRetry={() => execute()}
          retrying={loading}
        />
      )}
      {!data && loading && <LoadingState label="Loading waitlist" />}
      {data && !session && (
        <EmptyState title="Session not found" message="This session does not exist or was removed." />
      )}
      {data && session && (
        <>
          <div className="toolbar">
            <div className="field">
              <label className="field__label" htmlFor="session-select">Session</label>
              <select id="session-select" className="input" value={sessionId} onChange={(event) => navigate(`/sessions/${event.target.value}/waitlist`)}>
                {sessions.map((item) => <option key={item.id} value={item.id}>{item.className}</option>)}
              </select>
            </div>
            <div className="field field--grow">
              <label className="field__label" htmlFor="waitlist-search">Search</label>
              <input id="waitlist-search" type="search" className="input" placeholder="Name, email or phone" value={search} onChange={(event) => setSearch(sanitizeText(event.target.value))} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="status-filter">Status</label>
              <select id="status-filter" className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {STATUS_FILTERS.map((status) => (
                  <option key={status} value={status}>{status === 'all' ? 'All statuses' : status.charAt(0).toUpperCase() + status.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="toolbar__spacer" />
            <Button variant="secondary" disabled={busy} onClick={() => setModalOpen(true)}>Add to waitlist</Button>
            <Button
              variant="primary"
              loading={pending === 'next'}
              disabled={busy}
              onClick={() => runAction('next', () => notifyNext(sessionId), { action: 'notify next', success: (r) => `Notification sent to ${r.memberName}.` })}
            >
              Notify next
            </Button>
          </div>

          {entries.length === 0 ? (
            <EmptyState message="No one is on the waitlist for this session yet. Add a member to get started." />
          ) : visible.length === 0 ? (
            <EmptyState
              message="No members match your search or filter."
              action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
            />
          ) : (
            <>
              <TableWrap label="Waitlist entries">
                <table className="table">
                  <caption className="sr-only">Waitlist for {session.className}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Position</th>
                      <th scope="col">Member</th>
                      <th scope="col">Phone</th>
                      <th scope="col">Status</th>
                      <th scope="col">Joined</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((entry) => (
                      <tr key={entry.id}>
                        <td className="waitlist__position">{entry.position ?? '—'}</td>
                        <td>
                          <div className="table__strong">{entry.name}</div>
                          <div className="table__muted">{entry.email}</div>
                        </td>
                        <td>{maskPhone(entry.phone)}</td>
                        <td><StatusBadge status={entry.status} /></td>
                        <td>{formatDateTime(entry.joinedAt)}</td>
                        <td>
                          <div className="row-actions">
                            {entry.status === 'waiting' && (
                              <Button
                                aria-label={`Notify ${entry.name}`}
                                loading={pending === `notify-${entry.id}`}
                                disabled={busy}
                                onClick={() => runAction(`notify-${entry.id}`, () => notifyEntry(entry.id), { action: 'notify single', success: (r) => `Notification sent to ${r.memberName}.` })}
                              >
                                Notify
                              </Button>
                            )}
                            {entry.status === 'notified' && (
                              <Button
                                aria-label={`Confirm ${entry.name}`}
                                loading={pending === `confirm-${entry.id}`}
                                disabled={busy}
                                onClick={() => runAction(`confirm-${entry.id}`, () => updateWaitlistEntry(entry.id, { status: 'confirmed' }), { action: 'confirm entry', success: () => `${entry.name} confirmed.` })}
                              >
                                Confirm
                              </Button>
                            )}
                            {(entry.status === 'waiting' || entry.status === 'notified') && (
                              <Button
                                variant="ghost"
                                aria-label={`Cancel ${entry.name}`}
                                loading={pending === `cancel-${entry.id}`}
                                disabled={busy}
                                onClick={() => runAction(`cancel-${entry.id}`, () => deleteWaitlistEntry(entry.id), { action: 'cancel entry', success: () => `${entry.name} was removed from the waitlist.` })}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
              <p className="waitlist__count">Showing {visible.length} of {entries.length} entries</p>
            </>
          )}
        </>
      )}
      {modalOpen && session && (
        <AddToWaitlistModal sessionName={session.className} onClose={closeModal} onSubmit={handleAdd} />
      )}
    </>
  );
}

export default function SessionWaitlist() {
  const { id } = useParams();
  return <SessionWaitlistView key={id} sessionId={id} />;
}
