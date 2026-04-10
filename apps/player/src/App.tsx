import { SceneTypeSchema } from "@telaflow/shared-contracts";
import "./App.css";

/**
 * Skeleton — sem leitura de Pack (Fase 4).
 * Stub: confirma que contratos do monorepo resolvem no Player.
 */
export default function App() {
  const sceneTypes = SceneTypeSchema.options;

  return (
    <main className="container">
      <h1>TelaFlow Player</h1>
      <p>Inicializado — skeleton Fase 1.</p>
      <p>
        Tipos de cena MVP (shared-contracts):{" "}
        <code>{sceneTypes.join(", ")}</code>
      </p>
    </main>
  );
}
