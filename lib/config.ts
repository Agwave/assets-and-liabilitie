import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { parse } from "yaml";

import { collectLedgerProblems, type Entry } from "@/lib/ledger";

/**
 * 读取并校验 `config/assets.yaml`。
 *
 * **这个文件只放资产项和负债项。** 标题、副标题、数据截止日期、页脚备注
 * 这些固定信息在 `config/site.ts` 里 —— 它们不随数据变，就不该混在数据文件里。
 *
 * 配置从 TypeScript 换成 YAML 之后，**编辑器不再帮你检查字段名了** ——
 * `amout:` 少打一个 t，YAML 解析器不会报错，只会安静地给出一条
 * amount 为 undefined 的记录。所以这层校验不是可选的装饰，
 * 它是换掉类型系统之后补上的那个洞：
 *
 *   · 拒绝**未知字段**（拼错的键名在这里被抓住，不会静默变 undefined）
 *   · 校验每个字段的类型，并且针对 YAML 特有的坑给出可操作的修改建议
 *   · 最后把业务规则（`lib/ledger.ts`）的问题合到一起一次报全
 *
 * 它在模块加载时执行，所以 `pnpm build` 会跑到：配置写坏时构建失败，
 * 而不是发布一个数字悄悄错掉的页面。
 */

const CONFIG_FILE = "config/assets.yaml";
const EXAMPLE_FILE = "config/assets.example.yaml";
const CONFIG_PATH = path.join(process.cwd(), CONFIG_FILE);

const TOP_LEVEL_KEYS = ["assets", "liabilities"] as const;
const ENTRY_KEYS = ["name", "amount", "note"] as const;

export type LedgerConfig = {
  readonly assets: readonly Entry[];
  readonly liabilities: readonly Entry[];
};

/** 把问题清单拼成一段可读的报错，格式和 lib/ledger.ts 保持一致。 */
function fail(headline: string, problems: readonly string[]): never {
  throw new Error(`${headline}\n` + problems.map((problem) => `  · ${problem}`).join("\n"));
}

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

/** 逐条记录挑毛病。返回空数组表示这一侧没问题。 */
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

function loadLedgerConfig(): LedgerConfig {
  const source = readFileSync(CONFIG_PATH, "utf8");

  let raw: unknown;
  try {
    raw = parse(source);
  } catch (error) {
    throw new Error(
      `${CONFIG_FILE} 不是合法的 YAML，构建已中止：\n` +
        `  ${error instanceof Error ? error.message.split("\n")[0] : String(error)}\n\n` +
        `  最常见的两个原因：\n` +
        `    · 值里有半角冒号 —— name: 招商银行: 活期 要写成 name: "招商银行: 活期"\n` +
        `    · 缩进用了 Tab，或同一层级的缩进宽度不一致\n`,
    );
  }

  if (!isRecord(raw)) {
    fail(`${CONFIG_FILE} 的内容有问题，构建已中止：`, [
      `顶层应该是一个字段组（包含 profile / assets / liabilities），现在是${typeName(raw)}。`,
    ]);
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
    fail(`${CONFIG_FILE} 的内容有问题（共 ${problems.length} 处），构建已中止：`, problems);
  }

  // 形状已经对了，再跑业务规则。两组问题分开报是因为形状不对时
  // 规则检查没有意义 —— 数据还不是 Entry[] 的样子。
  const ledgerProblems = collectLedgerProblems(assets!, liabilities!);
  if (ledgerProblems.length > 0) {
    fail(`${CONFIG_FILE} 的数据有问题，构建已中止：`, ledgerProblems);
  }

  return { assets: assets!, liabilities: liabilities! };
}

/** 上一次读到的结果，连同当时的文件修改时间。 */
let cache: { readonly mtimeMs: number; readonly config: LedgerConfig } | null = null;

/**
 * 全站唯一的配置出口。
 *
 * **按 mtime 缓存，而不是在模块加载时读一次。** 这不是过早优化，是 dev 体验的
 * 必需品：YAML 是用 `fs` 读的，不在 Turbopack 的模块图里，改它不会触发重编译。
 * 如果只在模块加载时读一次，你改完配置刷新页面看到的还是旧数字 ——
 * 必须重启 dev server 才生效，而那种「改了没反应」最容易被误判成代码有 bug。
 *
 * 现在每次渲染都 stat 一下文件，只有 mtime 变了才重新解析。stat 很便宜，
 * YAML 解析只在改动后发生。生产构建是静态生成，构建期调一次就固化了。
 */
export function getLedgerConfig(): LedgerConfig {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `找不到 ${CONFIG_FILE}，构建已中止。\n\n` +
        `  这个文件被 .gitignore 排除了 —— 里面是你的真实资产数据，不该进仓库。\n` +
        `  从模板复制一份再改：\n\n` +
        `      cp ${EXAMPLE_FILE} ${CONFIG_FILE}\n`,
    );
  }

  const { mtimeMs } = statSync(CONFIG_PATH);
  if (cache !== null && cache.mtimeMs === mtimeMs) {
    return cache.config;
  }

  const config = loadLedgerConfig();
  cache = { mtimeMs, config };
  return config;
}
