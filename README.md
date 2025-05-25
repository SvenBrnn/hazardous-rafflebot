# hazardous-raffle-bot

The bot was developed by [SvenBrnn](https://zkillboard.com/character/694883910/), ISK donations are always welcome if you like my work ;)

## Commands

| key                            | description                                                                                       |
|--------------------------------|---------------------------------------------------------------------------------------------------|
| /hraffle start (provide_codes) | Start a raffle in the channel, provide codes to be used for the raffle (optional)                 |
| /hraffle end                   | End the current raffle in the channel                                                             |
| /hraffle list                  | List all raffles in the channel                                                                   |

## Develop

### Requirements:

- docker
- docker-compose


### Startup (dev):

- run `copy the env.sample to .env and fill out params`
- run `docker-compose up`

### Startup (prod):
 
- run `copy the env.sample to .env and fill out params`
- run either `docker-compose -f ./docker-compose.prod.yaml up`

### Build (prod):
 
- run `cd src && docker-compose -f ./docker-compose.prod.yaml build`

### Config:

#### Environment

| key                | description                        |
|--------------------|------------------------------------|
| DISCORD_BOT_TOKEN  | Your discord bot token             |
| DISCORD_CLIENT_ID  | Your discord application client id |

## Licence 
Copyright 2025 SvenBrnn

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
