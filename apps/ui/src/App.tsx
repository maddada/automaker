import { RouterProvider } from "@tanstack/react-router";
import { router } from "./utils/router";
import "./styles/global.css";

export default function App() {
  return <RouterProvider router={router} />;
}
