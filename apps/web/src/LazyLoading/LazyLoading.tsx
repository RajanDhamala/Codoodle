
import { lazy } from "react";

export const LazyGamePage = lazy(() => import("../Pages/GamePage.tsx"));

export const LazyTestPage = lazy(() => import("../Pages/Testpage.tsx"));

export const LazyLobbyPage = lazy(() => import("../Pages/LobbyPage.tsx"));
