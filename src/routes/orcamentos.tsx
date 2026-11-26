import { createFileRoute } from "@tanstack/react-router";
import { ListaOrdens } from "@/components/app/ListaOrdens";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/orcamentos")({
  head: () => meta("Orçamentos", "Orçamentos enviados aos clientes e conversão em OS."),
  component: () => <ListaOrdens tipo="orcamento" />,
});
