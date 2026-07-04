
import { lazy } from "react";


export const LazyTestPage = lazy(() => import("../Pages/Testpage.tsx"));

export const LazyLobbyPage = lazy(() => import("../Pages/LobbyPage.tsx"));

export const GameRoomPage = lazy(() => import("../Pages/GameRoomPage.tsx"));
