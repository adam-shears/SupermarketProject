# Supermarket Project - Contributing Guidelines

The purpose of this document is to outline expectations and guidelines that all team members should follow when contributing code to the project.

## Quick Start
> [!NOTE]
> 👉 Refer to the Building the Project section in the README for instructions to help with working locally.

## Main Principles
1. Keep the architecture clean
2. Maintain separation of concerns
3. Never commit `.env` files
4. Always test before merging
5. Never directly push to `main`

## Structure and Overview
### Backend
All backend services follow this structure:
`services/<service name>/src/`
within `src/` there are four JavaScript files.
- `db.js` - Responsible for rading/writing from/to the database
- `index.js` - Responsible only for Express setup
- `routes.js` - Responsible for handling HTTP requests
- `service.js` - Responsible for implementing business logic

---

### Frontend
The frontend service contains:
- `api.js` - Wrapper for HTTP requests to backend services
- `index.js` - Express and Nunjucks setup
- `routes.js` - Serving HTML based on the page requested

> [!NOTE]
> HTML templates are found in `services/frontend/views/` and style sheets are found in `services/frontend/styles/`

## Rules
> [!IMPORTANT]
> It is important for the maintainability of the repo and ease of development that everyone follows these principles when developing. Sticking to these principles means less refactoring later and smoother workflow as all logic is kept to the correct places.

### Backend
`db.js`
- Only contains SQL queries
- Should **never** contain business logic or validation (i.e. any checks, for instance checking that there is stock available, should be handled by `service.js`. `db.js` should just give `service.js` the data it needs)

`index.js`
- Only responsible for server setup
- Should **never** contain business logic or SQL

`routes.js`
- Defines API endpoints
- Extracts data from requests and performs basic validation
- Delegates all logic to `service.js`
- Returns data to the requester
- Should **never** contain business logic, SQL, or call `db.js` directly

`service.js`
- Responsible for business logic
- If data is needed, call `db.js`
- Should **never** contain raw SQL

---

### Frontend
`api.js`
- Makes requests to backend services
- Should **not** contain backend logic

`index.js`
- Only responsible for setup
- Should **never** contain backend logic

`routes.js`
- Handles all browser traffic
- If backend services are needed, request them via `api.js`
- Renders HTML templates
- Should **never** directly implement business logic (this belongs in the backend), but can do logic relating to page redirects

## Development Workflow
### Branching Strategy
Branches should be created for each feature/task as represented on the Project Board.
Naming conventions for branches:
- `feat/<name of feature>`
- `fix/<name of bug>`

### Commits
Keep commit messages descriptive but simple. We use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) to maintain consistency across the project.

