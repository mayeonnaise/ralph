import React from "react";
import LoadingPageStyles from "./LoadingPage.module.css";

function LoadingPage() {
  return (
    <div className={LoadingPageStyles.loading}>
      <span className={LoadingPageStyles.loadingTitle}>ANKU</span>
      <span className={LoadingPageStyles.loadingSubtitle}>Anthology Haiku</span>
      <span className={LoadingPageStyles.findingPeers}>Finding peers...</span>
    </div>
  );
}

export default LoadingPage;
