import { AuthPage } from "@/components/app/auth-page";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = {
  title: pageTitle("Login"),
};

export default function LoginPage() {
  return <AuthPage mode="login" />;
}
