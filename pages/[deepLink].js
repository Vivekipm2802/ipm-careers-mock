// ============================================================
// Friendly deep links (Sep 2026) — study.ipmcareer.com/pyqs and
// friends. The portal is a single-page app keyed by an internal
// slug; this catch-all maps human URLs onto /?p=<slug> and lets
// unknown paths 404 normally. Concrete routes (login, mock, test,
// kyc…) always win over this dynamic route, so nothing existing
// changes behaviour.
// ============================================================

const MAP = {
  // student sections
  pyqs: "pyqconcept",
  mocks: "mocks",
  sectionals: "sectional-tests",
  classes: "user",
  videos: "prv",
  recordings: "lvr",
  vault: "mistakevault",
  review: "reviewhub",
  performance: "performance",
  doubts: "dbts",
  dsb: "dsbchallenge",
  plan: "studyplan",
  dashboard: "dashboard",
  ebooks: "pdfs",
  connect: "connect",
};

export async function getServerSideProps(context) {
  const raw = String(context.params?.deepLink || "").toLowerCase();
  const slug = MAP[raw];
  if (!slug) return { notFound: true };
  return {
    redirect: { destination: "/?p=" + encodeURIComponent(slug), permanent: false },
  };
}

export default function DeepLink() {
  return null;
}
