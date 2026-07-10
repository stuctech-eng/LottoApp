import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// Revision voor de precache van /offline — voorkomt dat een
// verouderde offline-pagina uit cache blijft hangen na een deploy.
// Vercel's build-omgeving heeft altijd de gecloonde git-geschiedenis
// beschikbaar; bij een ontbrekende git-commit valt dit terug op een
// willekeurige UUID zodat de build nooit hierop kan falen.
const gitRevision = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf-8",
}).stdout;
const revision = gitRevision && gitRevision.trim() ? gitRevision.trim() : crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/offline", revision }],
  swSrc: "app/sw.ts",
  useNativeEsbuild: true,
});
