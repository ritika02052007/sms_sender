import { Component } from 'react';
import Button from './Button.jsx';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="banner banner--error" role="alert">
        <p>Something went wrong while displaying this page.</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    );
  }
}
