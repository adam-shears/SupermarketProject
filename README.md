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
> Ensure you have the necessary prerequisites before continuing, these steps should not be skipped

> [!NOTE]
> During our testing, we found that the project is not compatible with the Bragg Linux machines as they don't have Docker installed and the version of Podman running on them didn't seem to be compatible with using network file storage. The project **can** run on these machines but you will have to use Codespaces. When using Codespaces, please use the npm wrapper commands with `:cs` appended to them (i.e. `npm run up:cs`) otherwise you will encounter Docker versioning issues. For more information, see [Troubleshooting](https://github.com/adam-shears/SupermarketProject/blob/main/CONTRIBUTING.md#docker-client-version-too-new-codespaces)

### Prerequesites

#### Docker

**Windows**:

> https://docs.docker.com/desktop/setup/install/windows-install/

**macOS**

> https://docs.docker.com/desktop/setup/install/mac-install/

**Linux**

> https://docs.docker.com/engine/install/

Verify your install in the command line:

```bash
docker --version
docker compose version
```

#### VS Code

> https://code.visualstudio.com/download

> [!TIP]
> When installing VS Code, it's useful to add the code extension to your PATH so that it can be executed from the command line

### Cloning the Repository

```bash
git clone https://github.com/adam-shears/SupermarketProject.git
cd SupermarketProject
```

### Dev Environment

> [!IMPORTANT]
> The project uses a devcontainer so that tools are consistent across different computers and operating systems. These steps assume that VS Code is installed and functional

#### Initial Setup

1. Open VS Code
2. Install the "Dev Containers" extension
   ![The Dev Containers extension as seen in VS Code extensions marketplace](https://i.ibb.co/5gbRpMvN/image.png)
3. Open this repository in VS Code
4. When prompted (usually bottom right), click "Reopen in container"

> [!TIP]
> If you aren't given a prompt, you don't need to reopen the repository. Simply press `ctrl` + `shift` + `p` and look/search for `Dev Containers: Rebuild and Reopen in Container`

> [!NOTE]
> This will take a while to run

Once in the container, you will have access to a Debian-based environment with common tools for all team members.

### Running the Project

To build the services for the first time, you can run:

```bash
docker compose up --build
```

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

## Notes

> [!WARNING]
> Never commit .env files or credentials

Credentials, such as those for accessing the database, should be stored in a local `.env` file. `.env.example` is provided as an example of the layout that should be used. You can set username and password to whatever you want, since these credentials will be initialised when you first run `docker compose up`.
Although this is unsecure for production, this is a purposeful tradeoff we have made to demonstrate understanding of good practice, while prioritising simplicity and faster development.
