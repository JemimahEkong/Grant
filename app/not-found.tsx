import Link from "next/link";
import { EmptyState, Logo, TestnetBadge } from "../components/ui";

export default function NotFound() {
  return (
    <div className="page" style={{ minHeight: "100dvh", padding: "28px 18px" }}>
      <div className="landing-wrap">
        <nav className="landing-nav" aria-label="Main">
          <Logo />
          <TestnetBadge />
        </nav>
        <div style={{ marginTop: 40 }}>
          <EmptyState
            title="Page not found"
            description="This proof link may have been revoked, or the page never existed. Nothing is charged from a missing page."
            action={
              <Link href="/" className="btn btn-primary">
                Back to Grant
              </Link>
            }
          />
        </div>
      </div>
    </div>
  );
}
