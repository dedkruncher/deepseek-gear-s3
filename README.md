# DeepSeek for Samsung Gear S3

A companion-based DeepSeek client for Samsung Gear S3 Frontier.

## Architecture

- `watch/`: Tizen web app running on the watch.
- `android/`: Android companion app running on the Galaxy phone.
- The phone stores the DeepSeek API key and makes requests to the DeepSeek API.

## Current stage

Initial text-chat prototype. Voice input and device-to-device transport will be added after the basic app flow is verified.

## Security

Never commit API keys or other secrets to this repository.
