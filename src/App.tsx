import { createBrowserRouter, RouterProvider } from "react-router";
import { SessionProvider } from "./lib/session";
import Calendar from "./pages/Calendar";
import Home from "./pages/Home";
import Join from "./pages/Join";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Messages from "./pages/Messages";
import Preview from "./pages/Preview";
import Welcome from "./pages/Welcome";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/apercu", element: <Preview /> },
  { path: "/connexion", element: <Login /> },
  { path: "/bienvenue", element: <Welcome /> },
  { path: "/rejoindre/:token", element: <Join /> },
  { path: "/app", element: <Home /> },
  { path: "/app/calendrier", element: <Calendar /> },
  { path: "/app/messages", element: <Messages /> },
]);

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}
