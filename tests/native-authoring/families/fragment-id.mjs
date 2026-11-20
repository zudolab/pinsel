/** A rendered section id as the host emits it (Results uses `year-<label>`, e.g. `year-2015年度`); safe inside a quoted attribute selector. */
export const isFragmentId=value=>typeof value==='string'&&value.length>0&&value.length<=200&&!/[\s"'\\#<>`\u0000-\u001f\u007f]/u.test(value);
