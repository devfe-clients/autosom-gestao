import { createFileRoute } from "@tanstack/react-router";
import { ListaOrdens } from "@/components/app/ListaOrdens";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/os/")({
  head: () => meta("Ordens de serviço", "Ordens de serviço da oficina com checklist e baixa de peças."),
  component: () => <ListaOrdens tipo="os" />,
});
