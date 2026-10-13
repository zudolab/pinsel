import type { TrustedComponentPack } from "@zudo-composer/component-contract";
import { pinselPack } from "@pinsel/ui";

import { checkPackAgainstContract, contractPack } from "./contract-pack";

/**
 * The pack the pipeline compiles with: `@pinsel/ui`'s, which must satisfy the
 * component contract. `PINSEL_STRUCTURE_PACK=contract` swaps in the
 * render-nothing contract pack, for proving the structure while the UI pack
 * is still being built (it produces the same plan when the real pack conforms).
 */
export function structurePack(): TrustedComponentPack {
  if (process.env.PINSEL_STRUCTURE_PACK === "contract") return contractPack();
  const problems = checkPackAgainstContract(pinselPack.manifest);
  if (problems.length > 0) {
    throw new Error(
      `@pinsel/ui does not satisfy the component contract (src/site/component-contract.ts):\n${problems.map((problem) => `  ${problem.componentId}: ${problem.message}`).join("\n")}`,
    );
  }
  return pinselPack as unknown as TrustedComponentPack;
}
