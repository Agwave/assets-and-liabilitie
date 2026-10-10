"use client";

import { useSyncExternalStore } from "react";

/** 永远不通知变化 —— 这个 store 只在「客户端 / 服务端」两态之间切换，运行期不变。 */
function subscribe(): () => void {
  return () => {};
}

/**
 * 是否已经跑到客户端。服务端渲染（以及 hydration 的首次渲染）返回 `false`，
 * 水合完成后返回 `true`。
 *
 * 用它代替 `const [m, setM] = useState(false); useEffect(() => setM(true), [])`
 * 那套老写法 —— 后者会在 effect 里同步 setState，触发级联渲染，
 * 新的 `react-hooks/set-state-in-effect` 规则会直接报错。
 *
 * 典型用途：读 `next-themes` 的主题这类「服务端拿不到、客户端才有」的值，
 * 避免服务端和客户端渲染出不同的 HTML。
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
