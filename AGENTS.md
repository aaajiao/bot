# Maintenance conventions

- Preserve the existing public players, artwork content and administrative editing workflows.
- Exact public read routes may bypass authentication; editing and uploads must require authenticated access.
- Persist token revocations across application restarts. Never commit credentials, tokens, private configuration, uploads, database contents or revocation state.
- Use isolated fixtures for mutation tests. Do not create, delete or change live artwork content merely to test an endpoint.
- Synchronize production source, deployment recipes and maintenance changes with this repository, and record the verified deployment revision. Do not leave permanent fixes only inside a running container.
- Keep root SSH access as configured. Keep certificate renewal and bounded log rotation; do not introduce scheduled monitoring without a new request.
