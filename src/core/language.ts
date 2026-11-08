// Chinese in traditional characters, whose base zh is the simplified.
const traditionalChinese = /^zh-(hant|tw|hk|mo)(-|$)/;

/** A language's code, then its base's where the base is written in the same script, both in lower case: pt-br and pt; zh-tw alone, as zh is simplified. */
export function codeAndBase(code: string): string[]
{
    const own = code.trim().toLowerCase();
    const base = own.split("-")[0];
    return own === "" ? [] : traditionalChinese.test(own) || base === own ? [own] : [own, base];
}
