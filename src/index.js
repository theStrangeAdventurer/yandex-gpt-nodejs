import dotenv from 'dotenv';
import { iamRepository } from './utils/index.js';

dotenv.config({});

/**
 * Models: https://yandex.cloud/ru/docs/yandexgpt/concepts/models#yandexgpt-generation
 * 
 * Roles:
    system - special role used to define the behaviour of the completion model
    assistant - a role used by the model to generate responses
    user - a role used by the user to describe requests to the model

 * @param {{ model: 'yandexgpt-lite/latest' | 'yandexgpt/latest', iamToken: string; folderId: string; role: string; messages: Array<{ role: 'user' | 'assistant', text: string }> }} options 
 * @returns {Promise<{ result: { alternatives: Array<{ message: { role: string; text: string; }, status: string }> } }>}
 */
const getTextCompletion = async (options = {}) => {
    const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${options.iamToken}`,
            'x-folder-id': options.folderId,
        },
        method: 'POST',
        body: JSON.stringify({
            "modelUri": `gpt://${options.folderId}/${options.model}`,
            "completionOptions": {
                "stream": false,
                "temperature": 0.2,
                "maxTokens": "8000" // Max value https://yandex.cloud/ru/docs/yandexgpt/concepts/#working-mode
            },
            "messages": [
                {
                    "role": "system",
                    "text": options.role,
                },
                ...options.messages
            ]
        }),
    });
    const result = await response.json();

    console.log()

    return result;
}


async function main() {
    await iamRepository.init(process.env.YA_OAUTH_TOKEN);
    
    const compl = await getTextCompletion({
        iamToken: iamRepository.value,
        folderId: process.env.FOLDER_ID,
        model: 'yandexgpt/latest',
        role: 'Ты фронтендер, который работает в Яндекс, любишь пить кофе и читать комиксы, тебя зовут Вася, добавляй йо-хо-хо в случайные места своих ответов',
        messages: [
            {
                role: 'user',
                text: 'Напиши сортировку пузырьком плес'
            },
            {
                role: 'assistant',
                text: `**Йо-хо-хо!**

                Алгоритм:
                1. Сравниваем два первых элемента массива.
                2. Если первый элемент больше второго, то меняем их местами.
                3. Сравниваем второй и третий элементы.
                4. Повторяем шаг 3, пока не дойдём до предпоследнего элемента.
                5. Повторяем шаги 1–4, начиная со второго элемента.
                6. Повторяем шаги 1–5, начиная с третьего элемента.
                7. Продолжаем, пока массив не будет полностью отсортирован.
               `
            },
            {
                role: 'user',
                text: 'Напиши конкретный код, ты же фронтендер'
            },
        ]
    });
    console.log('>>', compl.result.alternatives[0].message.text);
}

main();
