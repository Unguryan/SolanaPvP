import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { WalletContextProvider } from "@/components/wallet/WalletProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import { Home } from "@/pages/Home";
import { ROUTES } from "@/constants/routes";

// Import pages directly to avoid lazy loading issues
import { Matches } from "@/pages/Matches";
import { Game } from "@/pages/Game";
import { Leaderboard } from "@/pages/Leaderboard";
import { Profile } from "@/pages/Profile";
import { NotFound } from "@/pages/NotFound";
import { GameDemo } from "@/pages/GameDemo";
import { CreateLobby } from "@/pages/CreateLobby";
import { MatchPreview } from "@/pages/MatchPreview";
import ForceRefund from "@/pages/ForceRefund";
import { MockLoader1 } from "@/pages/MockLoader1";
import { MockLoader5 } from "@/pages/MockLoader5";

function App() {
  return (
    <WalletContextProvider>
      <Router>
        <ScrollToTop />
        <Layout>
          <Routes>
            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path={ROUTES.MATCHES} element={<Matches />} />
            <Route path={ROUTES.CREATE_LOBBY} element={<CreateLobby />} />
            <Route path={ROUTES.MATCH_PREVIEW} element={<MatchPreview />} />
            <Route path={ROUTES.GAME} element={<Game />} />

            {/* 🧪 Temporary admin endpoint - will be removed */}
            <Route path="/f/:lobbyPda" element={<ForceRefund />} />

            <Route path="/demo" element={<GameDemo />} />
            <Route path="/mockLoader1" element={<MockLoader1 />} />
            <Route path="/mockLoader5" element={<MockLoader5 />} />
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
