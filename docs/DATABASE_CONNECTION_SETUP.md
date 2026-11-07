# Database connection setup

Talinturo's Flask backend connects to PostgreSQL through `DATABASE_URL` using `psycopg`. Choose the database that should hold your data, load `talinturo.sql` into that database, and set `DATABASE_URL` to connect to it.

> DBeaver and pgAdmin are database clients. They let you connect to a PostgreSQL server and execute the SQL file; they do not provide a PostgreSQL server themselves. For a local database, install and start PostgreSQL separately.

## Choose a connection route

| Situation | Recommended route | Database host |
| --- | --- | --- |
| You want a database running on this computer | Local PostgreSQL, managed with DBeaver or pgAdmin | `127.0.0.1` |
| You want Supabase and your network can reach IPv6 | Supabase direct connection | Host copied from the Supabase Connect panel |
| You want Supabase from an IPv4-only network | Supabase Session pooler | Pooler host copied from the Supabase Connect panel |

Supabase direct connections use IPv6 by default. If direct hostname resolution or connectivity fails on an IPv4-only network, the Session pooler supports IPv4. You do not have to create a local database just because the network is IPv4-only if the Supabase Session pooler is reachable. Choose local PostgreSQL when you specifically want the data stored on your computer or cannot reach Supabase from that network.

## Option A: Local PostgreSQL with DBeaver or pgAdmin

1. Install PostgreSQL locally and start its database service. Record the local PostgreSQL username and password.
2. In DBeaver or pgAdmin, connect to the local server at `127.0.0.1`, usually on port `5432`.
3. Create a **new, empty** database named `talinturo` (or choose another name and use it consistently below).
4. Open the project-root `talinturo.sql` in the SQL editor for that database and execute the complete script. In DBeaver, use **SQL Editor → Open SQL Script** and execute the script. In pgAdmin, open the database's **Query Tool**, load the file, and execute it.
5. In the project-root `.env`, set the local PostgreSQL connection values. For example:

   ```dotenv
   DATABASE_URL=
   PGHOST=127.0.0.1
   PGPORT=5432
   PGDATABASE=talinturo
   PGUSER=postgres
   PGPASSWORD=your-local-database-password
   ```

   Replace the example username/password with the credentials configured on your local PostgreSQL server. URL-encode reserved characters in the password. If the password includes `@`, `:`, `/`, `#`, `?`, or `%`, encode those characters before placing it in the URI.

6. Save `.env`, restart Flask, and confirm startup completes. The backend checks the database schema during startup. After Flask starts, open `http://127.0.0.1:5000/api/health` to check the active database connection.

The `talinturo.sql` dump contains `INSERT` statements for source database rows, including account-related data. Review and remove any private or unwanted rows before importing it. Run it against a new empty database; it is not a migration script for an older Talinturo database. Back up any database that already contains data before modifying it.

## Option B: Supabase PostgreSQL

1. Open the Supabase project and choose **Connect**.
2. Select **URI** and copy the connection string for the route you need:
   - Choose **Direct connection** when the machine running Flask supports IPv6 (or the project has IPv4 direct connectivity enabled).
   - Choose **Session pooler** for an IPv4-only network. Copy the pooler host and username from the dashboard; do not assemble them manually.
3. Replace the password placeholder with the Supabase **database password**, URL-encoding reserved characters. Keep all other values from the copied URI, including its host, port, username, database, and SSL options.
4. Put the complete URI in the project-root `.env` as `DATABASE_URL` and save it.
5. In Supabase's **SQL Editor**, open and run the project-root `talinturo.sql` against the intended project. Review and remove private or unwanted account rows first. Back up existing data; the dump is not a migration for an older schema.
6. Restart Flask and confirm startup completes. Then check `http://127.0.0.1:5000/api/health`.

The Flask backend connects to Supabase as PostgreSQL. It does not need a Supabase project URL, `anon`/publishable key, or `service_role`/secret key for this connection.

## Which `.env` setting the backend uses

- The backend always uses PostgreSQL. Set `DATABASE_URL` to a complete URI or leave it blank and configure `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD`.
- The backend loads the project-root `.env` from `backend/app.py`. Existing process-level environment variables take precedence over values in `.env`; restart Flask after changing either source.

Automated API tests require a separate, disposable PostgreSQL database whose name contains `test`. Set `TALINTURO_TEST_DATABASE_URL` to that database after running the data-free `talinturo_schema.sql` script in it. Tests truncate its application tables before each case; never point this setting at the database containing your application data.

Do not commit `.env`, paste a connection URI into chat, or share a screenshot that exposes its password. If the connection still fails, diagnose in this order:

1. **Name resolution (`getaddrinfo`, `NXDOMAIN`)**: confirm the exact hostname in the URI matches Supabase's Connect panel, confirm the project is active, and test DNS from the same network that runs Flask. For IPv4-only access to Supabase, try the Session pooler URI.
2. **Timeout or connection refused**: verify the server is running, the host and port are reachable, and local firewall/network rules allow the connection.
3. **Password authentication failed**: update the database password in the URI and URL-encode reserved characters.
4. **Schema validation error**: the connection succeeded, but the selected database is missing tables or columns. Run the current `talinturo.sql` on the intended empty database or apply an explicit migration.

See [ENVIRONMENT.md](ENVIRONMENT.md) for the other backend settings and [SETUP.md](SETUP.md) for running the full application.
