## 2024-04-06 - [Email Validation Added to Auth Screens]
**Vulnerability:** Missing input validation on client-side registration and login forms allowed arbitrary strings (including non-email formats) to be submitted to the backend as emails.
**Learning:** React Native form state must implement input constraints (like basic regex validation) before calling the backend auth store.
**Prevention:** Always implement basic regex validation on login/registration screens to fail fast and securely before executing API requests or dispatching to Zustand stores.
