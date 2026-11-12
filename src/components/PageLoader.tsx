export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
