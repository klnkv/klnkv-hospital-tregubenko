import { createFileRoute } from "@tanstack/react-router";
import { HospitalApp } from "@/components/HospitalApp";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  return <HospitalApp />;
}
