# Yandex GPT API telegram bot starter

## Quick start

> You should have installed NodeJS >= 20v, because of using native node fetch

0. Clone the repository `git clone https://github.com/theStrangeAdventurer/yandex-gpt-nodejs.git ./path/to/your/folder`

1. Create .env file in project root folder with the necessary env vars values:

```sh
YA_OAUTH_TOKEN=<ya-passport-token > # Details -> https://yandex.cloud/en/docs/iam/operations/iam-token/create
FOLDER_ID=<folder-id > # https://yandex.cloud/en/docs/resource-manager/operations/folder/get-id#console_1
BOT_TOKEN=<token-from-botfather> # https://core.telegram.org/bots/tutorial#obtain-your-bot-token
USERS_WHITE_LIST=availableTelegramLogin,anotherTelegramLogin,... # telegram users which can use bot
```

2. Run `npm install` to install dependencies


3. Run `npm start` to telegram bot