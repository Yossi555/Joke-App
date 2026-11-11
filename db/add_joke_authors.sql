alter table public.jokes
  add column user_id uuid references auth.users (id) on delete set null,
  add column author_name text,
  add constraint jokes_author_name_check
    check (author_name is null or char_length(btrim(author_name)) between 1 and 30);

create index jokes_user_id_idx on public.jokes (user_id);
