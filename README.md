# Yandex GPT API telegram bot starter


### prerequisites
- You should have installed NodeJS >= 20v, because of using native node fetch and experimental --watch mode
- You also should configure ssl for localhost and configure https tunnel using any available tool (for example ngrok). See [Certs](#certs) section
- You should choose convinient way for deploy static web app application (for example i am using S3 storage, you can use github pages or something else). See `package.scripts.webapp:deploy` script for configure deploy your way

## Quick start

0. Clone the repository `git clone https://github.com/theStrangeAdventurer/yandex-gpt-nodejs.git ./path/to/your/folder`

1. Create .env file in project root folder with the necessary env vars values:

```sh
YA_OAUTH_TOKEN=<ya-passport-token > # Details -> https://yandex.cloud/en/docs/iam/operations/iam-token/create
FOLDER_ID=<folder-id > # https://yandex.cloud/en/docs/resource-manager/operations/folder/get-id#console_1
BOT_TOKEN=<token-from-botfather> # https://core.telegram.org/bots/tutorial#obtain-your-bot-token
USERS_WHITE_LIST=availableTelegramLogin,anotherTelegramLogin,... # telegram users logins which can use bot
WEB_APP_URL=<any-valid-https-url-where-your-app-located> # you can use s3 storage or github pages, or whatever you want to serve static site (telegram mini app which located in react-app directory)
VITE_WS_HOST=<any-valid-host-where-your-fastyfy-server-located> # www.example.com (without https://) You can use ngrok for local https tunnel or deploy your app  to any server (see CERTS section below)
```

2. Run `npm install` to install dependencies

3. Run `npm start` to start telegram bot and fastify websocket server

# CERTS
1. Localhost cert.

For localhost https certs you should use [MKCERT](https://github.com/FiloSottile/mkcert)

Application expect two files located in cert folder:
- `localhost-key.pem`
- `localhost.pem`

2. https tunnel
For testing telegram miniapp functionality you must have https tunnel for testing app without deploy bot (src directory). 