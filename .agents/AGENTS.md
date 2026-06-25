# Project Rules & Customizations

This file outlines project-specific rules, guidelines, and automation instructions for the Inventory System codebase.

---

## 1. Standalone Android APK Builds

When requested to compile, build, or deploy a new Android APK for the handheld scanner application:
- Always check the `mobile/` directory: [mobile](file:///c:/Projects/inventory-system-app/mobile).
- Verify the Expo user status with `npx eas-cli whoami` (default account: `shufunk`).
- Trigger the EAS build asynchronously using:
  ```powershell
  npx eas-cli build --platform android --profile preview --non-interactive
  ```
- Extract the build log URL (e.g., `https://expo.dev/accounts/shufunk/projects/mobile/builds/...`) from the initial command output and report it to the user.
- Allow the build to run in the background. Once the task completes, parse the output for the `.apk` download URL (e.g., `https://expo.dev/artifacts/eas/...apk`) and provide it to the user.
