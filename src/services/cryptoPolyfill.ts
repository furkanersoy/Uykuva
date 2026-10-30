import { getRandomValues, randomUUID } from "expo-crypto";

const current = globalThis.crypto;
if (!current?.getRandomValues || !current.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      ...(current ?? {}),
      getRandomValues: current?.getRandomValues?.bind(current) ?? getRandomValues,
      randomUUID: current?.randomUUID?.bind(current) ?? randomUUID
    }
  });
}
