import { createFileRoute } from "@tanstack/react-router";
import { HospitalApp } from "@/components/HospitalApp";

export const Route = createFileRoute("/")({
  ssr: true,
  component: Home,
});

function Home() {
  return <HospitalApp />;
}
