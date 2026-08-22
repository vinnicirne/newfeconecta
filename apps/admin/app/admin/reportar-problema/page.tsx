import { redirect } from "next/navigation";

// Esta página foi movida para /suporte (rota pública acessível por todos os usuários)
export default function ReportarProblemaAdminRedirect() {
  redirect("/suporte");
}
