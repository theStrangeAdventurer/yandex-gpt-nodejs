import dotenv from 'dotenv';
import { iamRepository } from './utils/index.js';
import { getTextCompletion, recognizeVoice, vocalizeText } from './utils/yandex.js';
import { getReplyId, cleanSpecialSymbols, getUsername } from './utils/telegram.js';
import { Telegraf, Markup } from 'telegraf';
import fastify from 'fastify';
import fws from '@fastify/websocket';
import fredirect from 'fastify-https-redirect';
import fs from 'node:fs';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import { Readable, Writable } from 'node:stream';

dotenv.config({});

/**
 * @type{Record<number, { isWaitingFor?: 'role'; role: string; messages: Array<{ role: 'user' | 'assistant'; text: string; }> }>}
 */
const contextStore = {};
const commonTextCompletionProps = {
    folderId: process.env.FOLDER_ID,
    model: 'yandexgpt/latest',
}

/**
 * @param {ArrayBuffer} buffer 
 */
const convertToOgg = (buffer) => {
    return new Promise((resolve, reject) => {
        let oggBuffer = Buffer.alloc(0); // Инициализируем пустой буфер для результатов

        const readable = new Readable();
        readable._read = () => {}; // Пустая функция _read, чтобы избежать ошибки
        readable.push(Buffer.from(buffer)); // Добавляем наш buffer в readable stream
        readable.push(null); // Сигнализируем конец stream
    
        ffmpeg(readable)
            .outputFormat('ogg')
            .on('end', function() {
                resolve(oggBuffer);
            })
            .on('error', reject)
            .pipe(Writable({
                write(chunk, encoding, callback) {
                    if (chunk instanceof ArrayBuffer) {
                        chunk = Buffer.from(chunk);
                    }
                
                    oggBuffer = Buffer.concat([oggBuffer, chunk]); // Собираем наш буфер тут
                    callback();
                }
            }));
    })
}

const getDefaultState = () => ({
    isWaitingFor: null,
    role: null,
    messages: [],
});

const TEST_REPLY_ID = 777;

const server = fastify({
    logger: true,
    https: {
        key: fs.readFileSync(path.join(process.cwd(), 'cert', 'localhost-key.pem')),
        cert: fs.readFileSync(path.join(process.cwd(), 'cert', 'localhost.pem'))
    }
});

server.register(fws);
server.register(fredirect);

server.get('/ping', (conn, req) => {
    return 'pong';
})
server.register(async function (fastify) {
    server.get('/assist', { websocket: true }, (socket /* WebSocket */, req /* FastifyRequest */) => {
        socket.on('message', async message => {
            let arrayBuffer = message.buffer;
            let newBuffer;
            try {
                newBuffer = await convertToOgg(arrayBuffer);
            } catch (error) {
                // TODO: отправлять тестовые данные о том, что произошла ошибка
                return server.log.error('ffmpeg error: ' + error);
            }

            const blob = new Blob([newBuffer], { type: 'audio/ogg; codecs=opus' });
            const text = await recognizeVoice(blob, iamRepository.value);
            
            if (!text) {
                server.log.info('Empty message');
                return;
            }
            console.log('text_before_sent', text);

            contextStore[TEST_REPLY_ID].messages.push({ role: 'user', text });
            
            const { result: { alternatives }  } = await getTextCompletion({
                ...commonTextCompletionProps,
                iamToken: iamRepository.value,
                role: 'Ты владелец youtube канала про телеграм ботов и ты не устаешь повторять, что нужно влепить лайк',
                messages: [...contextStore[TEST_REPLY_ID].messages],
            });

            const assistantResponse = alternatives[0].message.text;

            contextStore[TEST_REPLY_ID].messages.push({ role: 'assistant', text: assistantResponse });

            const audioArrayBuffer = await vocalizeText(assistantResponse, iamRepository.value);
            
            const base64Data = Buffer.from(audioArrayBuffer).toString('base64'); // Преобразуем данные в base64

            socket.send(base64Data);
        });
    })
})

server.listen({ port: 8080 }, err => {
  contextStore[TEST_REPLY_ID] = getDefaultState();
  if (err) {
    server.log.error(err);
    console.error(err);
    process.exit(1)
  }
  console.log('Server up and running on https://localhost:8080/ping')
})


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
        },
        {
            command: '/webapp',
            description: 'Открыть веб апп'
        }
    ]);

    bot.on('message', (ctx) => middleware(ctx, async (ctx, replyId) => {
        switch(ctx.text) {
            case '/webapp':
                return ctx.reply('Привет! Нажми на кнопку ниже, чтобы открыть веб-приложение.',
                    Markup.inlineKeyboard([
                        Markup.button.webApp('Начать общение', process.env.WEB_APP_URL) // https://url/to/html/page.html
                    ])
                );            
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
                    ...commonTextCompletionProps,
                    iamToken: iamRepository.value,
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


const shutdown = async () => {
    iamRepository.destroy();
    bot.stop('SIGINT');
    await server.close();
}

// Enable graceful stop
process.once('SIGINT', async () => {
    await shutdown();
})
process.once('SIGTERM', async () => {
    await shutdown();
})