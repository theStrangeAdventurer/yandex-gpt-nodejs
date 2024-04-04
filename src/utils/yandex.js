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

    return result;
}
