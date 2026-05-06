// Renders an empty marker div that the nav-transition overlay polls for.
// Page components should mount this while their primary data is loading;
// once data is ready and the placeholder unmounts, the overlay dismisses.
export function PageLoadingPlaceholder() {
  return <div className="page-loading-placeholder" aria-hidden="true" />;
}
