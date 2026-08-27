import { redirect } from "next/navigation";

export default function DashboardBibliaRedirect() {
  redirect("/admin/bible");
}
