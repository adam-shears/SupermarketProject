# Supermarket Project

This is a web-app built for an online only supermarket as part of UoL's COMP2850 Final Project

## Tech Stack
<p align="center">
  <img width="320" height="50" alt="SupermarketProjectTechStack" src="https://github.com/user-attachments/assets/5114b8d4-5887-4ee8-afc7-86c657c86605" />
</p>
We have chosen this tech stack as a team for multiple reasons, each unique to the specific language/framework chosen.

### JS/Node.js
On balance we felt more comfortable as a group working with JS. With JS being chosen as the backend language, Node.js became an obvious choice for the runtime environment.
Node.js is extremely well suited for I/O bound systems and with its large ecosystem and general simplicity for quicker development, we determined that it would be a better fit for a time-limited project with lots of API calls and DB lookups.

### PostgreSQL
Postgres supports transactions, which is important for our system. Many DB operations in a supermarket system are likely to affect multiple tables and we don't want to leave tables in a half complete state. Additionally, MVCC allows Postgres to handle concurrent transactions without an abundance of locking, which increases performance. Furthermore, sometimes locking is necessary to prevent two users trying to write to the same row in common race conditions. Postgres allows for row-level locking while a transaction completes, so that multiple transactions cannot edit the same row at the same time.

### Docker
In modern system design, containerisation is industry norm. Microservices offer significant advantages (such as those in fault isolation, where if one service fails, the others can continue to function), and they also tend to force a more rigid separation of concerns, which we feel would lead to less pain later when refactoring parts of the architecture.

## Architecture

The project is built on the concept of microservices and consists of:

- Analytics service (for the Management and Marketing section of the brief)
- Catalogue service (for product listings as part of the E-Commerce section of the brief)
- Orders service (for creating orders and managing them as part of the E-Commerce section of the brief)
- Warehouse service (for the Warehousing section of the brief)
- A PostgreSQL database (for each service)