Commits should be written in the imperative form, i.e. "Fix bug" **not** "Fixes bug". As a rule of thumb, the commit message should make sense in this sentence: "If applied, this commit will _\<your subject line\>_"
Commit messages be written in the form `<type>[optional scope]: <description>`. Type should be one of the following, based roughly on [Angular conventions](https://github.com/angular/angular/blob/22b96b9/CONTRIBUTING.md#-commit-message-guidelines) and adapted for our project:
- `chore`: Minor and routine maintenance changes that don't affect functionality
- `ci`: Changes to the CI config in GitHub Actions
- `docs`: Changes to documentation only
- `feat`: New features
- `fix`: Bug fixes
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `style`: Changes which only affect code style/formatting

EXAMPLES:
```bash
feat(warehouse): implement stock editor
docs: add new issue to troubleshooting section
fix(orders): stop confirming orders when stock isn't available
chore: ignore .vscode
```

### Must-Know Commands
- Start
```bash
docker compose up --build
```
- Stop
```bash
docker compose down
```
- Reset DB
```bash
docker compose down -v
```
- Logs
```bash
docker compose logs -f <service name>
```

### Pull Requests and Code Review
To merge any change into `main`, you must open the change as a Pull Request. To merge to `main`, at least one teammate must review and approve the changes. Preferably, this should be a teammate who did not work on the change and can therefore approach it with fresh eyes.

PRs should:
- [ ] Have a clear title
- [ ] Describe the changes
- [ ] Explain how to test the changes
- [ ] Include screenshots for any frontend changes

### Adding Features
> [!TIP]
> This section has been written to be a helpful step-by-step quick reference for the end-to-end flow of adding a new feature.
> For demonstration purposes only, this example describes how an Add to Basket button may be implemented.

0. Choose where the feature should "live"
- UI belongs in frontend
- Logic and data rules belong in backend
  - Analytics for computing statistics for the management/sales view
  - Catalogue for finding product info and details
  - Orders for anything related to ordering or checking out
  - Warehouse for anything related to stock movement or picking
1. Add the UI to the relevant template (as an example, `services/frontend/views/product.njk`) by adding a form and submit button. The form posts to a frontend route such as `POST /basket/add`
2. In `services/frontend/src/routes.js`, ensure that the route has been configured. Add `router.post("/basket/add", ...)` and perform **basic** checks. In this example, we need data from the backend to get the price. Call the frontend's `api.js`
3. In `services/frontend/src/api.js`, add a function to `api` that calls the required backend endpoint. For example:
   ```javascript
   getPrice: (productID) => getJson(`${CATALOGUE_URL}/products/${productID}/price`),
   ```
> [!NOTE]
> In the actual system, this would be redundant as the frontend would require all product details anyway (including the price), this is an example. Always prefer a general endpoint as opposed to lots of specifics.
4. Implement the route in the corresponding backend service. In `services/catalogue/src/routes.js`, define a `GET` request for `/products/:productID/price` which performs basic HTTP validation and calls `service.js`
5. In the backend service's `service.js`, implement a function that the backend service's `routes.js` will call when handling the `GET` request
6. In this new function, call `db.js`
7. In `db.js`, write an SQL query to return the price of a given product ID

## Environment Variables
> [!CAUTION]
> Never commit `.env` or credential files

If you introduce new environment variables, ensure that `.env.example` is kept up to date.
For database credentials, feel free to use whatever you like locally.

## Database
> [!IMPORTANT]
> All schema changes should go in `db/migrations`
> Don't edit existing migrations after they've been merged
> Create new migrations for any schema change

## API Conventions
Appropriate HTTP status codes should always be used
- `200` OK
- `201` Created
- `202` Accepted
- `400` Bad Request
- `403` Forbidden
- `404` Not Found
- `500` Internal Server Error

A full list can be found [here](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)

## Definition of Done
Stories and issues are considered **done** when **all** of the following are true:

### Working & Verified
- Acceptance criteria manually checked
- At least one failure case handled
- No crashes - errors return meaningful responses

### Code Quality
- Naming and formatting follow standards
- Code passes linters and is formatted (ESLint + Prettier)
- Route is thin (no business logic in the routing)
- No obvious duplicated logic

### Testing
- At least one automated test OR
- A written manual test checklist

### Pull Request & Integration
- Opened as a PR
- At least one teammate reviewed
- Reviewer confirmed
  - Code is understandable
  - Code meets the definition of done as defined here
  - Code doesn't break existing functionality
- PR builds and runs locally before merging

## Troubleshooting
> [!IMPORTANT]
> If you encounter a setup issue or some other problem with the repo that you fix, add it here so that other teammates can benefit from it.

### SELinux DB Issues
On Fedora and other SELinux distros, you may encounter permission issues while binding the database. To fix this, create a docker override:
```bash
cp docker-compose.yml docker-compose.override.yml
```
In the `db:` section, add `:Z` to the bind mount:
```yaml
db:
  ...
  volumes:
    - pgdata:/var/lib/postgresql/data
    - ./db/migrations:/docker-entrypoint-initdb.d:ro,Z
```

### Docker Client Version Too New (Codespaces)
In Codespaces, the Docker client is too new for the Docker daemon and `docker compose up --build` fails. If you receive an error like:
```bash
Error response from daemon: client version X is too new. Maximum supported API version is Y: driver not connecting
```
Please use the provided npm wrapper in place of `docker compose up --build`:
```
npm run up:cs
```

## Notes

Keep things simple and clean. If you're ever unsure where something belongs,
- Ask the team
- Prefer the stricter separation of concerns

