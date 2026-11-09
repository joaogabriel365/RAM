import { MotionConfig } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PanelLayout } from "./components/layout/PanelLayout";
import { ToastProvider } from "./components/ui/Toast";
import { AuthProvider } from "./lib/auth";
import { AchadosPage } from "./pages/AchadosPage";
import { FacePage } from "./pages/FacePage";
import { GamesPage } from "./pages/GamesPage";
import { RostoPage } from "./pages/RostoPage";

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/face" element={<FacePage />} />
              <Route element={<PanelLayout />}>
                <Route index element={<RostoPage />} />
                <Route path="jogos" element={<GamesPage />} />
                <Route path="achados" element={<AchadosPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
