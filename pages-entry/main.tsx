import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HospitalApp } from "@/components/HospitalApp";
import "@/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("root missing");

createRoot(root).render(
  <StrictMode>
    <HospitalApp />
  </StrictMode>,
);
