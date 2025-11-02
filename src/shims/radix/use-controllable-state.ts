// Re-export hooks from the CJS build to provide stable named ESM exports in Webpack builds
// Bypass Webpack aliasing via dynamic require at runtime
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicRequire: NodeRequire = eval("require");
const cjs = dynamicRequire("@radix-ui/react-use-controllable-state") as {
  useControllableState: unknown;
  useControllableStateReducer: unknown;
  default?: unknown;
};

export const useControllableState = cjs.useControllableState as any;
export const useControllableStateReducer = cjs.useControllableStateReducer as any;
export default (cjs.default ?? cjs) as any;


