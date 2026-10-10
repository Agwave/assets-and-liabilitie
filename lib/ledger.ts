/**
 * 账本的类型与汇总逻辑。数据本身在 `config/assets.ts`。
 *
 * 结构是**平铺**的：一条记录就是一个资产（或一笔负债）加上它的金额，
 * 没有再分「类别 → 条目」两级。这是刻意的 —— 页面上要回答的问题只有
 * 「我有哪些东西、各值多少」，中间加一层分类只会多一处要维护、多一层要点开。
 *
 * 这个模块把**业务约束放进类型系统**：漏字段、金额写成字符串都是编译错误。
 * 类型管不到的部分（重名、非正数金额、资产为空）由 `assertLedgerIsSound`
 * 在构建期抛错拦住 —— 见 `config/assets.ts` 末尾。
 */

/** 一条记录。金额单位是「元」。 */
export type Entry = {
  readonly name: string;
  /** 金额，单位：元。**必须是正数**：正负由它在资产表还是负债表决定，不靠符号。 */
  readonly amount: number;
  /** 可选备注，例如「年化 2.6%」「按 2026-08 估值」。显示在条目名下方。 */
  readonly note?: string;
};

/** 排好序的一条记录，附带它占该侧合计的比例。 */
export type RankedEntry = {
  readonly entry: Entry;
  /** 占比，0..1。该侧合计为 0 时为 0 */
  readonly share: number;
};

export type LedgerSummary = {
  readonly totalAssets: number;
  readonly totalLiabilities: number;
  /** 净资产 = 总资产 − 总负债。可以是负数。 */
  readonly netWorth: number;
  /** 负债率 = 总负债 ÷ 总资产，0..1。总资产为 0 时为 0。 */
  readonly debtRatio: number;
  /** 按金额从大到小 */
  readonly assets: readonly RankedEntry[];
  readonly liabilities: readonly RankedEntry[];
};

/** 一组的金额合计。 */
export function totalOf(entries: readonly Entry[]): number {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

/**
 * 把账本算成页面要用的汇总。
 *
 * 这里**做**降序排序，和之前按分类画环形图时不一样：条形榜要回答的就是
 * 「哪一项最大」，长度必须和大小同序，否则得靠读者自己一项项去比。
 * 排序只改行的先后，不改颜色 —— 整个榜单是**单色**的，
 * 所以不存在「换个筛选条件颜色就跟着变」那种误导。
 */
export function summarize(assets: readonly Entry[], liabilities: readonly Entry[]): LedgerSummary {
  const totalAssets = totalOf(assets);
  const totalLiabilities = totalOf(liabilities);

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    debtRatio: totalAssets > 0 ? totalLiabilities / totalAssets : 0,
    assets: rank(assets, totalAssets),
    liabilities: rank(liabilities, totalLiabilities),
  };
}

/** 降序排列并算占比。金额相同时保持配置里的先后顺序（sort 是稳定的）。 */
function rank(entries: readonly Entry[], total: number): readonly RankedEntry[] {
  return [...entries]
    .sort((a, b) => b.amount - a.amount)
    .map((entry) => ({ entry, share: total > 0 ? entry.amount / total : 0 }));
}

/**
 * 配置体检。**在模块加载时调用**（`config/assets.ts` 末尾），
 * 所以 `pnpm build` 会跑到它 —— 配置写坏时构建失败，而不是发布一个数字错掉的页面。
 *
 * 这里只查类型系统表达不了的约束。能在类型层面拦住的（金额不是数字、
 * 字段漏写）不在这里重复。
 */
export function assertLedgerIsSound(assets: readonly Entry[], liabilities: readonly Entry[]): void {
  const problems: string[] = [];

  const check = (side: string, entries: readonly Entry[], required: boolean): void => {
    if (entries.length === 0) {
      // 没有负债是完全正常的（无债一身轻）。没有资产则说明配置被清空了，
      // 那样页面只剩一个 ¥0 和一堆空列表，几乎肯定是误操作。
      if (required) {
        problems.push(`${side}一条都没有 —— 这个页面至少要有一项${side}才有意义。`);
      }
      return;
    }

    const seen = new Set<string>();

    for (const entry of entries) {
      const label = `${side}「${entry.name}」`;

      if (entry.name.trim() === "") {
        problems.push(`${side}里有一条没写名字。名字会直接显示在页面上，不能为空。`);
      } else if (seen.has(entry.name)) {
        problems.push(
          `${label}出现了不止一次 —— 名字重复会让「总共多少」变得无法核对，` +
            `React 的 key 也会冲突。同名的话请合成一条，或加个后缀区分。`,
        );
        seen.add(entry.name);
      } else {
        seen.add(entry.name);
      }

      if (!Number.isFinite(entry.amount)) {
        problems.push(`${label}的金额不是有限数字。`);
      } else if (entry.amount <= 0) {
        problems.push(
          `${label}的金额是 ${entry.amount} —— 金额必须为正数；` +
            `正负由它属于资产还是负债决定，不要写负号。`,
        );
      }
    }

    if (totalOf(entries) <= 0) {
      problems.push(`${side}的合计是 ${totalOf(entries)}，必须是正数。`);
    }
  };

  check("资产", assets, true);
  check("负债", liabilities, false);

  if (problems.length > 0) {
    throw new Error(
      `config/assets.ts 的数据有问题，构建已中止：\n` +
        problems.map((problem) => `  · ${problem}`).join("\n"),
    );
  }
}
