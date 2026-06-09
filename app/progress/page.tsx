import { Masthead } from "@/components/Masthead";
import { ProgressView } from "@/components/ProgressView";

export const dynamic = "force-dynamic";

export default function ProgressPage() {
  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-4xl min-w-0 px-4 py-6 sm:px-5">
        <div className="animate-rise">
          <ProgressView />
        </div>
      </main>
    </>
  );
}
