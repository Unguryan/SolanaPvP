import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { WalletContextProvider } from "@/components/wallet/WalletProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Home } from "@/pages/Home";
import { ROUTES } from "@/constants/routes";

// Import pages directly to avoid lazy loading issues
import { Matches } from "@/pages/Matches";
import { Game } from "@/pages/Game";
import { Leaderboard } from "@/pages/Leaderboard";
import { Profile } from "@/pages/Profile";
import { NotFound } from "@/pages/NotFound";
import { GameDemo } from "@/pages/GameDemo";

function App() {
  return (
    <WalletContextProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path={ROUTES.MATCHES} element={<Matches />} />
            <Route path={ROUTES.GAME} element={<Game />} />
            <Route path="/demo" element={<GameDemo />} />
            <Route path={ROUTES.LEADERBOARD} element={<Leaderboard />} />
            <Route
              path={ROUTES.PROFILE}
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.PROFILE_USER}
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </Router>
    </WalletContextProvider>
  );
}

export default App;
