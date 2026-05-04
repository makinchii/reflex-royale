import { AuthPage } from "@/components/app/auth-page";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = {
  title: pageTitle("Signup"),
};

export default function SignupPage() {
  return <AuthPage mode="signup" />;
}
