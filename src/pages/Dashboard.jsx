import { Link } from 'react-router-dom';
import { getDashboard } from '../api/mockApi.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import TableWrap from '../components/TableWrap.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatDateTime } from '../utils/format.js';
import './Dashboard.css';

export default function Dashboard() {
  const { data, loading, error, execute } = useApi(getDashboard);
  const stats = data?.stats;
  const cards = stats && [
    ['Active waitlists', stats.activeWaitlists],
    ['SMS sent today', stats.smsSentToday],
    ['Failed SMS', stats.failedSms],
    ['Avg. wait time', `${stats.avgWaitMinutes} min`],
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Live overview of class waitlists and SMS notifications." />
      {error && (
        <ErrorBanner
          message="We could not load the dashboard. Check your connection and try again."
          onRetry={() => execute()}
          retrying={loading}
        />
      )}
      {!data && loading && <LoadingState label="Loading dashboard" />}
      {data && (
        <>
          <section aria-label="Key metrics" className="stats-grid">
            {cards.map(([label, value]) => (
              <div className="card stat-card" key={label}>
                <p className="stat-card__label">{label}</p>
                <p className="stat-card__value">{value}</p>
              </div>
            ))}
          </section>
          <section>
            <h2 className="section-title">Upcoming sessions</h2>
            {data.sessions.length === 0 ? (
              <EmptyState message="There are no upcoming sessions to show." />
            ) : (
              <TableWrap label="Upcoming sessions">
                <table className="table">
                  <caption className="sr-only">Upcoming sessions with seat and waitlist counts</caption>
                  <thead>
                    <tr>
                      <th scope="col">Class</th>
                      <th scope="col">Starts</th>
                      <th scope="col">Seats</th>
                      <th scope="col">Waiting</th>
                      <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sessions.map((session) => (
                      <tr key={session.id}>
                        <td className="table__strong">{session.className}</td>
                        <td>{formatDateTime(session.startTime)}</td>
                        <td>{session.seatsTaken} / {session.totalSeats}</td>
                        <td>{session.waitingCount}</td>
                        <td>
                          <Link className="btn btn--secondary" to={`/sessions/${session.id}/waitlist`} aria-label={`View waitlist for ${session.className}`}>
                            View waitlist
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </section>
        </>
      )}
    </>
  );
}
