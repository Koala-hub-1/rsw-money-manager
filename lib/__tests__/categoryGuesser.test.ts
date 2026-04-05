import { describe, it, expect } from "vitest";
import { guessCategory } from "../categoryGuesser";

describe("guessCategory", () => {
  it("家賃を正しく判定", () => {
    expect(guessCategory("家賃振込")).toBe("家賃");
    expect(guessCategory("賃料")).toBe("家賃");
  });

  it("共益費を正しく判定", () => {
    expect(guessCategory("共益費")).toBe("共益費");
    expect(guessCategory("管理費")).toBe("共益費");
  });

  it("食費を正しく判定", () => {
    expect(guessCategory("給食費")).toBe("食費");
  });

  it("日用品を正しく判定", () => {
    expect(guessCategory("VISA デビット マツモトキヨシ 新宿店")).toBe("日用品");
    expect(guessCategory("VISA デビット セブンイレブン 品川駅前店")).toBe("日用品");
    expect(guessCategory("VISA デビット ローソン 新宿御苑店")).toBe("日用品");
    expect(guessCategory("VISA デビット ファミリーマート 新宿5丁目店")).toBe("日用品");
    expect(guessCategory("VISA デビット ダイソー 品川店")).toBe("日用品");
    expect(guessCategory("VISA デビット ウエルシア 渋谷店")).toBe("日用品");
  });

  it("医療を正しく判定", () => {
    expect(guessCategory("VISA デビット 調剤薬局 スギ薬局")).toBe("医療");
    expect(guessCategory("VISA デビット 調剤薬局 日本調剤")).toBe("医療");
  });

  it("交通を正しく判定", () => {
    expect(guessCategory("VISA デビット タクシー 日本交通")).toBe("交通");
  });

  it("娯楽を正しく判定", () => {
    expect(guessCategory("Choice100 フットマッサージ")).toBe("娯楽");
    expect(guessCategory("Choice100 出張理美容")).toBe("娯楽");
  });

  it("光熱費を正しく判定", () => {
    expect(guessCategory("NHK受信料")).toBe("光熱費");
  });

  it("マッチしない場合はその他", () => {
    expect(guessCategory("VISA デビット Amazon.co.jp")).toBe("その他");
    expect(guessCategory("自動定額振替（本体口座より）")).toBe("その他");
  });
});
