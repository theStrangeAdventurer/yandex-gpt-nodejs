/**
 * 
 * @param {string} textStr 
 * @returns {string}
 */
export const cleanSpecialSymbols = (textStr) => textStr.replace(/([\#\*\|\~\=\.\\\-\{\}\(\)\!])/g, '\\$1');

/**
 * @param {import('telegraf').Context} ctx 
 */
export const getReplyId = (ctx) => {
    if (ctx.message)
        return ctx.message.from.id;
    
    return ctx.update?.callback_query?.from.id
}

/**
 * @param {import('telegraf').Context} ctx 
 */
export const getUsername = (ctx) => {
    if (ctx.message)
        return ctx.message.from.username;
    
    return ctx.update?.callback_query?.message?.chat?.username
}
