
/**
 * @returns {Promise<{ iamToken: string; expiresAt: string; }>}
 */
async function getIamToken(token) {
    const iamToken = await fetch('https://iam.api.cloud.yandex.net/iam/v1/tokens', {
        body: JSON.stringify({
            yandexPassportOauthToken: token
        }),
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data = await iamToken.json();
    return data;
}

export const iamRepository = {
    value: null,
    timer: null,
    async init(token) {
        const ONE_HOUR = 3600 * 1000;
        const setIamToken = async () => {
            const { iamToken } = await getIamToken(token);
            this.value = iamToken;
        };    
        await setIamToken();

        this.timer = setInterval(async () => {
            await setIamToken();
        }, ONE_HOUR);
    },
    destroy() {
        this.timer && clearInterval(this.timer);
    }
}

