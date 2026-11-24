import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./layout.css";
import "./plan.css";
import "./proof.css";
import "./theme.css";
import "./responsive.css"; // keep last: breakpoints override the rules above

createRoot(document.getElementById("root")).render(<App />);
