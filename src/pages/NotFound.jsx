import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState
        title="No data found"
        message="The page you are looking for does not exist or has moved."
        action={<Link className="btn btn--primary" to="/dashboard">Back to dashboard</Link>}
      />
    </>
  );
}
