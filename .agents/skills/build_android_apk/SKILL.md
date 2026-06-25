---
name: build_android_apk
description: Instructions for triggering, monitoring, and providing the download link for Expo EAS Android APK builds.
---

# EAS Android APK Builder Skill

This skill provides step-by-step instructions for initiating, tracking, and completing Expo Application Services (EAS) standalone Android APK builds for the handheld inventory scanner application.

---

## 1. Triggering the Build

When the user asks to compile, build, or update the Android APK:
1. Navigate to the `mobile/` directory: [mobile](file:///c:/Projects/inventory-system-app/mobile).
2. Check if the user is logged into Expo:
   ```powershell
   npx eas-cli whoami
   ```
3. If not logged in, request login using:
   ```powershell
   npx eas-cli login
   ```
4. Propose and trigger the build asynchronously as a background task. Since it takes several minutes on EAS servers, use the `run_command` tool in PowerShell:
   ```powershell
   npx eas-cli build --platform android --profile preview --non-interactive
   ```
   *Note: Use `WaitMsBeforeAsync` around `1000` to let the command launch, print the log URL, and yield control to the background task.*

---

## 2. Monitoring the Build

1. **Extract Log Link**: In the initial terminal output, look for the EAS build tracking link, e.g.:
   `https://expo.dev/accounts/shufunk/projects/mobile/builds/<build-id>`
2. **Notify User**: Inform the user immediately that the build has been submitted to EAS and provide them with the tracking link.
3. **Background Process**: Let the background task run. Because it executes on the EAS cloud server, you do not need to poll locally. The system will automatically wake up and notify you when the background task finishes.
4. If you need to check the current log status in the middle of a build, you can inspect the task log using `view_file` on the corresponding task log path.

---

## 3. Completing the Build

Once the background task completes, check the final stdout/stderr:
1. Look for the compiled APK artifact URL, e.g.:
   `https://expo.dev/artifacts/eas/<hash>.apk`
2. Present the final download link clearly to the user.
