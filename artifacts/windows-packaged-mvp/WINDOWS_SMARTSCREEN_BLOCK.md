# Independent Windows validation — blocked by SmartScreen policy

The unsigned portable build was transferred to an independently managed Windows machine and verified before launch.

- File: `Power-BI-RDL-Copilot-0.0.1-windows-x64-portable.exe`
- Size: 89,624,083 bytes — PASS
- SHA-256: `5e47a34583a09d2669d5220ed58c70ca9ff7e7ac59403066534fcd0fa051c50b` — PASS
- EXE transfer: PASS
- Windows launch attempt: BLOCKED BY DEVICE SECURITY POLICY
- Application execution: NOT REACHED
- Report generation: NOT TESTED
- Report Builder validation: NOT TESTED
- Packaged MVP acceptance: PENDING

Observed message:

```text
Windows protected your PC
Microsoft Defender SmartScreen prevented an unrecognized app from starting.

App:
Power-BI-RDL-Copilot-0.0.1-windows-x64-portable.exe

Publisher:
Unknown publisher
```

The managed device did not provide a **Run anyway** option. This is an external policy block, not evidence that the application started or failed at runtime. The validation procedure must not weaken or bypass the device's security policy.
