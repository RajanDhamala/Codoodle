
import { lazy } from "react";

export const LazyLobbyPage = lazy(() => import("../Pages/LobbyPage.tsx"));

export const LazyNewPage = lazy(() => import("../Pages/NewLanding.tsx"));
export const GameRoomPage = lazy(() => import("../Pages/GameRoomPage.tsx"));
export const LazyPageNotFound = lazy(() => import("../Pages/NotFound404Page.tsx"))
