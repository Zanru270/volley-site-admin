import { redirect } from "next/navigation";

// The home page's form view is a panel in its live editor now; older links land there.
export default function HomeFormPage() {
  redirect("/home?open=form");
}
