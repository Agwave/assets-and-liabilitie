/**
 * 账本的类型与汇总逻辑。
 *
 * 数据本身在 `config/assets.yaml`（真实数据，不进仓库），
 * 模板在 `config/assets.example.yaml`。读取与解析在 `lib/config.ts`。
 *
 * 结构是**平铺**的：一条记录就是一个资产（或一笔负债）加上它的金额，
 * 没有再分「类别 → 条目」两级。这是刻意的 —— 页面上要回答的问题只有
 * 「我有哪些东西、各值多少」，中间加一层分类只会多一处要维护、多一层要点开。
 */

/**
 * 页面身份信息。定义在 `config/site.ts`，**不来自数据文件** ——
 * 它不随资产数据变，也就不该混进 `config/assets.yaml`。
 */
export type Profile = {
  readonly name: string;
  readonly subtitle: string;
  /** 页脚备注 */
  readonly note: string;
};

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
 * 这里**做**降序排序：条形榜要回答的就是「哪一项最大」，
 * 长度必须和大小同序，否则得靠读者自己一项项去比。
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
 * 业务规则体检，**返回问题清单而不是抛错** ——
 * 调用方（`lib/config.ts`）会把这里的问题和 YAML 形状问题合在一起，
 * 一次把所有毛病报全，省得读者改一个跑一次。
 *
 * 这里只管**规则**（金额正负、重名、空表）。字段类型、拼错的字段名
 * 归 `lib/config.ts` 管 —— 那边处理的是还没成形为 `Entry` 的原始数据。
 */
export function collectLedgerProblems(
  assets: readonly Entry[],
  liabilities: readonly Entry[],
): string[] {
  const problems: string[] = [];

  const check = (side: string, entries: readonly Entry[], required: boolean): void => {
    if (entries.length === 0) {
      // 没有负债是完全正常的（无债一身轻）。没有资产则说明配置被清空了，
      // 那样页面只剩一个 ¥0 和一堆空列表，几乎肯定是误操作。
      if (required) {
        problems.push(
          `「${side}」一条都没有 —— 这个页面至少要有一项资产才有意义。` +
            `确实不打算记的话，把 assets 里留一条也行。`,
        );
      }
      return;
    }

    const seen = new Set<string>();

    for (const entry of entries) {
      const label = `${side}「${entry.name}」`;

      if (entry.name.trim() === "") {
        problems.push(`${side}里有一条的 name 是空的。名字会直接显示在页面上，不能留空。`);
      } else if (seen.has(entry.name)) {
        problems.push(
          `${label}出现了不止一次 —— 名字重复会让「总共多少」变得无法核对，` +
            `React 的 key 也会冲突。同名的话请合成一条，或加个后缀区分。`,
        );
      }
      seen.add(entry.name);

      if (!Number.isFinite(entry.amount)) {
        problems.push(`${label}的 amount 不是有限数字。`);
      } else if (entry.amount <= 0) {
        problems.push(
          `${label}的 amount 是 ${entry.amount} —— 金额必须为正数；` +
            `正负由它放在 assets 还是 liabilities 下面决定，不要写负号。` +
            `如果这项已经还清或归零，请整条删掉。`,
        );
      }
    }

    const total = totalOf(entries);
    if (total <= 0) {
      problems.push(`「${side}」的合计是 ${total}，必须是正数。`);
    }
  };

  check("资产", assets, true);
  check("负债", liabilities, false);

  return problems;
}
