import { redirect } from "next/navigation";

export default function ConfiguracoesRedirect() {
  redirect("/admin/api-settings");
}
