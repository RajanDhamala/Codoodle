import { WORD_BANK } from "./WordBank.js";

export const normalizeCustomWordSettings = (settings) => {
  const text = settings.customWords ?? "";
  const category = settings.customWordCategory ?? "Custom";
  const only = settings.customWordsOnly ?? false;
  if (typeof text !== "string" || text.length > 2000 || typeof category !== "string" || typeof only !== "boolean") {
    throw new Error("Custom words must be text, up to 2000 characters.");
  }
  const words = [...new Map(text.split(/[,\n]/).map((word) => word.trim()).filter(Boolean).map((word) => [word.toLowerCase(), word])).values()];
  if (words.length > 100 || words.some((word) => [...word].length > 32)) {
    throw new Error("Use up to 100 custom words, with 32 characters per word.");
  }
  const normalizedCategory = category.trim() || "Custom";
  if ([...normalizedCategory].length > 32) throw new Error("The custom word category must be 32 characters or fewer.");
  if (only && words.length === 0) throw new Error("Add at least one word to use custom words only.");
  if (words.join(", ").length > 2000) throw new Error("Custom words must fit within 2000 characters.");
  return { customWords: words.join(", "), customWordCategory: normalizedCategory, customWordsOnly: only };
};

export const getRoomWordPool = (settings) => {
  const custom = normalizeCustomWordSettings(settings);
  const words = custom.customWords ? custom.customWords.split(", ").map((word) => ({ word, category: custom.customWordCategory })) : [];
  return custom.customWordsOnly ? words : [...WORD_BANK, ...words];
};
