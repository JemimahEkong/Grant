import { SignInForm } from "../../components/SignInForm";
import { Logo, TestnetBadge } from "../../components/ui";

export const metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/app";
  return (
    <div className="page auth-page">
      <div className="landing-wrap">
        <nav className="landing-nav" aria-label="Main">
          <Logo />
          <div className="row">
            <TestnetBadge />
            <span className="micro">Email + password</span>
          </div>
        </nav>
      </div>
      <main className="auth-main">
        <SignInForm initialMode={params.mode === "signup" ? "signup" : "signin"} nextPath={nextPath} />
      </main>
    </div>
  );
}
