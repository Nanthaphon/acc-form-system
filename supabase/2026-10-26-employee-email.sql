-- Each employee's real mailbox, for "a document is waiting for your signature"
-- notices (supabase/functions/notify-signers). Not the login: logins stay
-- <employeeId>@globe.local, so a wrong address here locks nobody out.
--
-- Same row rules as the rest of the profile: a person reads and edits their
-- own, an admin everyone's. Run once in the Supabase SQL Editor; the app works
-- before and after it.

alter table profiles add column if not exists email text;

notify pgrst, 'reload schema';
