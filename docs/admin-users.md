# Adding admin users without the web UI

Admin rights in Your Priorities are per object, not a global flag: a user is
an admin of a particular domain, organization, community or group. The
scripts below write those rows directly. They are compiled into the image at
`/app/server_api/dist/scripts/` and use the container's database settings, so
they run from a shell inside a running `app` container.

## Open a shell in the container

```sh
dalmatian service container-access -i <infrastructure> -e <staging|prod> -s app
cd /app/server_api
```

Check the environment before running anything: staging and prod share an AWS
account, and it is easy to add a user to the wrong one.

## Create a user and make them a domain admin

Fill in the email, name and domain ID, paste the line, then type the password
at the prompt:

```sh
export E='user@example.invalid' N='Full Name' D=1; read -rsp 'Password: ' P; echo; node dist/scripts/users/createUserAddDomain.js "$D" "$E" "$N" "$P" && node dist/scripts/setDomainAdmin.cjs "$E" "$D"; unset P
```

This creates the user with a bcrypt-hashed password, adds them to the domain
as a member, then makes them its admin. The second step only runs if the
first succeeds.

Keep the `export` and the `;` after it. Written as `E=... D=1 read ...` the
variables only exist for `read`, both scripts get empty arguments, and
`createUserAddDomain.js` prints its usage line and exits.

A successful run ends with:

```
info: User <email> created and added to domain <name>
info: Found user <name>
info: Adding admin user for: <name>
info: Finished
```

`read -s` keeps the password out of shell history, but it is passed to the
first `node` process as an argument. Ask the user to change it after their
first login.

## Make an existing user a domain admin

If the user already exists, for example because they registered or signed in
with SSO, `createUserAddDomain.js` stops with
`User with email ... already exists`. Run only the admin step:

```sh
node dist/scripts/setDomainAdmin.cjs 'user@example.invalid' <domainId>
```

## Find the domain ID

```sh
node -e "import('./dist/models/index.cjs').then(m=>m.default.Domain.findAll({attributes:['id','name','domain_name']})).then(r=>{console.table(r.map(d=>d.toJSON()));process.exit()})"
```

## Other scopes

| Script | Effect |
|---|---|
| `dist/scripts/setDomainAdmin.cjs <email> <domainId>` | Admin of one domain. |
| `dist/scripts/setAdminOnAll.cjs <email>` | Admin of every domain, organization, community and group. Hangs instead of exiting if the email is not found; Ctrl-C it. |
| `dist/scripts/cloning/setAdminsFromURL.js <actingUserId> <csvUrl> <urlPrefix>` | Bulk community and group admins from a `communityId,email` CSV fetched over HTTP. The acting user must already be an admin of each community. |

There is no script for a single community or group admin.

## Logging in

Use the login link in the site header, then go to `/admin/domain/<domainId>`.

## Expected noise

These lines are normal and can be ignored: `DeprecationWarning: String based
operators are deprecated`, and the BullMQ `Eviction policy is volatile-lru`
warning on clusters whose Redis parameter group has not been set to
`noeviction`.
