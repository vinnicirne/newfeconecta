import { redirect } from "next/navigation";

export default function VersiculoRedirect() {
  redirect("/admin/mensagem-do-dia");
}
