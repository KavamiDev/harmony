import { createBrowserRouter, RouterProvider } from "react-router";
import { SessionProvider } from "./lib/session";
import Home from "./pages/Home";
import Join from "./pages/Join";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Preview from "./pages/Preview";
import Welcome from "./pages/Welcome";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/apercu", element: <Preview /> },
  { path: "/connexion", element: <Login /> },
  { path: "/bienvenue", element: <Welcome /> },
  { path: "/rejoindre/:token", element: <Join /> },
  { path: "/app", element: <Home /> },
]);

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}
