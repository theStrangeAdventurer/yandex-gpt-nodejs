import dotenv from 'dotenv';
import { iamRepository } from './utils/index.js';
import { getTextCompletion } from './utils/yandex.js';
import { getReplyId, cleanSpecialSymbols, getUsername } from './utils/telegram.js';
import { Telegraf } from 'telegraf';

dotenv.config({});

/**
 * @type{Record<number, { isWaitingFor?: 'role'; role: string; messages: Array<{ role: 'user' | 'assistant'; text: string; }> }>}
 */
const contextStore = {};

const getDefaultState = () => ({
    isWaitingFor: null,
    role: null,
    messages: [],
});

/**
 * @param {import('telegraf').Context} ctx 
 * @param {(ctx: import('telegraf').Context, replyId: number) => void} next 
 */
const middleware = async (ctx, next) => {
    const replyId = getReplyId(ctx);
    const username = getUsername(ctx);
    const usersWhiteList = (process.env.USERS_WHITE_LIST || '').split(',').map(username => username.trim());
    if (!usersWhiteList.includes(username)) {
        return ctx.reply('Извини, я тебя не знаю, Бро');
    }
    
    contextStore[replyId] = contextStore[replyId] || getDefaultState();
    next(ctx, replyId);
};

const bot = new Telegraf(process.env.BOT_TOKEN);

async function main() {
    await iamRepository.init(process.env.YA_OAUTH_TOKEN);

    await bot.telegram.setMyCommands([
        {
            command: '/start',
            description: 'Сброс контекста',   
        },
        {
            command: '/reset',
            description: 'Сброс контекста',   
        },
        {
            command: '/role',
            description: 'Задать промпт для роли'
        }
    ]);

    bot.on('message', (ctx) => middleware(ctx, async (ctx, replyId) => {
        switch(ctx.text) {
            case '/start':
            case '/reset':
                contextStore[replyId] = getDefaultState();
                return ctx.reply('Контекст был сброшен');
            case '/role':
                contextStore[replyId].isWaitingFor = 'role';
                return ctx.reply('Напишите, какую роль должен выполнять ассистент');
            default:
                const isWaitingForRole = contextStore[replyId]?.isWaitingFor === 'role';
                
                if (isWaitingForRole) {
                    contextStore[replyId].isWaitingFor = null;
                    contextStore[replyId].role = ctx.text;
                    return ctx.reply(`Создан ассистент с ролью: ${ctx.text}`);
                }

                if (!contextStore[replyId] || !contextStore[replyId].role) {
                    return ctx.reply('Нет контекста или роли асситента для пользователя с ID: ' + replyId);
                }

                const { result: { alternatives }  } = await getTextCompletion({
                    iamToken: iamRepository.value,
                    folderId: process.env.FOLDER_ID,
                    model: 'yandexgpt/latest',
                    role: contextStore[replyId].role,
                    messages: [
                        ...contextStore[replyId].messages,
                        {
                            role: 'user',
                            text: ctx.text
                        }
                    ]
                });

                contextStore[replyId].messages.push({
                    role: 'user',
                    text: ctx.text
                });

                contextStore[replyId].messages.push({
                    role: 'assistant',
                    text: alternatives[0].message.text
                });

                ctx.reply(cleanSpecialSymbols(alternatives[0].message.text), { parse_mode: 'MarkdownV2' });
        }
    }));

    await bot.launch();
}
                    
main();

// Enable graceful stop
process.once('SIGINT', () => {
    iamRepository.destroy();
    bot.stop('SIGINT');
})
process.once('SIGTERM', () => {
    iamRepository.destroy();
    bot.stop('SIGTERM');
})