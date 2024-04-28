import FormData from 'form-data';
import axios from 'axios';

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
export const getTextCompletion = async (options = {}) => {
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

    if (result.error) {
        throw new Error('getTextCompletion error: ' + result.error);
    }

    return result;
}

/**
 * Распознавание речи через Yandex Speech Kit
 * https://cloud.yandex.ru/docs/speechkit/quickstart
 * @param {ArrayBuffer} buffer голосовое сообщение в виде ArrayBuffer
 * @param {string} token
 * @param {'ru' | 'en'} lang 
 * @returns {string}
 */
export const recognizeVoice = async (buffer, token, lang = 'ru-RU') => {
    const response = await fetch(`https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?folderId=${process.env.FOLDER_ID}&lang=${lang}`, {
        method: 'post',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        },
        body: buffer
      });
    const data = await response.json();
    if (data?.error_code) {
        console.log('\nreceived error, ignore...', { data });
        // throw new Error(data?.error_message || data?.error_code);
    }
    return data?.result || '';
};

export const vocalizeText = async (text, token, lang = 'ru-RU') => {
    const formData = new FormData();
    // https://cloud.yandex.com/en/docs/speechkit/tts/voices
    
    let voice = 'ermil';
    let emotion = 'good';

    formData.append('emotion', emotion);
    formData.append('text', text);
    formData.append('lang', lang);
    formData.append('voice', voice);
    formData.append('format', 'mp3');
    formData.append('folderId', process.env.FOLDER_ID);
   
    const headers = {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders(),
    };

    const response = await axios.post('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize', formData, {
        headers,
        responseType: 'arraybuffer'
    });

    return response.data; 
}