import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Home } from "@/pages/Home";
import { ROUTES } from "@/constants/routes";

// Lazy load other pages for better performance
const Matches = React.lazy(() =>
  import("@/pages/Matches").then((module) => ({ default: module.Matches }))
);
const Game = React.lazy(() =>
  import("@/pages/Game").then((module) => ({ default: module.Game }))
);
const Leaderboard = React.lazy(() =>
  import("@/pages/Leaderboard").then((module) => ({
    default: module.Leaderboard,
  }))
);
const Profile = React.lazy(() =>
  import("@/pages/Profile").then((module) => ({ default: module.Profile }))
);
const NotFound = React.lazy(() =>
  import("@/pages/NotFound").then((module) => ({ default: module.NotFound }))
);

function App() {
  return (
    <Router>
      <Layout>
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
          }
        >
          <Routes>
            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path={ROUTES.MATCHES} element={<Matches />} />
            <Route path={ROUTES.GAME} element={<Game />} />
            <Route path={ROUTES.LEADERBOARD} element={<Leaderboard />} />
            <Route path={ROUTES.PROFILE} element={<Profile />} />
            <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </React.Suspense>
      </Layout>
    </Router>
  );
}

export default App;
