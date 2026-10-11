import { parse } from "yaml";

import { collectLedgerProblems, type Entry } from "@/lib/ledger";

/**
 * 把 YAML 文本解析成账本。**纯函数，不碰文件系统** —— 桌面端和网页端共用同一份，
 * 文件从哪来（Tauri 读本地 / 网页 fetch / 用户粘贴）不归它管。
 *
 * 这层校验存在的理由：YAML 有很多**会静默出错**的写法。
 * `amout:` 少打一个 t，YAML 解析器不报错，只会安静地给出一条 amount 为
 * undefined 的记录；`1,600,000` 会被解析成**字符串**。没有这层，
 * 这些错误会一路飘到汇总数字里才暴露，而且看起来完全正常。
 *
 *   · 拒绝**未知字段**（拼错的键名在这里被抓住，并猜出你想写哪个）
 *   · 校验字段类型，针对 YAML 特有的坑给出可操作的修改建议
 *   · 最后把业务规则（`lib/ledger.ts`）的问题合到一起一次报全
 *
 * **返回结果而不是抛错。** 以前它跑在构建期，坏配置让构建失败就够了；
 * 现在它跑在应用里，得把问题渲染成一个能读的错误页，而不是把界面炸掉。
 */

const TOP_LEVEL_KEYS = ["assets", "liabilities"] as const;
const ENTRY_KEYS = ["name", "amount", "note"] as const;

export type ParsedLedger = {
  readonly assets: readonly Entry[];
  readonly liabilities: readonly Entry[];
};

export type ParseResult =
  | { readonly ok: true; readonly ledger: ParsedLedger }
  | { readonly ok: false; readonly problems: readonly string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typeName(value: unknown): string {
  if (value === null || value === undefined) return "空";
  if (Array.isArray(value)) return "数组";
  switch (typeof value) {
    case "string":
      return "字符串";
    case "number":
      return "数字";
    case "boolean":
      return "布尔值";
    default:
      return typeof value;
  }
}

/**
 * 金额字段的报错要特别具体 —— YAML 里最常见的三种错写法都能被静默接受，
 * 只是会被当成字符串：带千分位逗号、带下划线（那是 JS 的写法，YAML 不认）、
 * 带引号。这里识别出来并直接告诉读者该写成什么。
 */
function describeAmountProblem(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? null : "是 NaN 或 Infinity";
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[,_\s]/g, "");
    if (/^\d+(\.\d+)?$/.test(cleaned)) {
      return (
        `是字符串 ${JSON.stringify(value)} —— YAML 里数字不能带千分位逗号、` +
        `下划线或引号，它们会让整串变成字符串。去掉分隔符，写成 ${cleaned}`
      );
    }
    return (
      `是字符串 ${JSON.stringify(value)} —— 金额只能是纯数字，单位是元，` +
      `不要带 ¥ 符号或「万」这类单位`
    );
  }
  return `是${typeName(value)} —— 金额必须是数字`;
}

/** 逐条记录挑毛病，顺手把合格的收进结果。 */
function checkEntryList(side: string, value: unknown, problems: string[]): Entry[] | null {
  if (!Array.isArray(value)) {
    problems.push(`「${side}」应该是一个列表（每行以「- 」开头），现在是${typeName(value)}。`);
    return null;
  }

  const entries: Entry[] = [];

  value.forEach((item, index) => {
    const at = `${side} 第 ${index + 1} 条`;

    if (!isRecord(item)) {
      problems.push(`${at}不是一个字段组，现在是${typeName(item)}。`);
      return;
    }

    // 未知字段：拼错的键名在这里被抓住。没有这一步，`amout:` 会静默变成
    // 一条 amount 为 undefined 的记录，一路飘到汇总数字里才出问题。
    for (const key of Object.keys(item)) {
      if (!(ENTRY_KEYS as readonly string[]).includes(key)) {
        const suggestion = /^nam/i.test(key)
          ? "name"
          : /^amo|^mone|^value|^price/i.test(key)
            ? "amount"
            : /^remark|^comment|^desc|^memo/i.test(key)
              ? "note"
              : null;
        problems.push(
          `${at}有一个不认识的字段 \`${key}\`` +
            (suggestion ? `，是不是想写 \`${suggestion}\`？` : "。") +
            `可用的字段只有 ${ENTRY_KEYS.join(" / ")}。`,
        );
      }
    }

    const name = item.name;
    if (typeof name !== "string") {
      problems.push(`${at}的 name 是${typeName(name)} —— 必须是一段文字。`);
    } else if (name.trim() === "") {
      problems.push(`${at}的 name 是空的 —— 名字会直接显示在页面上，不能留空。`);
    }

    const amountProblem = describeAmountProblem(item.amount);
    if (amountProblem) {
      problems.push(`${at}的 amount ${amountProblem}。`);
    }

    if (item.note !== undefined && typeof item.note !== "string") {
      problems.push(`${at}的 note 是${typeName(item.note)} —— 必须是一段文字。`);
    }

    // 只有这一条完全合格时才收进结果
    if (
      typeof name === "string" &&
      name.trim() !== "" &&
      !amountProblem &&
      (item.note === undefined || typeof item.note === "string")
    ) {
      entries.push({
        name,
        amount: item.amount as number,
        ...(typeof item.note === "string" ? { note: item.note } : {}),
      });
    }
  });

  return entries;
}

/** 把 YAML 文本解析 + 校验成账本。 */
export function parseLedgerYaml(source: string): ParseResult {
  let raw: unknown;
  try {
    raw = parse(source);
  } catch (error) {
    const detail = error instanceof Error ? error.message.split("\n")[0] : String(error);
    return {
      ok: false,
      problems: [
        `YAML 语法错误：${detail}\n` +
          `最常见的两个原因：值里有半角冒号（` +
          `name: 招商银行: 活期 要写成 name: "招商银行: 活期"），` +
          `或者缩进用了 Tab、同一层级的缩进宽度不一致。`,
      ],
    };
  }

  if (!isRecord(raw)) {
    return {
      ok: false,
      problems: [`顶层应该是一个字段组（包含 assets 和 liabilities），现在是${typeName(raw)}。`],
    };
  }

  const problems: string[] = [];

  for (const key of Object.keys(raw)) {
    if ((TOP_LEVEL_KEYS as readonly string[]).includes(key)) continue;
    // 老版本的配置里有 profile 段。直接报「不认识的字段」会让人摸不着头脑，
    // 这里给一句明确的迁移提示。
    problems.push(
      key === "profile"
        ? `顶层不该再有 \`profile\` 段了 —— 标题、副标题、数据截止日期、页脚备注` +
            `已经挪到 config/site.ts 里固定下来。把这一段整段删掉即可。`
        : `顶层有一个不认识的字段 \`${key}\`。可用的字段只有 ${TOP_LEVEL_KEYS.join(" / ")}。`,
    );
  }

  const assets = checkEntryList("资产", raw.assets, problems);
  const liabilities = checkEntryList("负债", raw.liabilities, problems);

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  // 形状已经对了，再跑业务规则。两组问题分开报是因为形状不对时
  // 规则检查没有意义 —— 数据还不是 Entry[] 的样子。
  const ledgerProblems = collectLedgerProblems(assets!, liabilities!);
  if (ledgerProblems.length > 0) {
    return { ok: false, problems: ledgerProblems };
  }

  return { ok: true, ledger: { assets: assets!, liabilities: liabilities! } };
}
