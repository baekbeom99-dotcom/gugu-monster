/** 받침에 따라 조사를 고른다: josa('냥냥이', '이', '가') → '냥냥이가', josa('별', '이', '가') → '별이' */
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  const last = word.charCodeAt(word.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  const hasFinal = isHangul ? (last - 0xac00) % 28 !== 0 : false;
  return word + (hasFinal ? withFinal : withoutFinal);
}
