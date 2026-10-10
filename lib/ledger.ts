import type { SeriesSlot } from "@/lib/palette";

/**
 * 账本的类型与汇总逻辑。数据本身在 `config/assets.ts`。
 *
 * 这个模块刻意把**业务约束放进类型系统**：金额写错类型、颜色槽位超出验证范围、
 * 必填字段漏写，都是编译错误，而不是页面上一个悄悄错掉的数字。
 * 类型管不到的部分（重复 id、非正数金额、空类别、槽位撞车）由
 * `assertLedgerIsSound` 在构建期抛错拦住 —— 见 `config/assets.ts` 末尾。
 */

/** 一条明细。金额单位是「元」。 */
export type LineItem = {
  readonly name: string;
  /** 金额，单位：元。**必须是正数**：正负由它所在的资产/负债分组决定，不靠符号。 */
  readonly amount: number;
  /** 可选备注，例如「年化 2.6%」「按 2026-08 估值」。会显示在条目名下方。 */
  readonly note?: string;
};

/** 一个分类，下挂若干条目。 */
export type Category = {
  readonly id: string;
  readonly name: string;
  /** 一句话说明这一类包含什么，显示在分类标题下方。 */
  readonly description: string;
  readonly items: readonly LineItem[];
};

/**
 * 资产分类。比负债分类多一个 `colorSlot`。
 *
 * `colorSlot` 决定它在环形图里用哪个颜色。它**显式写死**、不跟数组顺序走 ——
 * 调整条目顺序不该让颜色跟着变，否则读者刚记住「蓝色是现金」，一改配置就错位。
 * 类型是 `SeriesSlot`（0..4），所以第 6 个分类拿不到合法槽位，加不进来。
 */
export type AssetCategory = Category & {
  readonly colorSlot: SeriesSlot;
};

/** 负债分类。不画环形图，所以没有颜色槽位。 */
export type LiabilityCategory = Category;

/** 一个分类算出来的占比结果。 */
export type CategoryShare<C extends Category> = {
  readonly category: C;
  /** 该分类金额合计 */
  readonly total: number;
  /** 占比，0..1。父级合计为 0 时为 0 */
  readonly share: number;
};

export type LedgerSummary<A extends Category, L extends Category> = {
  readonly totalAssets: number;
  readonly totalLiabilities: number;
  /** 净资产 = 总资产 − 总负债。可以是负数。 */
  readonly netWorth: number;
  /** 负债率 = 总负债 ÷ 总资产，0..1。总资产为 0 时为 0。 */
  readonly debtRatio: number;
  readonly assetShares: readonly CategoryShare<A>[];
  readonly liabilityShares: readonly CategoryShare<L>[];
};

/** 单个分类的金额合计。 */
export function totalOf(category: Category): number {
  return category.items.reduce((sum, item) => sum + item.amount, 0);
}

/**
 * 把账本算成页面要用的汇总。
 *
 * **不做排序。** 分类一律保持配置里的顺序：环形图里相邻两个扇区的颜色
 * 是跑过色盲安全验证的固定组合（见 `lib/palette.ts`），按金额排序会把
 * 任意两个色相凑到一起，验证过的保证就失效了。
 * 大小关系靠旁边始终可见的数值和占比表达，不靠颜色。
 */
export function summarize<A extends Category, L extends Category>(
  assets: readonly A[],
  liabilities: readonly L[],
): LedgerSummary<A, L> {
  const totalAssets = assets.reduce((sum, c) => sum + totalOf(c), 0);
  const totalLiabilities = liabilities.reduce((sum, c) => sum + totalOf(c), 0);

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    debtRatio: totalAssets > 0 ? totalLiabilities / totalAssets : 0,
    assetShares: sharesOf(assets, totalAssets),
    liabilityShares: sharesOf(liabilities, totalLiabilities),
  };
}

function sharesOf<C extends Category>(
  categories: readonly C[],
  total: number,
): readonly CategoryShare<C>[] {
  return categories.map((category) => {
    const categoryTotal = totalOf(category);
    return {
      category,
      total: categoryTotal,
      share: total > 0 ? categoryTotal / total : 0,
    };
  });
}

/**
 * 配置体检。**在模块加载时调用**（`config/assets.ts` 末尾），
 * 所以 `pnpm build` 会跑到它 —— 配置写坏时构建失败，而不是发布一个数字错掉的页面。
 *
 * 这里只查类型系统表达不了的约束。能在类型层面拦住的（金额不是数字、
 * 槽位超出 0..4、字段漏写）不在这里重复。
 */
export function assertLedgerIsSound(
  assets: readonly (AssetCategory & { readonly id: string })[],
  liabilities: readonly Category[],
): void {
  const problems: string[] = [];

  const checkSide = (side: string, categories: readonly Category[], assetSide: boolean): void => {
    const seenIds = new Set<string>();
    const seenSlots = new Set<number>();

    for (const category of categories) {
      const label = `${side}「${category.name}」`;

      if (seenIds.has(category.id)) {
        problems.push(`${label}的 id \`${category.id}\` 重复了 —— id 必须唯一。`);
      }
      seenIds.add(category.id);

      if (assetSide) {
        const slot = (category as AssetCategory).colorSlot;
        if (seenSlots.has(slot)) {
          problems.push(
            `${label}的 colorSlot ${slot} 已被占用 —— 同一槽位不能给两个分类，` +
              `否则两个扇区同色，读者无法区分。`,
          );
        }
        seenSlots.add(slot);
      }

      if (category.items.length === 0) {
        problems.push(`${label}没有任何条目。空分类没有意义，删掉它或补上条目。`);
      }

      for (const item of category.items) {
        if (!Number.isFinite(item.amount)) {
          problems.push(`${label}的条目「${item.name}」金额不是有限数字。`);
        } else if (item.amount <= 0) {
          problems.push(
            `${label}的条目「${item.name}」金额是 ${item.amount} —— ` +
              `金额必须为正数；正负由它属于资产还是负债决定，不要写负号。`,
          );
        }
      }

      if (totalOf(category) <= 0) {
        problems.push(`${label}的合计是 ${totalOf(category)}，必须是正数。`);
      }
    }
  };

  checkSide("资产分类", assets, true);
  checkSide("负债分类", liabilities, false);

  if (problems.length > 0) {
    throw new Error(
      `config/assets.ts 的数据有问题，构建已中止：\n` + problems.map((p) => `  · ${p}`).join("\n"),
    );
  }
}
