-- Store guardian approval tokens only as hashes so a minor's profile cannot
-- disclose a usable parental approval link.
begin;

alter table public.profiles
  add column if not exists guardian_token_hash_version boolean not null default false;

update public.profiles
set guardian_token = encode(extensions.digest(convert_to(guardian_token, 'UTF8'), 'sha256'), 'hex'),
    guardian_token_hash_version = true
where guardian_token is not null
  and guardian_token_hash_version = false;

commit;
