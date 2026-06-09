import { Masthead } from "@/components/Masthead";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-2xl min-w-0 px-4 py-6 sm:px-5">
        <div className="animate-rise">
          <h1 className="font-display mb-1 text-3xl">Settings</h1>
          <p className="mb-6 text-sm text-ink-muted">
            You can also just tell me in chat — &ldquo;set my goal to 175&rdquo; or
            &ldquo;my limit is 1,900&rdquo;.
          </p>
          <SettingsForm />
        </div>
      </main>
    </>
  );
}
