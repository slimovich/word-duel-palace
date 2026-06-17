import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/topbar.css";
import "./styles/home.css";
import "./styles/lobby.css";
import "./styles/tile.css";
import "./styles/arena.css";

createRoot(document.getElementById("root")).render(<App />);
