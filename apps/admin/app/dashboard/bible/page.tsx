import { redirect } from "next/navigation";

export default function DashboardBibleRedirect() {
  redirect("/admin/bible");
}
