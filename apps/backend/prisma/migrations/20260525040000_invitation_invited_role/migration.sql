-- Invitation now carries the Role that will be granted to the User
-- created on accept. Defaults to `user` to preserve the previous
-- hard-coded behaviour for all in-flight invitations.

ALTER TABLE "invitations" ADD COLUMN "invited_role" "Role" NOT NULL DEFAULT 'user';
