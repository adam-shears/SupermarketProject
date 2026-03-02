# Supermarket Project

This is a web-app built for an online only supermarket as part of UoL's COMP2850 Final Project

## Tech Stack
<p align="center">
  <img width="320" height="50" alt="SupermarketProjectTechStack" src="https://github.com/user-attachments/assets/5114b8d4-5887-4ee8-afc7-86c657c86605" />
</p>
We have chosen this tech stack as a team for multiple reasons, each unique to the specific language/framework chosen.  

### JS/Node.js
Despite some Kotlin knowledge being present in the team, on balance we felt more comfortable as a group working with JS. With JS being chosen as the backend language, Node.js became an obvious choice for the runtime environment.  
Our reasons for choosing JS and Node.js are not just about being more comfortable, however. While a Kotlin backend offers many advantages relating to type safety that potentially make it more stable for large enterprise systems, Node.js is extremely well suited for I/O bound systems and with its large ecosystem and general simplicity for quicker development, we determined that it would be a better fit for a time-limited project with lots of API calls and DB lookups.  
Additionally, according to CoderPad's Report on the State of Tech Hiring in 2024[^1], 41.57% of recruiters work for a company that has high demand for JavaScript. This is opposed to just 6.06% for Kotlin. With frameworks, Node.js was the 2nd most in-demand framework after React with 24.33% of recruiters working for companies with high demand for Node.js developers. Based on these statistics, we decided that JS/Node.js is more in-demand in current industry than Kotlin and that completing this project with a Node backend would more accurately reflect current industry preferences.

### PostgreSQL
Postgres was a natural choice for the database. Based on the project requirements, we identified several aspects where using Postgres provides significant advantages. Postgres supports transactions, which is important for our system. Many DB operations in a supermarket system are likely to affect multiple tables and we don't want to leave tables in a half complete state. One could imagine a simple order being placed. The stocking table would have to be updated, the orders table would have to be updated, analytics related tables may need to be updated. These require multiple different SQL commands, but if one of them fails (perhaps because there isn't enough stock) then the others should not go through. With Postgres transactions, these multiple commands can be wrapped in one transaction block so that if one fails, they all fail. This prevents any half-completed orders appearing in the database. Additionally, Postgres supports column constraints (such as check constraints to check stock level > 0).  
Seprating Postgres from other DB systems, however, is its Multiversion Concurrency Control. In a real supermarket platform, multiple users would be accessing the database simultaneously. MVCC allows Postgres to handle concurrent transactions without an abundance of locking, which increases performance. Furthermore, sometimes locking is necessary to prevent two users trying to write to the same row in common race conditions. Postgres allows for row-level locking while a transaction completes, so that multiple transactions cannot edit the same row at the same time.

### Docker
In modern system design, containerisation is industry norm. According to the CNCF Annual Survey 2023[^2], more than 90% of organisations are using containers. Similar to how we chose JS to align more closely with industry preference and norms while still being within our comfort zone, we chose to take a microservice approach based on comfort and professionalism. Although we haven't built a microservice architecture before, the comfort with microservices comes from the fact that it is generally easier to organise and maintain a separation of concerns across the project. Reflecting on our experiences with the Library Miniproject, some of us had a shared pain point that as different team members added to the project and it began to grow in scope, it became increasingly difficult to find where certain functions were and what was being referenced where. While microservices offer significant other advantages (such as those in fault isolation, where if one service fails, the others can continue to function), they also tend to force a more rigid separation of concerns, which we feel would lead to less pain later when refactoring parts of the architecture.

### Summary
Across all of these choices, our main concerns were
- Simplicity: how quickly can we implement this? how much extra does it force us to do?
- Maintainability: if we do this, can we continue to do it in a month? if we stopped working on this and a new team took over, would they understand what we've done?
- Team experience: what would allow everyone to contribute confidently? are we forcing anyone to do something they aren't familiar with?
- Industry relevance: is what we're doing aligned with how industry is going? would recruiters look at this like a university project or an enterprise-ready solution?

[^1]: [CoderPad and CodinGame State of Tech Hiring 2024](https://coderpad.io/survey-reports/coderpad-and-codingame-state-of-tech-hiring-2024/)
[^2]: [CNCF Annual Survey 2023](https://www.cncf.io/reports/cncf-annual-survey-2023/#:~:text=Container%20use%20,native%20rely%20on%20containers%20containers)

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
