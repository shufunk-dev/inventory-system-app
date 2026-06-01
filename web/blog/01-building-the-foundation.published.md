# Building the Foundation: An AI-Driven Inventory System

Welcome to the developer journal! This project started as a simple idea: what if we could take pictures of items and have an AI automatically categorize, tag, and build an inventory system for us?

## The Stack
We decided to build this using a modern, robust architecture:
- **Next.js 16** for the web dashboard and backend API.
- **SQLite** for a fast, portable database that requires zero configuration.
- **React Native (Expo)** for the mobile application.

## The Journey So Far
In our first major sprint, we tackled some incredibly complex challenges:
1. We built a background worker pipeline that queues images and sends them to Google Lens and Numista APIs.
2. We conquered multi-tenancy in SQLite, ensuring that when the software is distributed, each user gets their own isolated categories without hitting global constraint errors.
3. We implemented a sleek "Root Backdoor" architecture, ensuring the original developer maintains absolute control over the appliance no matter where it is deployed.

Stay tuned as we continue to push the boundaries of what this system can do!