The [Project Brief](https://github.com/adam-shears/SupermarketProject/Project_Brief.pdf) can be found in the repo root for details of each section.

## Building the Project

> [!IMPORTANT]
> This section outlines the steps to install our prerequisites, clone the repository, and build the project. Please read to the end and ensure you don't skip any steps.
> If you encounter difficulties, please refer to the [Troubleshooting](https://github.com/adam-shears/SupermarketProject/tree/main?tab=contributing-ov-file#troubleshooting) section of the contributing guidelines.

> [!NOTE]
> During our testing, we found that the project is not compatible with the Bragg Linux machines as they don't have Docker installed and the version of Podman running on them didn't seem to be compatible with using network file storage. The project **can** run on these machines but you will have to use Codespaces. When using Codespaces, please use the npm wrapper commands with `:cs` appended to them (i.e. `npm run up:cs`) otherwise you will encounter Docker versioning issues. For more information, see [Troubleshooting](https://github.com/adam-shears/SupermarketProject/blob/main/CONTRIBUTING.md#docker-client-version-too-new-codespaces)

### Quick Start Steps
If you already have Docker installed and prefer to work locally, the project can be built and run simply by executing the following commands:
```bash
git clone https://github.com/adam-shears/SupermarketProject.git
cd SupermarketProject
cp .env.example .env
docker compose up --build
```
This is recommended for some users, but be aware that we can't make guarantees for every unique system and environment. If you encounter issues with your local setup, or don't know whether you have Docker, please follow the installation steps below (in order).

### Prerequesites

#### Docker
Below, you can find the links to Docker's installation guidelines. Please head to the link corresponding to your current operating system and follow the instructions there - we cannot guarantee a working environment if the Docker install steps aren't followed.

**Windows**

> https://docs.docker.com/desktop/setup/install/windows-install/

**macOS**

> https://docs.docker.com/desktop/setup/install/mac-install/

**Linux**

> https://docs.docker.com/engine/install/

After downloading and installing Docker, you should verify your installation in the command line. Open a terminal and run these two commands separately:

```bash
docker --version
```
and
```bash
docker compose version
```
You should see version numbers printed in the terminal. If you don't, or if you see errors, then Docker is not installed correctly and you should follow Docker's Troubleshooting Guidelines ([Windows/macOS](https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/) | [Linux](https://docs.docker.com/engine/daemon/troubleshoot/))

#### Visual Studio Code
Installation link:
> https://code.visualstudio.com/download

> [!TIP]
> When installing VS Code, it's useful to add the code extension to your PATH so that it can be executed from the command line

### Cloning the Repository
After installing VS Code, you can now clone the repository. Open a terminal and run the following command:
```bash
git clone https://github.com/adam-shears/SupermarketProject.git
```
After clone has finished running, you should change your working directory to the repository by running the following command:
```
cd SupermarketProject
```
If your terminal prompt shows you in `SupermarketProject`, please continue.

### Dev Environment

> [!IMPORTANT]
> The project uses a devcontainer so that tools are consistent across different computers and operating systems. These steps assume that VS Code is installed and functional

#### Initial Setup

1. Open VS Code
2. Navigate to the Extensions Marketplace (`ctrl` + `shift` + `X` by default)
3. Install the "Dev Containers" extension
   ![The Dev Containers extension as seen in VS Code extensions marketplace](https://i.ibb.co/5gbRpMvN/image.png)
4. Open this repository in VS Code (File -> Open Folder -> select `SupermarketProject`)
5. When prompted (usually bottom right), click "Reopen in container"

> [!TIP]
> If you aren't given a prompt, you don't need to reopen the repository. Simply press `ctrl` + `shift` + `p` and look/search for `Dev Containers: Rebuild and Reopen in Container`

> [!NOTE]
> This will take a while to run. A new VS Code window with the repository should open.
> If you encounter errors at this stage, you should refer to [Microsoft's guidelines for Dev Containers in VS Code](https://code.visualstudio.com/docs/devcontainers/containers)

Once in the container, you will have access to a Debian-based environment with common tools for all team members.
You may need to create a new terminal (`ctrl` + `shift` + `'` by default) to be able to use commands, if you don't see one when the container finishes loading.

### Configuring Environment Variables
> [!IMPORTANT]
> The build scripts rely on having a `.env` file configured in your workspace. The project will not function without a `.env`.
> We provide `.env.example` to facilitate this.

In the VS Code terminal, execute the following command:
```bash
cp .env.example .env
```
You should now see a new file called `.env` appear in your file explorer.

### Running the Project

To build the services for the first time, you can run the following command in the VS Code terminal:
```bash
docker compose up --build
```
After running this command, wait until you see the following line in the terminal:
```bash
db-1    | ... [1] LOG: database system is ready to accept connections
```
This means that the database has built successfully.
If you don't see this or see errors instead, please ensure the command was executed from the repo root and that you created a `.env` file.

At this point, head to http://localhost:3000 in your regular browser to access the site.

---

To stop the services, you can run:
```bash
docker compose down
```

To restart the services, you can run:
```bash
docker compose up
```

If you need a hard reset (i.e. resetting the DB), you can run:
```bash
docker compose down -v
```

> [!TIP]
> npm wrappers are provided for these commands in `root/package.json`
>
> ```bash
> npm run up = docker compose up --build
> npm run down = docker compose down
> npm run reset = docker compose down -v
> ```

## Accessing Restricted Features
To maintain security, some API endpoints and views require administrator access and will return a `403` error to a user without proper authorisation. To access these features for testing, we provide a seeded superuser account with access to everything:
Email: `root@supermarket.com`
Password: `Password1!`

Upon logging in, you'll have access to the staff portal ([`/staff-portal`](http://localhost:3000/staff-portal)), where you can access restricted views:
- [Analytics (`/management`)](http://localhost:3000/management)
- [Staff Management (`/staff-management`)](http://localhost:3000/staff-management)
- [Inventory Management (`/inventory`)](http://localhost:3000/inventory)
- [Promotions Management (`/manage-promotions`)](http://localhost:3000/manage-promotions)

If you wish to create a Manager or Warehouse Picker, navigate to [Staff Management](http://localhost:3000/staff-management) and fill in the details to register a new staff member (the email must end with `@supermarket.com`). There is a drop-down selector to choose between registering a Picker or a Manager. Once you've registered a new staff member, you can continue using the superuser for access to everything, or switch to the new account you registered. Keep in mind that Pickers will not have access to the above links, as they are for Managers only.

The view for Warehouse Pickers is located at [`/picker`](http://localhost:3000/picker). Managers and the root superuser can access this view, but it isn't exposed on their UI since it isn't for their workflow - they will also be unable to see orders on this view.

> [!IMPORTANT]
> When on the picker view, you will only be shown orders assigned to you.

Orders cannot be assigned to a Manager or above. To assign an order to your picker, head to [`/staff-management`](http://localhost:3000/staff-management) and pick any order in the "Assign Picker to Order" section. Use the drop down to assign it to a picker, and then that order will appear in the corresponding picker's personal picker view.

## Testing
Unit tests are implemented with mocha, using sinon for stubs and chai for assertions.

To run the full test suite:
```bash
npm run test
```

To run the test suite for a specific service:
```bash
npm run test:<service name>
```

# Notes

> [!WARNING]
> Never commit .env files or credentials

Credentials, such as those for accessing the database, should be stored in a local `.env` file. `.env.example` is provided as an example of the layout that should be used. You can set username and password to whatever you want, since these credentials will be initialised when you first run `docker compose up`.
Although this is unsecure for production, this is a purposeful tradeoff we have made to demonstrate understanding of good practice, while prioritising simplicity and faster development.
