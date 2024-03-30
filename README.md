# Yandex GPT API example

## Quick start

> You should have installed NodeJS >= 20v, because of using native node fetch

1. Create .env file in project root folder with necessary env vars values:

```sh
YA_OAUTH_TOKEN=<ya-passport-token > # Details -> https://yandex.cloud/en/docs/iam/operations/iam-token/create
FOLDER_ID=<folder-id > # https://yandex.cloud/en/docs/resource-manager/operations/folder/get-id#console_1
```

2. Run `npm install` to install dependencies


3. Run `npm start` to run test request