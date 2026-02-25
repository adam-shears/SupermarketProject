# Supermarket Project

This is a web-app built for an online only supermarket as part of UoL's COMP2850 Final Project

## Tech Stack
<p align="center">
  <img width="320" height="50" alt="SupermarketProjectTechStack" src="https://github.com/user-attachments/assets/5114b8d4-5887-4ee8-afc7-86c657c86605" />
</p>

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
