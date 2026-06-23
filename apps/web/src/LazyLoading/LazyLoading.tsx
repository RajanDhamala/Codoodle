
import { lazy } from "react";

export const LazyLandingPage = lazy(() => import("../Pages/LandingPage.tsx"));
export const LazyGamePage = lazy(() => import("../Pages/GamePage.tsx"));
export const LazyLoginPage = lazy(() => import("../Auth/LoginPage.tsx"));
export const LazyOAuthCallbackPage = lazy(() => import("../Auth/OAuthCallback.tsx"));
export const LazyRegisterPage = lazy(() => import("../Auth/Registerpage.tsx"));
export const LazyTestPage = lazy(() => import("../Pages/Testpage.tsx"));
