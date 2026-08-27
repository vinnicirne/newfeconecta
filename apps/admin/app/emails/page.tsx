import { redirect } from "next/navigation";

export default function EmailsRedirect() {
  redirect("/admin/emails");
}
