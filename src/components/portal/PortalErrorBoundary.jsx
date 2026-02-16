import { Component } from "react";
import { Button } from "../ui/button";

export class PortalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-error/30 bg-error-bg p-6 text-center">
          <h2 className="text-lg font-semibold text-error">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="mt-4"
          >
            Refresh Page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
