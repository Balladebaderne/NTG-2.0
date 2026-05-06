# NTG Login Context

The login context authenticates operational users and issues signed tokens that can later be accepted by the API gateway and protected API endpoints.

## Language

**Login Domain**:
The bounded area responsible for validating user credentials and issuing authentication tokens.
_Avoid_: Auth UI, gateway login

**User**:
A person who can authenticate with an email, password, and operational role.
_Avoid_: Account

**Role**:
The operational access category assigned to a user.
_Avoid_: Permission group

**JWT**:
A signed authentication token issued by the **Login Domain** after a successful login.
_Avoid_: Demo token, session id

**Login User File**:
A JSON file owned by the **Login Domain** that contains the users accepted by `POST /auth/login`.
_Avoid_: Frontend login data

## Relationships

- A **User** has exactly one **Role**
- The **Login User File** contains the current **Users** for the login domain
- The **Login Domain** issues one **JWT** for a successful login
- The API gateway forwards `POST /auth/login` to the **Login Domain**
- The future API gateway will verify the **JWT** before allowing access to protected endpoints

## Example dialogue

> **Dev:** "Should the frontend create the token when a Driver signs in?"
> **Domain expert:** "No. The Login Domain validates the Driver's credentials and returns the JWT."

## Flagged ambiguities

- Python `app.py` service files were accidental scaffolding; the intended service stack is React, Node.js, and Express.
- Credentials are checked against the login service JSON user file.
