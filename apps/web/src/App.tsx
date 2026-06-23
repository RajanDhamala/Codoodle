
import { Suspense } from "react";
import "./index.css";
import {LazyLandingPage,LazyRegisterPage,LazyLoginPage,LazyOAuthCallbackPage,LazyTestPage,LazyGamePage,} from "./LazyLoading/LazyLoading";
import {BrowserRouter as Router,Routes,Route,} from "react-router-dom";
import {QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./Utils/QueryConfig.tsx";
import Loader from "./LazyLoading/Loader.tsx";
import { Toaster } from "react-hot-toast";

const backendBaseUrl = (
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000`
).replace(/\/$/, "");

function App() {


   return (
    <QueryClientProvider client={ queryClient}>
   <Toaster position="top-right" reverseOrder={false} />
      <Router>
       <Suspense fallback={<Loader />}>
       <Routes>
            <Route path="/" element={<LazyLandingPage />} />
            <Route path="/login" element={<LazyLoginPage />} />
            <Route
              path="/oauth/callback"
              element={
                <LazyOAuthCallbackPage
                  backendUrl={`${backendBaseUrl}/oauth/callback`}
                  successRedirect="/"
                  errorRedirect="/login"
                />
              }
            />
            <Route path="/register" element={<LazyRegisterPage />} />
            <Route path="/game" element={<LazyGamePage />} />
            <Route path="/test" element={<LazyTestPage />} />

            <Route path="*" element={<div className="p-10 text-center text-red-500 font-bold">404 | Page Not Found</div>} />
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
